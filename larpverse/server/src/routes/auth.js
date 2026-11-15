import { app } from '../app.js';
import { audit } from '../audit.js';
import { authenticate, canActAs, createSession, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { hashPassword, hashToken, newToken, newTotpSecret, passwordProblem, verifyPassword, verifyTotp } from '../security.js';
import { accountCard, cardsList, createAccount, settingsOf } from '../services/accounts.js';
import { accountPerks } from '../services/badges.js';
import { getConfig } from '../services/config.js';
import { notify, unreadCount } from '../services/notify.js';
import { getBalance } from '../services/wallet.js';
import { now } from '../util.js';
import { v, check } from '../validate.js';

const LOCK_AFTER = 8;
const LOCK_MS = 10 * 60_000;

export function mePayload(ctx) {
  const { db } = app;
  const acc = ctx.account;
  const isStaff = ctx.perms.has('admin.access');
  const owned = db.all('SELECT id FROM accounts WHERE owner_user_id = ? ORDER BY is_primary DESC, is_fictional, id', ctx.user.id).map((r) => r.id);
  const economy = getConfig('economy');
  return {
    user: {
      id: ctx.user.id,
      username: ctx.user.username,
      staffRole: ctx.user.staff_role,
      mfaEnabled: Boolean(ctx.user.mfa_enabled),
      permissions: [...ctx.perms].sort(),
    },
    account: {
      ...accountCard(acc.id, { viewerId: acc.id, isStaff }),
      isPrimary: Boolean(acc.is_primary),
      isFictional: Boolean(acc.is_fictional),
      createdAt: acc.created_at,
    },
    accounts: cardsList(owned, { viewerId: acc.id, isStaff }).map((c) => ({ ...c, isCurrent: c.id === acc.id })),
    wallet: { balance: getBalance(acc.id) },
    unreadNotifications: unreadCount(acc.id),
    elevatedUntil: ctx.session.elevatedUntil > now() ? ctx.session.elevatedUntil : null,
    settings: settingsOf(acc.id),
    perks: accountPerks(acc.id),
    config: {
      platform: getConfig('platform'),
      economy: {
        dailyReward: economy.dailyReward,
        usernameChangeCost: economy.usernameChangeCost,
        groupCreateCost: economy.groupCreateCost,
        refundWindowMinutes: economy.refundWindowMinutes,
        maxAltAccounts: economy.maxAltAccounts,
      },
    },
  };
}

function authLimit(ctx, key) {
  const rl = app.cfg.rateLimits;
  if (rl) ctx.limiter.enforce(`auth:${key}:${ctx.ip}`, rl.auth.limit, rl.auth.windowMs, 'Too many attempts. Wait a minute and try again.');
}

function deviceName(ctx) {
  const n = ctx.body.deviceName ?? ctx.req.headers['x-device-name'];
  return typeof n === 'string' ? n.slice(0, 60) : null;
}

function recordLogin(userId, username, success, reason, ctx) {
  app.db.run('INSERT INTO login_history (user_id, username, success, reason, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, String(username).slice(0, 40), success ? 1 : 0, reason, ctx.ip, String(ctx.req.headers['user-agent'] ?? '').slice(0, 300), now());
}

function sessionResponse(ctx, userId, token) {
  // Re-authenticate with the new token so the response carries the same payload as GET /api/me.
  ctx.req.headers.authorization = `Bearer ${token}`;
  authenticate(ctx);
  return { token, me: mePayload(ctx) };
}

export default function register(r) {
  r.post('/api/auth/register', async (ctx) => {
    authLimit(ctx, 'register');
    const body = check(v.object({
      username: v.string({ min: 3, max: 20 }),
      password: v.string({ min: 1, max: 200, trim: false }),
      displayName: v.string({ min: 1, max: 30 }).optional(),
      deviceName: v.string({ max: 60 }).optional(),
    }), ctx.body);
    const problem = passwordProblem(body.password);
    if (problem) throw E.bad(problem, { field: 'password' });
    const hash = await hashPassword(body.password);
    const { db } = app;
    const userId = db.tx(() => {
      if (db.get('SELECT 1 FROM users WHERE username = ?', body.username)) throw E.conflict('That username is taken', 'username_taken', { field: 'username' });
      const t = now();
      const uid = db.run('INSERT INTO users (username, password_hash, created_at, password_changed_at) VALUES (?, ?, ?, ?)', body.username, hash, t, t).id;
      const accId = createAccount({ ownerUserId: uid, username: body.username, displayName: body.displayName ?? body.username, isPrimary: true });
      notify(accId, {
        type: 'system',
        title: 'Welcome to Larpverse!',
        body: 'Sparks are fictional roleplay currency with no real-world value. Customize your avatar, find friends and jump into a LARP session.',
      });
      recordLogin(uid, body.username, true, 'registered', ctx);
      return uid;
    });
    const token = createSession(userId, { ip: ctx.ip, userAgent: ctx.req.headers['user-agent'], deviceName: deviceName(ctx) });
    ctx.status = 201;
    return sessionResponse(ctx, userId, token);
  });

  r.post('/api/auth/login', async (ctx) => {
    authLimit(ctx, 'login');
    const body = check(v.object({
      username: v.string({ min: 1, max: 40 }),
      password: v.string({ min: 1, max: 200, trim: false }),
      deviceName: v.string({ max: 60 }).optional(),
    }), ctx.body);
    const { db } = app;
    const user = db.get('SELECT * FROM users WHERE username = ?', body.username)
      ?? db.get('SELECT u.* FROM users u JOIN accounts a ON a.owner_user_id = u.id AND a.is_primary = 1 WHERE a.username = ?', body.username);
    if (user?.locked_until && user.locked_until > now()) {
      recordLogin(user.id, body.username, false, 'locked', ctx);
      throw E.forbidden('Too many failed sign-ins. This login is locked for a few minutes.', 'locked');
    }
    const ok = user ? await verifyPassword(body.password, user.password_hash) : await verifyPassword(body.password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
    if (!user || !ok) {
      if (user) {
        const fails = user.failed_logins + 1;
        db.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', fails, fails >= LOCK_AFTER ? now() + LOCK_MS : null, user.id);
      }
      recordLogin(user?.id ?? null, body.username, false, 'bad_credentials', ctx);
      throw E.unauthorized('Incorrect username or password');
    }
    if (user.status !== 'active') {
      recordLogin(user.id, body.username, false, 'disabled', ctx);
      throw E.forbidden('This login has been disabled', 'user_disabled');
    }
    if (user.mfa_enabled) {
      const mfaToken = newToken();
      db.run('INSERT INTO mfa_challenges (token_hash, user_id, expires_at) VALUES (?, ?, ?)', hashToken(mfaToken), user.id, now() + 5 * 60_000);
      return { mfaRequired: true, mfaToken };
    }
    recordLogin(user.id, body.username, true, null, ctx);
    const token = createSession(user.id, { ip: ctx.ip, userAgent: ctx.req.headers['user-agent'], deviceName: deviceName(ctx) });
    return sessionResponse(ctx, user.id, token);
  });

  r.post('/api/auth/login/mfa', async (ctx) => {
    authLimit(ctx, 'mfa');
    const body = check(v.object({ mfaToken: v.string({ min: 10, max: 100 }), code: v.string({ min: 6, max: 8 }) }), ctx.body);
    const { db } = app;
    const ch = db.get('SELECT * FROM mfa_challenges WHERE token_hash = ?', hashToken(body.mfaToken));
    if (!ch || ch.expires_at < now() || ch.attempts >= 5) throw E.unauthorized('This sign-in attempt expired. Start again.');
    const user = db.get('SELECT * FROM users WHERE id = ?', ch.user_id);
    if (!user?.mfa_secret || !verifyTotp(user.mfa_secret, body.code)) {
      db.run('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = ?', ch.token_hash);
      recordLogin(ch.user_id, user?.username ?? '?', false, 'bad_mfa_code', ctx);
      throw E.unauthorized('That code is not valid');
    }
    db.run('DELETE FROM mfa_challenges WHERE token_hash = ?', ch.token_hash);
    recordLogin(user.id, user.username, true, 'mfa', ctx);
    const token = createSession(user.id, { ip: ctx.ip, userAgent: ctx.req.headers['user-agent'], deviceName: deviceName(ctx) });
    return sessionResponse(ctx, user.id, token);
  });

  r.post('/api/auth/logout', requireAuth, (ctx) => {
    app.db.run('UPDATE auth_sessions SET revoked_at = ? WHERE id = ?', now(), ctx.session.id);
    return { ok: true };
  });

  r.get('/api/me', requireAuth, (ctx) => mePayload(ctx));

  // ───── Account switching ─────
  r.get('/api/me/switchable', requireAuth, (ctx) => {
    const { db } = app;
    const q = String(ctx.query.q ?? '').slice(0, 40);
    const own = db.all('SELECT id FROM accounts WHERE owner_user_id = ? ORDER BY is_primary DESC, id', ctx.user.id).map((r) => r.id);
    let fictional = [];
    if (ctx.perms.has('accounts.manage')) {
      fictional = db.all(
        `SELECT id FROM accounts WHERE is_fictional = 1 AND (owner_user_id IS NULL OR owner_user_id != ?)
           AND (username LIKE ? OR display_name LIKE ?) ORDER BY username LIMIT 60`,
        ctx.user.id, `%${q}%`, `%${q}%`).map((r) => r.id);
    }
    const opts = { viewerId: ctx.account.id, isStaff: ctx.perms.has('admin.access') };
    return { own: cardsList(own, opts), fictional: cardsList(fictional, opts) };
  });

  r.post('/api/me/switch', requireAuth, (ctx) => {
    const { accountId } = check(v.object({ accountId: v.int({ min: 1 }) }), ctx.body);
    const target = app.db.get('SELECT * FROM accounts WHERE id = ?', accountId);
    if (!target || !canActAs(ctx, target)) throw E.forbidden('You cannot switch to that account');
    app.db.run('UPDATE auth_sessions SET acting_account_id = ? WHERE id = ?', target.id, ctx.session.id);
    if (target.owner_user_id !== ctx.user.id) audit(ctx, 'account.switch', 'account', target.id, { from: ctx.account.id });
    ctx.account = target;
    return mePayload(ctx);
  });

  r.post('/api/me/accounts', requireAuth, (ctx) => {
    const body = check(v.object({ username: v.string({ min: 3, max: 20 }), displayName: v.string({ min: 1, max: 30 }).optional() }), ctx.body);
    const { db } = app;
    const max = getConfig('economy').maxAltAccounts;
    const alts = db.value('SELECT COUNT(*) FROM accounts WHERE owner_user_id = ? AND is_primary = 0 AND is_fictional = 0', ctx.user.id);
    if (alts >= max) throw E.conflict(`You can add up to ${max} extra accounts`, 'account_limit');
    const id = createAccount({ ownerUserId: ctx.user.id, username: body.username, displayName: body.displayName ?? body.username });
    db.run('UPDATE auth_sessions SET acting_account_id = ? WHERE id = ?', id, ctx.session.id);
    ctx.account = db.get('SELECT * FROM accounts WHERE id = ?', id);
    ctx.status = 201;
    return mePayload(ctx);
  });

  // ───── Security settings ─────
  r.post('/api/security/password', requireAuth, async (ctx) => {
    const body = check(v.object({
      currentPassword: v.string({ min: 1, max: 200, trim: false }),
      newPassword: v.string({ min: 1, max: 200, trim: false }),
      signOutOthers: v.bool().default(true),
    }), ctx.body);
    const user = app.db.get('SELECT * FROM users WHERE id = ?', ctx.user.id);
    if (!(await verifyPassword(body.currentPassword, user.password_hash))) throw E.forbidden('Current password is incorrect', 'bad_password');
    const problem = passwordProblem(body.newPassword);
    if (problem) throw E.bad(problem, { field: 'newPassword' });
    const hash = await hashPassword(body.newPassword);
    app.db.tx(() => {
      app.db.run('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?', hash, now(), ctx.user.id);
      if (body.signOutOthers) app.db.run('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL', now(), ctx.user.id, ctx.session.id);
      notify(ctx.account.id, { type: 'security', title: 'Password changed', body: 'Your password was changed. If this was not you, contact a Larpverse admin.' });
      audit(ctx, 'security.password_changed', 'user', ctx.user.id, { signOutOthers: body.signOutOthers });
    });
    return { ok: true };
  });

  r.get('/api/security/sessions', requireAuth, (ctx) => {
    const rows = app.db.all(
      'SELECT id, device_name, ip, user_agent, created_at, last_seen_at FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC',
      ctx.user.id, now());
    return { sessions: rows.map((s) => ({ id: s.id, deviceName: s.device_name, ip: s.ip, userAgent: s.user_agent, createdAt: s.created_at, lastSeenAt: s.last_seen_at, current: s.id === ctx.session.id })) };
  });

  r.delete('/api/security/sessions/:id', requireAuth, (ctx) => {
    const n = app.db.run('UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL', now(), Number(ctx.params.id), ctx.user.id).changes;
    if (!n) throw E.notFound('Session not found');
    return { ok: true };
  });

  r.post('/api/security/sessions/revoke-others', requireAuth, (ctx) => {
    const n = app.db.run('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL', now(), ctx.user.id, ctx.session.id).changes;
    return { revoked: n };
  });

  r.get('/api/security/logins', requireAuth, (ctx) => {
    const rows = app.db.all('SELECT * FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT 30', ctx.user.id);
    return { logins: rows.map((l) => ({ id: l.id, success: Boolean(l.success), reason: l.reason, ip: l.ip, userAgent: l.user_agent, createdAt: l.created_at })) };
  });

  r.post('/api/security/mfa/setup', requireAuth, (ctx) => {
    if (ctx.user.mfa_enabled) throw E.conflict('Two-step verification is already on');
    const secret = newTotpSecret();
    app.db.run('UPDATE users SET mfa_secret = ? WHERE id = ?', secret, ctx.user.id);
    const label = encodeURIComponent(`Larpverse:${ctx.user.username}`);
    return { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=Larpverse&digits=6&period=30` };
  });

  r.post('/api/security/mfa/enable', requireAuth, (ctx) => {
    const { code } = check(v.object({ code: v.string({ min: 6, max: 8 }) }), ctx.body);
    const user = app.db.get('SELECT * FROM users WHERE id = ?', ctx.user.id);
    if (!user.mfa_secret) throw E.bad('Start setup first');
    if (!verifyTotp(user.mfa_secret, code)) throw E.bad('That code is not valid', { field: 'code' });
    app.db.run('UPDATE users SET mfa_enabled = 1 WHERE id = ?', ctx.user.id);
    audit(ctx, 'security.mfa_enabled', 'user', ctx.user.id);
    return { ok: true };
  });

  r.post('/api/security/mfa/disable', requireAuth, async (ctx) => {
    const body = check(v.object({ password: v.string({ min: 1, max: 200, trim: false }), code: v.string({ min: 6, max: 8 }) }), ctx.body);
    const user = app.db.get('SELECT * FROM users WHERE id = ?', ctx.user.id);
    if (!(await verifyPassword(body.password, user.password_hash))) throw E.forbidden('Password is incorrect', 'bad_password');
    if (!user.mfa_enabled || !verifyTotp(user.mfa_secret, body.code)) throw E.bad('That code is not valid', { field: 'code' });
    app.db.run('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', ctx.user.id);
    audit(ctx, 'security.mfa_disabled', 'user', ctx.user.id);
    return { ok: true };
  });

  /** Unlock the Modify Menu: staff re-enter their password (and 2-step code if enabled). */
  r.post('/api/security/elevate', requireAuth, async (ctx) => {
    authLimit(ctx, 'elevate');
    if (!ctx.perms.has('admin.access')) throw E.forbidden('Modify Menu access is restricted to staff');
    const body = check(v.object({ password: v.string({ min: 1, max: 200, trim: false }), code: v.string({ max: 8 }).optional() }), ctx.body);
    const user = app.db.get('SELECT * FROM users WHERE id = ?', ctx.user.id);
    if (!(await verifyPassword(body.password, user.password_hash))) {
      audit(ctx, 'admin.unlock_failed', 'user', ctx.user.id);
      throw E.forbidden('Password is incorrect', 'bad_password');
    }
    if (user.mfa_enabled && !verifyTotp(user.mfa_secret, body.code)) throw E.forbidden('Enter your 2-step verification code', 'mfa_required');
    const until = now() + app.cfg.elevationTtlMs;
    app.db.run('UPDATE auth_sessions SET elevated_until = ? WHERE id = ?', until, ctx.session.id);
    audit(ctx, 'admin.unlocked', 'user', ctx.user.id);
    return { elevatedUntil: until };
  });

  r.post('/api/security/lock', requireAuth, (ctx) => {
    app.db.run('UPDATE auth_sessions SET elevated_until = NULL WHERE id = ?', ctx.session.id);
    return { ok: true };
  });
}
