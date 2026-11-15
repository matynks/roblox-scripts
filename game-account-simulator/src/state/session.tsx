import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { backend, type SessionInfo } from '@/api';
import { toAppError } from '@/api/errors';
import { toast } from '@/ui/Toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, e) => {
        const err = toAppError(e);
        if (['NOT_AUTHENTICATED', 'FORBIDDEN', 'ACCOUNT_SUSPENDED', 'USER_NOT_FOUND', 'USER_UNAVAILABLE', 'PRIVATE_LIST'].includes(err.code)) return false;
        return count < 3;
      },
      retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 8000),
      staleTime: 20_000,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

// Pause/resume queries with connectivity and refetch when the app returns to the foreground.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)));
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
}

interface SessionState {
  ready: boolean;
  session: SessionInfo | null;
  /** set when a password-recovery link/code signed the user in: they must choose a new password */
  recovering: boolean;
  setRecovering: (v: boolean) => void;
}

const Ctx = createContext<SessionState>({ ready: false, session: null, recovering: false, setRecovering: () => undefined });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let alive = true;
    backend
      .getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession(null))
      .finally(() => alive && setReady(true));
    const off = backend.onAuthChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT' || event === 'SESSION_EXPIRED') {
        queryClient.clear();
        setRecovering(false);
        if (event === 'SESSION_EXPIRED') toast.info('Session expired', 'Please sign in again.');
      }
      setSession(s);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Keep presence fresh while the app is open.
  useEffect(() => {
    if (!session) return;
    backend.touchPresence();
    const h = setInterval(() => backend.touchPresence(), 120_000);
    return () => clearInterval(h);
  }, [session]);

  return <Ctx.Provider value={{ ready, session, recovering, setRecovering }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
