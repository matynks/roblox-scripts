import { app } from './app.js';
import { E } from './http.js';
import { hashToken, newToken } from './security.js';
import { permissionsFor } from './permissions.js';
import { now } from './util.js';

/** Resolves the bearer token (if any) into ctx.user / ctx.session / ctx.account / ctx.perms. */
export function authenticate(ctx) {
  const header = ctx.req.headers.authorization;
  let token = null;
  if (typeof header === 'string' && header.startsWith('Bearer ')) token = header.slice(7).trim();
  if (!token) return;
  const { db } = app;
  const t = now();
  const row = db.get(
    `SELECT s.id AS session_id, s.user_id, s.acting_account_id, s.expires_at, s.last_seen_at, s.elevated_until,
            u.id, u.username, u.staff_role, u.status, u.mfa_enabled
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    hashToken(token), t,
  );
  if (!row || row.status !== 'active') return;
  ctx.user = { id: row.id, username: row.username, staff_role: row.staff_role, status: row.status, mfa_enabled: row.mfa_enabled };
  ctx.session = { id: row.session_id, elevatedUntil: row.elevated_until ?? 0, actingAccountId: row.acting_account_id };
  ctx.perms = permissionsFor(db, ctx.user);

  let account = row.acting_account_id ? db.get('SELECT * FROM accounts WHERE id = ?', row.acting_account_id) : null;
  if (!account || !canActAs(ctx, account)) {
    account = db.get('SELECT * FROM accounts WHERE owner_user_id = ? AND is_primary = 1', row.id)
      ?? db.get('SELECT * FROM accounts WHERE owner_user_id = ? ORDER BY id LIMIT 1', row.id);
    if (account) db.run('UPDATE auth_sessions SET acting_account_id = ? WHERE id = ?', account.id, row.session_id);
  }
  ctx.account = account;

  // Sliding expiry and presence, written at most once a minute per session.
  if (t - row.last_seen_at > 60_000) {
    db.run('UPDATE auth_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?', t, t + app.cfg.sessionTtlMs, row.session_id);
    if (account) db.run('UPDATE accounts SET last_online_at = ? WHERE id = ?', t, account.id);
  }
}

/** Whether the signed-in operator may act as the given account. */
export function canActAs(ctx, account) {
  if (!ctx.user || !account) return false;
  if (account.owner_user_id === ctx.user.id) return true;
  return Boolean(account.is_fictional) && ctx.perms?.has('accounts.manage');
}

export function requireAuth(ctx) {
  if (!ctx.user) throw E.unauthorized();
  if (!ctx.account) throw E.forbidden('No account is attached to this login');
}

/** For endpoints that act as the current account: the account must be enabled. */
export function requireActiveAccount(ctx) {
  requireAuth(ctx);
  if (ctx.account.status !== 'active') throw E.forbidden('This account is disabled', 'account_disabled');
}

export function requirePerm(...perms) {
  return (ctx) => {
    requireAuth(ctx);
    for (const p of perms) if (!ctx.perms.has(p)) throw E.forbidden(`Missing permission: ${p}`);
  };
}

/** Admin endpoints additionally require a recent password re-entry ("unlock Modify Menu"). */
export function requireElevated(ctx) {
  requireAuth(ctx);
  if (!ctx.perms.has('admin.access')) throw E.forbidden('Modify Menu access is restricted to staff');
  if (!(ctx.session.elevatedUntil > now())) throw E.forbidden('Unlock the Modify Menu with your password first', 'elevation_required');
}

export function createSession(userId, { ip, userAgent, deviceName }) {
  const { db, cfg } = app;
  const token = newToken();
  const t = now();
  const primary = db.get('SELECT id FROM accounts WHERE owner_user_id = ? AND is_primary = 1', userId);
  db.run(
    `INSERT INTO auth_sessions (token_hash, user_id, acting_account_id, device_name, ip, user_agent, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    hashToken(token), userId, primary?.id ?? null, deviceName ?? null, ip, (userAgent ?? '').slice(0, 300), t, t, t + cfg.sessionTtlMs,
  );
  db.run('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?', t, userId);
  return token;
}
