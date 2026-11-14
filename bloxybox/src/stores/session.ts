import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { BackendConfig } from '@/lib/config';

export type BootStatus = 'booting' | 'needs-setup' | 'ready';

type SessionState = {
  boot: BootStatus;
  backend: BackendConfig | null;
  session: Session | null;
  /** True once the persisted session has been read from secure storage. */
  sessionRestored: boolean;
  setBoot: (boot: BootStatus, backend?: BackendConfig | null) => void;
  setSession: (session: Session | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  boot: 'booting',
  backend: null,
  session: null,
  sessionRestored: false,
  setBoot: (boot, backend) => set((state) => ({ boot, backend: backend === undefined ? state.backend : backend })),
  setSession: (session) => set({ session, sessionRestored: true }),
}));

/** The signed-in user's id. Only call inside the signed-in part of the app. */
export function useUserId(): string {
  const id = useSessionStore((s) => s.session?.user.id);
  if (!id) {
    throw new Error('useUserId called without a signed-in user');
  }
  return id;
}

export function getUserId(): string | null {
  return useSessionStore.getState().session?.user.id ?? null;
}
