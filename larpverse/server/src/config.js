import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');

export function loadConfig(overrides = {}) {
  const env = process.env;
  const dataDir = overrides.dataDir ?? env.LARPVERSE_DATA_DIR ?? path.join(serverRoot, 'data');
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    dataDir,
    dbFile: env.LARPVERSE_DB_FILE ?? path.join(dataDir, 'larpverse.db'),
    uploadsDir: path.join(dataDir, 'uploads'),
    backupsDir: path.join(dataDir, 'backups'),
    migrationsDir: path.join(serverRoot, 'migrations'),
    staticDir: env.LARPVERSE_STATIC_DIR ?? path.resolve(serverRoot, '../app/dist'),
    ownerUsername: env.LARPVERSE_OWNER_USERNAME ?? 'owner',
    ownerPassword: env.LARPVERSE_OWNER_PASSWORD ?? null,
    seedDemo: (env.LARPVERSE_SEED ?? '1') !== '0',
    trustProxy: env.LARPVERSE_TRUST_PROXY === '1',
    sessionTtlMs: 30 * 24 * 3600 * 1000,
    elevationTtlMs: 20 * 60 * 1000,
    rateLimits: env.LARPVERSE_DISABLE_RATE_LIMIT === '1' ? null : {
      api: { limit: 900, windowMs: 60_000 },
      auth: { limit: 20, windowMs: 60_000 },
      write: { limit: 240, windowMs: 60_000 },
    },
    logRequests: env.LARPVERSE_LOG === '1',
    gameTickMs: 50,
    gameBroadcastMs: 100,
    ...overrides,
  };
}
