import { requireOnline, rpc } from '@/api/client';
import { AppError, toAppError } from '@/api/errors';
import { clearUserCache } from '@/lib/queryClient';
import { getSupabase } from '@/lib/supabase';

import { normaliseUsername } from './validation';

export async function signIn(email: string, password: string): Promise<void> {
  requireOnline();
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAppError(error);
}

export type SignUpOutcome = { status: 'signed-in' } | { status: 'confirm-email'; email: string };

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}): Promise<SignUpOutcome> {
  requireOnline();
  const username = normaliseUsername(input.username);

  const available = await rpc<boolean>('is_username_available', { p_username: username });
  if (!available) throw new AppError('USERNAME_TAKEN');

  const { data, error } = await getSupabase().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { username, display_name: input.displayName.trim() } },
  });
  if (error) throw toAppError(error);

  // Supabase returns a user with no identities when the email is already registered
  // (and email confirmation is on), instead of an explicit error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new AppError('EMAIL_TAKEN');
  }

  if (data.session) return { status: 'signed-in' };
  return { status: 'confirm-email', email: input.email.trim() };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  return rpc<boolean>('is_username_available', { p_username: normaliseUsername(username) });
}

/** Signs out everywhere when online; when offline, at least clears this device. */
export async function signOut(): Promise<void> {
  const auth = getSupabase().auth;
  const { error } = await auth.signOut();
  if (error) {
    await auth.signOut({ scope: 'local' });
  }
  await clearUserCache();
}
