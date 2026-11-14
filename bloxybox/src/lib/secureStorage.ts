import * as SecureStore from 'expo-secure-store';

/**
 * Supabase auth storage backed by expo-secure-store (Android Keystore encryption).
 *
 * SecureStore discourages values above ~2 KB, and a Supabase session JSON is
 * usually larger, so values are split into chunks:
 *   <key>.n      -> number of chunks
 *   <key>.<i>    -> chunk i
 */
export const CHUNK_SIZE = 1800;

export type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

function sanitiseKey(key: string): string {
  // SecureStore keys may only contain alphanumerics, '.', '-' and '_'.
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function createChunkedSecureStorage(store: SecureStoreLike = SecureStore): AsyncKeyValueStorage {
  async function readCount(base: string): Promise<number> {
    const raw = await store.getItemAsync(`${base}.n`);
    const count = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  async function removeChunks(base: string, from: number, to: number): Promise<void> {
    const deletions: Promise<void>[] = [];
    for (let i = from; i < to; i += 1) {
      deletions.push(store.deleteItemAsync(`${base}.${i}`));
    }
    await Promise.all(deletions);
  }

  return {
    async getItem(key) {
      const base = sanitiseKey(key);
      const count = await readCount(base);
      if (count === 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) => store.getItemAsync(`${base}.${i}`)),
      );
      if (parts.some((part) => part === null)) {
        // Partially written value: treat as missing rather than returning corrupt JSON.
        return null;
      }
      return parts.join('');
    },

    async setItem(key, value) {
      const base = sanitiseKey(key);
      const previousCount = await readCount(base);
      const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));

      for (let i = 0; i < count; i += 1) {
        await store.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
      await store.setItemAsync(`${base}.n`, String(count));

      if (previousCount > count) {
        await removeChunks(base, count, previousCount);
      }
    },

    async removeItem(key) {
      const base = sanitiseKey(key);
      const count = await readCount(base);
      await store.deleteItemAsync(`${base}.n`);
      await removeChunks(base, 0, count);
    },
  };
}

export const secureSessionStorage = createChunkedSecureStorage();
