import Storage from 'expo-sqlite/kv-store';

import type { AsyncKeyValueStorage } from './secureStorage';

/**
 * Non-secret key-value persistence backed by SQLite (expo-sqlite/kv-store).
 * Used for the offline query cache and preferences. Never store tokens here.
 */
export const kvStorage: AsyncKeyValueStorage = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: async (key) => {
    await Storage.removeItem(key);
  },
};
