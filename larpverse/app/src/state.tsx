import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, getToken, onUnauthorized, setToken } from './api';
import type { Me } from './types';

// ───────────── Toasts ─────────────

export type Toast = { id: number; title: string; body?: string; kind?: 'info' | 'success' | 'error' | 'notification'; to?: string };
const ToastCtx = createContext<{ toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void }>(null as any);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = seq.current++;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.kind === 'notification' ? 5200 : 3600);
  }, [dismiss]);
  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

export const useToast = () => useContext(ToastCtx);

export function useErrorToast() {
  const { push } = useToast();
  return useCallback((e: unknown) => {
    const err = e as ApiError;
    push({ kind: 'error', title: err?.message ?? 'Something went wrong' });
  }, [push]);
}

// ───────────── Session ─────────────

type SessionValue = {
  me: Me | null;
  status: 'loading' | 'anon' | 'ready' | 'offline';
  error: ApiError | null;
  signIn: (token: string, me: Me) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<Me | null>;
  setMe: (me: Me) => void;
  switchAccount: (id: number) => Promise<void>;
  can: (perm: string) => boolean;
  isStaff: boolean;
};

const SessionCtx = createContext<SessionValue>(null as any);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<SessionValue['status']>(getToken() ? 'loading' : 'anon');
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) { setStatus('anon'); setMe(null); return null; }
    try {
      const m = await api.get<Me>('/api/me');
      setMe(m);
      setStatus('ready');
      setError(null);
      return m;
    } catch (e: any) {
      if (e?.status === 401) { setToken(null); setMe(null); setStatus('anon'); return null; }
      setError(e);
      setStatus((s) => (s === 'ready' ? 'ready' : 'offline'));
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => onUnauthorized(() => { setToken(null); setMe(null); setStatus('anon'); qc.clear(); }), [qc]);

  const signIn = useCallback((token: string, m: Me) => {
    setToken(token);
    qc.clear();
    setMe(m);
    setStatus('ready');
  }, [qc]);

  const signOut = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    setToken(null);
    setMe(null);
    setStatus('anon');
    qc.clear();
  }, [qc]);

  const switchAccount = useCallback(async (id: number) => {
    const m = await api.post<Me>('/api/me/switch', { accountId: id });
    setMe(m);
    qc.invalidateQueries();
  }, [qc]);

  const value = useMemo<SessionValue>(() => ({
    me, status, error, signIn, signOut, refresh, setMe, switchAccount,
    can: (p) => Boolean(me?.user.permissions.includes(p)),
    isStaff: Boolean(me?.user.permissions.includes('admin.access')),
  }), [me, status, error, signIn, signOut, refresh, switchAccount]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
export const useMe = () => useContext(SessionCtx).me as Me;

// ───────────── Cinematic (recording) mode ─────────────

type CinematicValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  directorHidden: boolean;
  setDirectorHidden: (v: boolean) => void;
  options: { hideStatusBar: boolean; largeText: boolean; fastNotifications: boolean };
  setOption: (k: keyof CinematicValue['options'], v: boolean) => void;
};

const CinematicCtx = createContext<CinematicValue>(null as any);
const CINE_KEY = 'lv.cinematic';

function loadCine() {
  try { return JSON.parse(localStorage.getItem(CINE_KEY) ?? '{}'); } catch { return {}; }
}

export function CinematicProvider({ children }: { children: ReactNode }) {
  const saved = loadCine();
  const [enabled, setEnabledState] = useState<boolean>(Boolean(saved.enabled));
  const [panelOpen, setPanelOpen] = useState(false);
  const [directorHidden, setDirectorHidden] = useState(false);
  const [options, setOptions] = useState({ hideStatusBar: true, largeText: false, fastNotifications: true, ...(saved.options ?? {}) });
  useEffect(() => {
    try { localStorage.setItem(CINE_KEY, JSON.stringify({ enabled, options })); } catch { /* ignore */ }
    document.documentElement.classList.toggle('cinematic', enabled);
    document.documentElement.classList.toggle('cinematic-large', enabled && options.largeText);
    const sb = (window as any).Capacitor?.Plugins?.StatusBar;
    if (sb) { try { enabled && options.hideStatusBar ? sb.hide() : sb.show(); } catch { /* not native */ } }
  }, [enabled, options]);
  const value = useMemo<CinematicValue>(() => ({
    enabled,
    setEnabled: (v) => { setEnabledState(v); if (!v) setPanelOpen(false); setDirectorHidden(false); },
    panelOpen, setPanelOpen, directorHidden, setDirectorHidden, options,
    setOption: (k, v) => setOptions((o: any) => ({ ...o, [k]: v })),
  }), [enabled, panelOpen, directorHidden, options]);
  return <CinematicCtx.Provider value={value}>{children}</CinematicCtx.Provider>;
}

export const useCinematic = () => useContext(CinematicCtx);

// ───────────── Notification watcher ─────────────

/** Polls the unread count while the app is visible and pops a banner for new notifications. */
export function NotificationWatcher() {
  const { me, setMe, status } = useSession();
  const { push } = useToast();
  const { enabled: cine, options } = useCinematic();
  const qc = useQueryClient();
  const last = useRef<number | null>(null);
  const meRef = useRef(me);
  meRef.current = me;
  const accountId = me?.account.id;
  useEffect(() => { last.current = null; }, [accountId]);
  useEffect(() => {
    if (status !== 'ready') return;
    let timer: any;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const r = await api.get<{ unread: number; latest: any }>('/api/notifications/unread-count');
          if (last.current != null && r.latest && r.latest.id > last.current) {
            push({ kind: 'notification', title: r.latest.title, body: r.latest.body, to: '/notifications' });
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['home'] });
            qc.invalidateQueries({ queryKey: ['wallet'] });
            api.get('/api/me').then(setMe).catch(() => {});
          }
          if (r.latest) last.current = Math.max(last.current ?? 0, r.latest.id);
          else if (last.current == null) last.current = 0;
          const cur = meRef.current;
          if (cur && r.unread !== cur.unreadNotifications) setMe({ ...cur, unreadNotifications: r.unread });
        } catch { /* offline: try later */ }
      }
      if (!stopped) timer = setTimeout(tick, cine && options.fastNotifications ? 2500 : 15000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [status, accountId, cine, options.fastNotifications, push, qc, setMe]);
  return null;
}
