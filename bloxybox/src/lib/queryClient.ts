import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { AppState, type AppStateStatus } from 'react-native';

import { toAppError } from '@/api/errors';

import { kvStorage } from './kvStorage';

const DAY = 24 * 60 * 60 * 1000;

function shouldRetry(failureCount: number, error: unknown): boolean {
  const code = toAppError(error).code;
  // Business-rule errors will not succeed on retry.
  if (code !== 'NETWORK' && code !== 'UNKNOWN') return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: DAY,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
      networkMode: 'always',
    },
  },
});

/** Read-only offline cache of server data (never used to authorise anything). */
export const queryPersister = createAsyncStoragePersister({
  storage: kvStorage,
  key: 'bloxybox.query-cache.v1',
  throttleTime: 2000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: queryPersister,
  maxAge: 7 * DAY,
  buster: Constants.expoConfig?.version ?? '1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && query.meta?.persist !== false && query.queryKey[0] !== 'dev',
  },
};

let wired = false;

/** Connects TanStack Query to NetInfo (online state) and AppState (refetch on focus). */
export function wireQueryEnvironment(): void {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }),
  );

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      handleFocus(status === 'active');
    });
    return () => subscription.remove();
  });
}

/** Removes everything cached for the signed-in player (used on sign-out and account switch). */
export async function clearUserCache(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
}
