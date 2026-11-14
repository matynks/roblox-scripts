/// <reference types="node" />
import { AppError, toAppError } from '@/api/errors';
import { validateBackendConfig } from '@/lib/config';
import { formatCompact, formatCountdown, formatNumber, formatRelative, formatSigned } from '@/lib/format';
import { CHUNK_SIZE, createChunkedSecureStorage, type SecureStoreLike } from '@/lib/secureStorage';

function memoryStore(): SecureStoreLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (k) => map.get(k) ?? null,
    setItemAsync: async (k, v) => {
      map.set(k, v);
    },
    deleteItemAsync: async (k) => {
      map.delete(k);
    },
  };
}

describe('format', () => {
  it('groups thousands', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-4200)).toBe('-4,200');
    expect(formatNumber(Number.NaN)).toBe('0');
  });

  it('compacts large numbers but keeps small ones exact', () => {
    expect(formatCompact(9999)).toBe('9,999');
    expect(formatCompact(12_345)).toBe('12.3K');
    expect(formatCompact(3_400_000)).toBe('3.4M');
    expect(formatCompact(250_000_000)).toBe('250M');
  });

  it('signs ledger amounts', () => {
    expect(formatSigned(250)).toBe('+250');
    expect(formatSigned(-80)).toBe('-80');
  });

  it('formats relative times and countdowns', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(formatRelative('2026-11-14T11:59:50Z', now)).toBe('just now');
    expect(formatRelative('2026-11-14T11:30:00Z', now)).toBe('30m ago');
    expect(formatRelative('2026-11-14T07:00:00Z', now)).toBe('5h ago');
    expect(formatCountdown(0)).toBe('now');
    expect(formatCountdown(65_000)).toBe('1m 05s');
    expect(formatCountdown(3 * 3600_000 + 7 * 60_000)).toBe('3h 07m');
  });
});

describe('error mapping', () => {
  it('maps server codes from RPC messages', () => {
    const e = toAppError({ message: 'INSUFFICIENT_FUNDS', code: 'P0001', details: '{"balance":10,"required":80}' });
    expect(e.code).toBe('INSUFFICIENT_FUNDS');
    expect(e.detail).toEqual({ balance: 10, required: 80 });
    expect(e.message).toMatch(/enough BoxCoins/);
  });

  it('maps auth, permission and network failures', () => {
    expect(toAppError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).code).toBe('INVALID_CREDENTIALS');
    expect(toAppError({ message: 'permission denied for table wallets', code: '42501' }).code).toBe('FORBIDDEN');
    expect(toAppError(new TypeError('Network request failed')).code).toBe('NETWORK');
    expect(toAppError({ message: 'something odd' }).code).toBe('UNKNOWN');
  });

  it('passes AppError through unchanged', () => {
    const original = new AppError('ALREADY_OWNED');
    expect(toAppError(original)).toBe(original);
  });
});

describe('backend config validation', () => {
  const jwt = (payload: object) =>
    ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'c2lnbmF0dXJl'].join('.');

  it('accepts an https URL with an anon key', () => {
    expect(validateBackendConfig('https://abc.supabase.co', jwt({ role: 'anon' }))).toBeNull();
    expect(validateBackendConfig('https://abc.supabase.co/', 'sb_publishable_abcdefghijklmnop')).toBeNull();
  });

  it('allows plain http only for local/private hosts', () => {
    expect(validateBackendConfig('http://192.168.1.20:54321', jwt({ role: 'anon' }))).toBeNull();
    expect(validateBackendConfig('http://example.com', jwt({ role: 'anon' }))).toMatch(/https/);
  });

  it('refuses secret keys', () => {
    expect(validateBackendConfig('https://abc.supabase.co', jwt({ role: 'service_role' }))).toMatch(/service_role/);
    expect(validateBackendConfig('https://abc.supabase.co', 'sb_secret_abcdefghijklmnop')).toMatch(/secret/);
  });

  it('rejects malformed input', () => {
    expect(validateBackendConfig('not a url', jwt({ role: 'anon' }))).toMatch(/valid URL/);
    expect(validateBackendConfig('https://abc.supabase.co', 'hello')).toMatch(/does not look/);
  });
});

describe('chunked secure storage', () => {
  it('round-trips values larger than one chunk', async () => {
    const store = memoryStore();
    const storage = createChunkedSecureStorage(store);
    const value = 'x'.repeat(CHUNK_SIZE * 2 + 17);
    await storage.setItem('sb-ref-auth-token', value);
    expect(store.map.get('sb-ref-auth-token.n')).toBe('3');
    expect(await storage.getItem('sb-ref-auth-token')).toBe(value);
  });

  it('removes stale chunks when a value shrinks and on delete', async () => {
    const store = memoryStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem('k', 'y'.repeat(CHUNK_SIZE * 3));
    await storage.setItem('k', 'short');
    expect(store.map.has('k.1')).toBe(false);
    expect(await storage.getItem('k')).toBe('short');
    await storage.removeItem('k');
    expect([...store.map.keys()]).toEqual([]);
    expect(await storage.getItem('k')).toBeNull();
  });

  it('treats partially written values as missing', async () => {
    const store = memoryStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem('k', 'z'.repeat(CHUNK_SIZE + 5));
    store.map.delete('k.1');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('sanitises keys SecureStore would reject', async () => {
    const store = memoryStore();
    const storage = createChunkedSecureStorage(store);
    await storage.setItem('a key/with:chars', 'v');
    expect(store.map.has('a_key_with_chars.0')).toBe(true);
  });
});
