// API client shared by every screen. Works in three setups:
//  • browser served by the Larpverse server (same origin, base '')
//  • Vite dev server (proxy to :8787, base '')
//  • Android app (Capacitor): base is the server URL the user entered on first launch.

const TOKEN_KEY = 'lv.token';
const SERVER_KEY = 'lv.server';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
}

export const isNative = (): boolean => Boolean((window as any).Capacitor?.isNativePlatform?.());

export function getServer(): string {
  const stored = safeGet(SERVER_KEY);
  if (stored) return stored.replace(/\/+$/, '');
  return '';
}

export function setServer(url: string | null) {
  safeSet(SERVER_KEY, url ? url.replace(/\/+$/, '') : null);
}

/** In the Android app a server must be configured before anything else. */
export const needsServer = (): boolean => isNative() && !safeGet(SERVER_KEY);

export const getToken = () => safeGet(TOKEN_KEY);
export const setToken = (t: string | null) => safeSet(TOKEN_KEY, t);

export class ApiError extends Error {
  status: number;
  code: string;
  details: any;
  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => { unauthorizedListeners.delete(fn); };
}

export async function request<T = any>(method: string, path: string, body?: unknown, opts: { timeoutMs?: number } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  let res: Response;
  try {
    res = await fetch(getServer() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
  } catch (e: any) {
    throw new ApiError(0, 'network', e?.name === 'AbortError' ? 'The server took too long to answer' : 'Can’t reach the Larpverse server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>('GET', p),
  post: <T = any>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  patch: <T = any>(p: string, b: unknown = {}) => request<T>('PATCH', p, b),
  put: <T = any>(p: string, b: unknown = {}) => request<T>('PUT', p, b),
  del: <T = any>(p: string) => request<T>('DELETE', p),
};

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return getServer() + path;
}

export async function checkServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/api/health');
    const j = await res.json();
    return j?.name === 'Larpverse';
  } catch {
    return false;
  }
}

/**
 * Server-sent events over fetch (so the bearer token can go in a header). Reconnects with
 * backoff until closed or until the server says the stream is over.
 */
export function openStream(path: string, onMessage: (msg: any) => void, onState?: (s: 'connecting' | 'open' | 'retrying' | 'closed', err?: ApiError) => void) {
  let closed = false;
  let controller: AbortController | null = null;
  let attempt = 0;
  const run = async () => {
    while (!closed) {
      controller = new AbortController();
      onState?.(attempt ? 'retrying' : 'connecting');
      try {
        const res = await fetch(getServer() + path, { headers: { Authorization: `Bearer ${getToken() ?? ''}` }, signal: controller.signal });
        if (!res.ok || !res.body) {
          let data: any = null;
          try { data = await res.json(); } catch { /* ignore */ }
          const err = new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Stream failed');
          if (res.status >= 400 && res.status < 500) { onState?.('closed', err); closed = true; return; }
          throw err;
        }
        attempt = 0;
        onState?.('open');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const data = block.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
            if (!data) continue;
            try {
              const msg = JSON.parse(data);
              onMessage(msg);
              if (msg.type === 'ended' || msg.type === 'kicked' || msg.type === 'left') { closed = true; }
            } catch { /* ignore malformed */ }
          }
        }
      } catch (e) {
        if (closed) break;
      }
      if (closed) break;
      attempt++;
      await new Promise((r) => setTimeout(r, Math.min(8000, 500 * 2 ** Math.min(attempt, 4))));
    }
    onState?.('closed');
  };
  run();
  return () => { closed = true; controller?.abort(); };
}
