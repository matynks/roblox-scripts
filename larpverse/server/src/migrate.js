import fs from 'node:fs';
import path from 'node:path';

/**
 * Applies pending SQL migrations in filename order. Each migration runs in its own
 * transaction and is recorded in schema_migrations. When an existing database with data has
 * pending migrations, a consistent copy is written to backupsDir first (VACUUM INTO).
 */
export function migrate(db, { migrationsDir, backupsDir, log = () => {} }) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    applied_at INTEGER NOT NULL
  )`);
  const applied = new Set(db.all('SELECT version FROM schema_migrations').map(r => r.version));
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d+_.+\.sql$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const pending = files.filter(f => !applied.has(parseInt(f, 10)));
  if (pending.length === 0) return [];

  if (applied.size > 0 && db.file !== ':memory:' && backupsDir) {
    fs.mkdirSync(backupsDir, { recursive: true });
    const target = path.join(backupsDir, `larpverse-${Date.now()}-before-${parseInt(pending[0], 10)}.db`);
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    log(`database backup written to ${target}`);
  }

  for (const file of pending) {
    const version = parseInt(file, 10);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.tx(() => {
      db.exec(sql);
      db.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', version, file, Date.now());
    });
    log(`applied migration ${file}`);
  }
  return pending;
}
