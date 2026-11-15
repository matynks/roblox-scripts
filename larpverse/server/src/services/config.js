import { app } from '../app.js';
import { now, parseJson, toJson } from '../util.js';

export const CONFIG_DEFAULTS = {
  economy: {
    startingBalance: 500,
    dailyReward: 25,
    dailyCooldownHours: 20,
    sessionCompletionReward: 50,
    groupCreateCost: 100,
    usernameChangeCost: 1000,
    creatorShare: 0.7,
    refundWindowMinutes: 60,
    maxAltAccounts: 3,
  },
  platform: {
    name: 'Larpverse',
    currencyName: 'Sparks',
    currencySymbol: '✦',
    motd: '',
  },
};

export function getConfig(key) {
  const row = app.db.get('SELECT value FROM system_config WHERE key = ?', key);
  return { ...CONFIG_DEFAULTS[key], ...parseJson(row?.value, {}) };
}

export function setConfig(key, value) {
  const merged = { ...getConfig(key), ...value };
  app.db.run(
    `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key, toJson(merged), now(),
  );
  return merged;
}

export function getFlag(key) {
  return app.db.value('SELECT value FROM system_config WHERE key = ?', key);
}

export function setFlag(key, value) {
  app.db.run(
    `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key, String(value), now(),
  );
}
