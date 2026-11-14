import 'react-native-url-polyfill/auto';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import type { BackendConfig } from './config';
import { secureSessionStorage } from './secureStorage';

let client: SupabaseClient | null = null;
let clientIdentity = '';
let appStateSubscription: { remove(): void } | null = null;

/** Creates (or reuses) the Supabase client for the given backend. */
export function initSupabase(config: BackendConfig): SupabaseClient {
  const identity = `${config.url}|${config.anonKey}`;
  if (client && clientIdentity === identity) {
    return client;
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
    global: {
      headers: { 'x-client-info': 'bloxybox-android' },
    },
  });
  clientIdentity = identity;

  // Only refresh tokens while the app is in the foreground.
  appStateSubscription?.remove();
  const current = client;
  const onChange = (state: AppStateStatus) => {
    if (state === 'active') {
      void current.auth.startAutoRefresh();
    } else {
      void current.auth.stopAutoRefresh();
    }
  };
  appStateSubscription = AppState.addEventListener('change', onChange);
  if (AppState.currentState === 'active') {
    void current.auth.startAutoRefresh();
  }

  return client;
}

export function hasSupabase(): boolean {
  return client !== null;
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error('BloxyBox is not connected to a server yet.');
  }
  return client;
}
