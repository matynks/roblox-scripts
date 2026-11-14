import * as SQLite from 'expo-sqlite';

/**
 * Local SQLite storage for practice-mode personal bests (offline play).
 * Practice runs never earn BoxCoins; this is purely a personal record on this device.
 */
let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  const opened = await SQLite.openDatabaseAsync('bloxybox.db');
  await opened.execAsync(
    `PRAGMA journal_mode = WAL;
     CREATE TABLE IF NOT EXISTS practice_best (
       slug TEXT PRIMARY KEY NOT NULL,
       best INTEGER NOT NULL,
       runs INTEGER NOT NULL DEFAULT 0,
       updated_at TEXT NOT NULL
     );`,
  );
  db = opened;
  return opened;
}

export async function getPracticeBest(slug: string): Promise<number> {
  try {
    const database = await getDb();
    const row = await database.getFirstAsync<{ best: number }>('SELECT best FROM practice_best WHERE slug = ?', slug);
    return row?.best ?? 0;
  } catch {
    return 0;
  }
}

/** Records a practice run and returns the (possibly new) personal best. */
export async function recordPracticeRun(slug: string, score: number): Promise<number> {
  try {
    const database = await getDb();
    await database.runAsync(
      `INSERT INTO practice_best (slug, best, runs, updated_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(slug) DO UPDATE SET best = MAX(best, excluded.best), runs = runs + 1, updated_at = excluded.updated_at`,
      slug,
      Math.max(0, Math.floor(score)),
      new Date().toISOString(),
    );
    return getPracticeBest(slug);
  } catch {
    return score;
  }
}
