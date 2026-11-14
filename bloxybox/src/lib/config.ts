import * as SecureStore from 'expo-secure-store';

export type BackendConfig = {
  url: string;
  anonKey: string;
  source: 'build' | 'device';
};

const RUNTIME_CONFIG_KEY = 'bloxybox.backend-config';

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]{10,}$/;
const PRIVATE_HOST_PATTERN = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    if (typeof globalThis.atob !== 'function') return null;
    return globalThis.atob(padded);
  } catch {
    return null;
  }
}

/**
 * Validates a Supabase URL + public key pair. Returns an error message, or null when valid.
 * Refuses secret keys: only the public anon/publishable key may ever be stored in the app.
 */
export function validateBackendConfig(rawUrl: string, rawKey: string): string | null {
  const url = rawUrl.trim();
  const key = rawKey.trim();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Enter a valid URL, for example https://abcd1234.supabase.co';
  }

  const host = parsed.hostname;
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && PRIVATE_HOST_PATTERN.test(host))) {
    return 'The server URL must start with https://';
  }

  if (key.startsWith('sb_secret_')) {
    return 'That is a secret key. Use the public anon (publishable) key instead.';
  }

  if (JWT_PATTERN.test(key)) {
    const payload = decodeBase64Url(key.split('.')[1] ?? '');
    if (payload) {
      try {
        const claims = JSON.parse(payload) as { role?: string };
        if (claims.role === 'service_role') {
          return 'That is the service_role key, which must never be put in an app. Use the anon key.';
        }
      } catch {
        // Not JSON: fall through to the generic format check.
      }
    }
    return null;
  }

  if (PUBLISHABLE_KEY_PATTERN.test(key)) {
    return null;
  }

  return 'That does not look like a Supabase anon or publishable key.';
}

export function normaliseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Values baked in at build time from EXPO_PUBLIC_* environment variables. */
export function getBuildConfig(): BackendConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anonKey || validateBackendConfig(url, anonKey) !== null) {
    return null;
  }
  return { url: normaliseUrl(url), anonKey: anonKey.trim(), source: 'build' };
}

export async function loadDeviceConfig(): Promise<BackendConfig | null> {
  try {
    const raw = await SecureStore.getItemAsync(RUNTIME_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: string; anonKey?: string };
    if (!parsed.url || !parsed.anonKey || validateBackendConfig(parsed.url, parsed.anonKey) !== null) {
      return null;
    }
    return { url: parsed.url, anonKey: parsed.anonKey, source: 'device' };
  } catch {
    return null;
  }
}

export async function saveDeviceConfig(url: string, anonKey: string): Promise<BackendConfig> {
  const error = validateBackendConfig(url, anonKey);
  if (error) throw new Error(error);
  const config: BackendConfig = { url: normaliseUrl(url), anonKey: anonKey.trim(), source: 'device' };
  await SecureStore.setItemAsync(RUNTIME_CONFIG_KEY, JSON.stringify({ url: config.url, anonKey: config.anonKey }));
  return config;
}

export async function clearDeviceConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(RUNTIME_CONFIG_KEY);
}

/** Build-time config wins; otherwise whatever the user entered on the setup screen. */
export async function resolveBackendConfig(): Promise<BackendConfig | null> {
  return getBuildConfig() ?? (await loadDeviceConfig());
}

export function describeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
