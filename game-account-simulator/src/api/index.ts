import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { Backend } from './backend';
import { LocalBackend } from './localBackend';
import { SupabaseBackend } from './supabaseBackend';

export * from './backend';
export * from './errors';
export type * from './types';

/**
 * Chosen once at startup from build-time configuration. Players never see this:
 * without a configured server the app runs fully offline on the device.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const backend: Backend =
  url && anonKey
    ? new SupabaseBackend(url, anonKey)
    : new LocalBackend({
        store: AsyncStorage,
        uuid: () => Crypto.randomUUID(),
        sha256: (s) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s),
      });

export const isOnline = backend.mode === 'online';
