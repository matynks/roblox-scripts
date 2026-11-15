// Maintenance commands:
//   node src/cli.js migrate                    apply pending migrations (with automatic backup)
//   node src/cli.js reset-admin [newPassword]  reset the owner password and clear its lockout/2-step
import crypto from 'node:crypto';
import fs from 'node:fs';
import { loadConfig } from './config.js';
import { Db } from './db.js';
import { migrate } from './migrate.js';
import { hashPassword, passwordProblem } from './security.js';

const [cmd, arg] = process.argv.slice(2);
const cfg = loadConfig();
fs.mkdirSync(cfg.dataDir, { recursive: true });
const db = new Db(cfg.dbFile);
const log = (...a) => console.log('[larpverse]', ...a);

if (cmd === 'migrate') {
  const applied = migrate(db, { migrationsDir: cfg.migrationsDir, backupsDir: cfg.backupsDir, log });
  log(applied.length ? `applied ${applied.length} migration(s)` : 'database is up to date');
} else if (cmd === 'reset-admin') {
  migrate(db, { migrationsDir: cfg.migrationsDir, backupsDir: cfg.backupsDir, log });
  const owner = db.get("SELECT id, username FROM users WHERE staff_role = 'owner' ORDER BY id LIMIT 1");
  if (!owner) {
    log('no owner login exists yet — start the server once to create it');
    process.exit(1);
  }
  const password = arg ?? `Lv-${crypto.randomBytes(9).toString('base64url')}7`;
  const problem = passwordProblem(password);
  if (problem) { log(problem); process.exit(1); }
  const hash = await hashPassword(password);
  db.tx(() => {
    db.run('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, mfa_enabled = 0, mfa_secret = NULL, password_changed_at = ? WHERE id = ?', hash, Date.now(), owner.id);
    db.run('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', Date.now(), owner.id);
    db.run("INSERT INTO audit_logs (user_id, action, target_type, target_id, details, created_at) VALUES (?, 'security.owner_reset_cli', 'user', ?, '{}', ?)", owner.id, owner.id, Date.now());
  });
  log(`owner "${owner.username}" password reset to: ${password}`);
} else {
  console.log('usage: node src/cli.js migrate | reset-admin [newPassword]');
  process.exitCode = 1;
}
db.close();
