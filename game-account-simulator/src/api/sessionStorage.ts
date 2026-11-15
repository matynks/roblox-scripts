import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth session storage.
 * Android/iOS: Expo SecureStore (Keystore/Keychain). SecureStore values should
 * stay small, so the session JSON is split into ≤1800-char chunks.
 * Web: localStorage via AsyncStorage.
 */
const CHUNK = 1800;
const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

const secureChunked = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}__n`);
    if (count === null) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${k}__${i}`);
      if (part === null) return null; // partial write: treat as signed out
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    const old = Number((await SecureStore.getItemAsync(`${k}__n`)) ?? 0);
    const n = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}__${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${k}__n`, String(n));
    for (let i = n; i < old; i++) await SecureStore.deleteItemAsync(`${k}__${i}`);
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const n = Number((await SecureStore.getItemAsync(`${k}__n`)) ?? 0);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}__${i}`);
    await SecureStore.deleteItemAsync(`${k}__n`);
  },
};

export const authStorage = Platform.OS === 'web' ? AsyncStorage : secureChunked;
