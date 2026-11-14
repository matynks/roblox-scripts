/* Jest setup: in-memory stand-ins for native storage modules. */

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const api = {
    getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => store.delete(key)),
  };
  return { __esModule: true, default: api, Storage: api, AsyncStorage: api };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    const rows = new Map<string, number>();
    return {
      execAsync: jest.fn(async () => undefined),
      runAsync: jest.fn(async (_sql: string, slug: string, score: number) => {
        rows.set(slug, Math.max(rows.get(slug) ?? 0, score));
      }),
      getFirstAsync: jest.fn(async (_sql: string, slug: string) => (rows.has(slug) ? { best: rows.get(slug) } : null)),
    };
  }),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

// Animation and gesture natives are not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // The official mock omits useFrameCallback; frame loops never run in unit tests.
  return { ...mock, useFrameCallback: () => ({ setActive: () => undefined, isActive: false, callbackId: -1 }) };
});
require('react-native-gesture-handler/jestSetup');
