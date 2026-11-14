import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { BackendConfig } from '@/lib/config';

export type BootStatus = 'booting' | 'needs-setup' | 'ready';

type SessionState = {
  boot: BootStatus;
  backend: BackendConfig | null;
  session: Session | null;
  /**
   * Id of the most recent signed-in user. Kept after sign-out so screens that are
   * still mounted for a frame while the navigator switches stacks don't crash.
   */
  lastUserId: string | null;
  /** True once the persisted session has been read from secure storage. */
  sessionRestored: boolean;
  setBoot: (boot: BootStatus, backend?: BackendConfig | null) => void;
  setSession: (session: Session | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  boot: 'booting',
  backend: null,
  session: null,
  lastUserId: null,
  sessionRestored: false,
  setBoot: (boot, backend) => set((state) => ({ boot, backend: backend === undefined ? state.backend : backend })),
  setSession: (session) =>
    set((state) => ({
      session,
      sessionRestored: true,
      lastUserId: session?.user.id ?? state.lastUserId,
    })),
}));

/**
 * The signed-in user's id. Only meaningful inside the signed-in part of the app;
 * during the sign-out transition it returns the previous user's id (queries made
 * then simply fail authorisation and are discarded with the cache).
 */
export function useUserId(): string {
  return useSessionStore((s) => s.session?.user.id ?? s.lastUserId ?? '');
}

export function getUserId(): string | null {
  return useSessionStore.getState().session?.user.id ?? null;
}
