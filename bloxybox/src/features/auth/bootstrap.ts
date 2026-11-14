import { useEffect } from 'react';

import { resolveBackendConfig, type BackendConfig } from '@/lib/config';
import { kvStorage } from '@/lib/kvStorage';
import { clearUserCache } from '@/lib/queryClient';
import { initSupabase } from '@/lib/supabase';
import { useSessionStore } from '@/stores/session';

const LAST_USER_KEY = 'bloxybox.last-user';

/** Clears cached data when a different player signs in on this device. */
async function guardUserSwitch(userId: string | null): Promise<void> {
  if (!userId) return;
  const last = await kvStorage.getItem(LAST_USER_KEY);
  if (last && last !== userId) {
    await clearUserCache();
  }
  if (last !== userId) {
    await kvStorage.setItem(LAST_USER_KEY, userId);
  }
}

let authSubscription: { unsubscribe(): void } | null = null;

/** Connects to a backend, restores the saved session and keeps the session store in sync. */
export async function connectBackend(config: BackendConfig): Promise<void> {
  const { setBoot, setSession } = useSessionStore.getState();
  const client = initSupabase(config);

  authSubscription?.unsubscribe();
  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      void clearUserCache();
    }
    void guardUserSwitch(session?.user.id ?? null);
    setSession(session);
  });
  authSubscription = data.subscription;

  // getSession reads secure storage only (no network), so this works offline.
  const { data: sessionData } = await client.auth.getSession();
  await guardUserSwitch(sessionData.session?.user.id ?? null);
  setSession(sessionData.session);
  setBoot('ready', config);
}

export function useBootstrap(): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await resolveBackendConfig();
      if (cancelled) return;
      if (!config) {
        useSessionStore.getState().setSession(null);
        useSessionStore.getState().setBoot('needs-setup', null);
        return;
      }
      await connectBackend(config);
    })().catch(() => {
      if (!cancelled) {
        useSessionStore.getState().setSession(null);
        useSessionStore.getState().setBoot('needs-setup', null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
}
