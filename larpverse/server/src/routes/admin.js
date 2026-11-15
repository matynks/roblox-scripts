import { app } from '../app.js';
import { audit } from '../audit.js';
import { requireElevated, requirePerm } from '../auth.js';
import { E, UPLOAD } from '../http.js';
import { accountCard, cardsList, createAccount, displayStats, requireAccount, settingsOf, validateUsername } from '../services/accounts.js';
import { equipItem, getAvatar, outfitView, resetAvatar, saveOutfit, setBody, unequipItem, wearOutfit } from '../services/avatar.js';
import { assignBadge, badgesFor, badgeView, removeBadge } from '../services/badges.js';
import { fileUrl, saveDataUrl } from '../services/files.js';
import { grantItem, revokeItem } from '../services/inventory.js';
import { notify } from '../services/notify.js';
import { credit, debit, getBalance, setBalance, transactionView } from '../services/wallet.js';
import { now, page, paginate, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';
import { bodyColorsSchema } from './avatar.js';
import { inventoryQuery } from './inventory.js';
import { purchaseView, refundPurchase } from './wallet.js';

/** Every admin route: staff permission + unlocked (password re-entered) Modify Menu + specific permission. */
export const A = (perm) => [requireElevated, requirePerm(perm)];

const statOverridesSchema = v.object({
  followers: v.int({ min: 0, max: 1e10 }).nullable().optional(),
  following: v.int({ min: 0, max: 1e10 }).nullable().optional(),
  friends: v.int({ min: 0, max: 1e10 }).nullable().optional(),
  visits: v.int({ min: 0, max: 1e12 }).nullable().optional(),
  presence: v.enum(['online', 'in_experience', 'offline']).nullable().optional(),
  presenceExperienceId: v.int({ min: 1 }).nullable().optional(),
}, { strict: true });

export function adminAccountView(id) {
  const { db } = app;
  const a = requireAccount(id);
  const p = db.get('SELECT * FROM profiles WHERE account_id = ?', id);
  const w = db.get('SELECT * FROM wallets WHERE account_id = ?', id);
  const owner = a.owner_user_id ? db.get('SELECT id, username, staff_role, status FROM users WHERE id = ?', a.owner_user_id) : null;
  return {
    account: {
      id: a.id, username: a.username, displayName: a.display_name, isFictional: Boolean(a.is_fictional), isPrimary: Boolean(a.is_primary),
      status: a.status, createdAt: a.created_at, lastOnlineAt: a.last_online_at,
      owner: owner ? { id: owner.id, username: owner.username, staffRole: owner.staff_role, status: owner.status } : null,
    },
    profile: {
      bio: p.bio, statusText: p.status_text, announcement: p.announcement, bannerColor: p.banner_color, picture: fileUrl(p.picture_file_id),
      joinDateOverride: p.join_date_override, statOverrides: parseJson(p.stat_overrides, {}), showcaseItemIds: parseJson(p.showcase_item_ids, []),
    },
    card: accountCard(id, { viewerId: id, isStaff: true }),
    wallet: { balance: w.balance, lifetimeEarned: w.lifetime_earned, lifetimeSpent: w.lifetime_spent },
    badges: badgesFor([id]).get(id),
    stats: displayStats(id),
    inventoryCount: db.value('SELECT COUNT(*) FROM inventory WHERE account_id = ?', id),
    characters: db.value('SELECT COUNT(*) FROM characters WHERE account_id = ?', id),
    avatar: getAvatar(id),
    settings: settingsOf(id),
    recentTransactions: db.all('SELECT * FROM transactions WHERE account_id = ? ORDER BY id DESC LIMIT 10', id).map(transactionView),
  };
}

export default function register(r) {
  r.get('/api/admin/overview', ...A('admin.access'), (ctx) => {
    const { db } = app;
    const count = (sql, ...p) => db.value(sql, ...p);
    return {
      counts: {
        logins: count('SELECT COUNT(*) FROM users'),
        accounts: count('SELECT COUNT(*) FROM accounts'),
        fictionalAccounts: count('SELECT COUNT(*) FROM accounts WHERE is_fictional = 1'),
        disabledAccounts: count("SELECT COUNT(*) FROM accounts WHERE status = 'disabled'"),
        items: count('SELECT COUNT(*) FROM items WHERE is_archived = 0'),
        purchases: count("SELECT COUNT(*) FROM purchases WHERE status = 'completed'"),
        sparksInCirculation: count('SELECT COALESCE(SUM(balance), 0) FROM wallets'),
        transactions24h: count('SELECT COUNT(*) FROM transactions WHERE created_at > ?', now() - 86400_000),
        experiences: count('SELECT COUNT(*) FROM experiences'),
        openSessions: count("SELECT COUNT(*) FROM larp_sessions WHERE status != 'ended'"),
        events: count('SELECT COUNT(*) FROM scripted_events'),
        presets: count('SELECT COUNT(*) FROM presets'),
      },
      you: { permissions: [...ctx.perms].sort(), elevatedUntil: ctx.session.elevatedUntil, actingAccount: accountCard(ctx.account.id, { isStaff: true }) },
      recentAudit: ctx.perms.has('audit.view')
        ? db.all('SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 12')
          .map((l) => ({ id: l.id, action: l.action, user: l.username, targetType: l.target_type, targetId: l.target_id, at: l.created_at }))
        : [],
    };
  });

  // ───────────── Accounts ─────────────
  r.get('/api/admin/accounts', ...A('accounts.view'), (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 40 });
    const where = ['1 = 1'];
    const params = [];
    if (ctx.query.q) { where.push('(username LIKE ? OR display_name LIKE ?)'); params.push(`%${ctx.query.q}%`, `%${ctx.query.q}%`); }
    if (ctx.query.fictional === '1') where.push('is_fictional = 1');
    if (ctx.query.fictional === '0') where.push('is_fictional = 0');
    if (ctx.query.status) { where.push('status = ?'); params.push(String(ctx.query.status)); }
    const ids = app.db.all(`SELECT id FROM accounts WHERE ${where.join(' AND ')} ORDER BY is_fictional DESC, username COLLATE NOCASE LIMIT ? OFFSET ?`, ...params, limit + 1, offset).map((x) => x.id);
    const cards = cardsList(ids, { isStaff: true });
    const balances = new Map(ids.length ? app.db.all(`SELECT account_id, balance FROM wallets WHERE account_id IN (${ids.map(() => '?').join(',')})`, ...ids).map((w) => [w.account_id, w.balance]) : []);
    return page(cards.map((c) => ({ ...c, balance: balances.get(c.id) ?? 0 })), limit, offset);
  });

  r.post('/api/admin/accounts', ...A('accounts.manage'), (ctx) => {
    const body = check(v.object({
      username: v.string({ min: 3, max: 20 }),
      displayName: v.string({ min: 1, max: 30 }).optional(),
      bio: v.string({ max: 1000, multiline: true }).default(''),
      startingBalance: v.int({ min: 0, max: 1_000_000_000_000 }).optional(),
      bodyColors: bodyColorsSchema.optional(),
    }), ctx.body);
    const id = createAccount({
      ownerUserId: ctx.user.id, username: body.username, displayName: body.displayName ?? body.username, bio: body.bio,
      isFictional: true, startingBalance: body.startingBalance, bodyColors: body.bodyColors, createdByUserId: ctx.user.id,
    });
    audit(ctx, 'account.create', 'account', id, { username: body.username, fictional: true });
    ctx.status = 201;
    return adminAccountView(id);
  });

  r.get('/api/admin/accounts/:id', ...A('accounts.view'), (ctx) => adminAccountView(Number(ctx.params.id)));

  r.patch('/api/admin/accounts/:id', ...A('accounts.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const body = check(v.object({
      username: v.string({ min: 3, max: 20 }).optional(),
      displayName: v.string({ min: 1, max: 30 }).optional(),
      bio: v.string({ max: 1000, multiline: true }).optional(),
      statusText: v.string({ max: 80 }).optional(),
      announcement: v.string({ max: 280 }).nullable().optional(),
      bannerColor: v.color().optional(),
      status: v.enum(['active', 'disabled']).optional(),
      statOverrides: statOverridesSchema.optional(),
      joinDateOverride: v.int({ min: 0 }).nullable().optional(),
      showcaseItemIds: v.array(v.int({ min: 1 }), { max: 12 }).optional(),
    }, { strict: true }), ctx.body);
    const { db } = app;
    const before = adminAccountView(id);
    db.tx(() => {
      const acc = db.get('SELECT * FROM accounts WHERE id = ?', id);
      if (body.username && body.username.toLowerCase() !== acc.username.toLowerCase()) {
        validateUsername(body.username);
        db.run('UPDATE accounts SET username = ? WHERE id = ?', body.username, id);
        if (acc.is_primary && acc.owner_user_id) db.run('UPDATE users SET username = ? WHERE id = ?', body.username, acc.owner_user_id);
      } else if (body.username) {
        db.run('UPDATE accounts SET username = ? WHERE id = ?', body.username, id);
      }
      if (body.displayName) db.run('UPDATE accounts SET display_name = ? WHERE id = ?', body.displayName, id);
      if (body.status) {
        if (body.status === 'disabled' && acc.owner_user_id === ctx.user.id && acc.is_primary) throw E.bad('You cannot disable your own primary account');
        db.run('UPDATE accounts SET status = ? WHERE id = ?', body.status, id);
      }
      if (body.bio !== undefined) db.run('UPDATE profiles SET bio = ? WHERE account_id = ?', body.bio, id);
      if (body.statusText !== undefined) db.run('UPDATE profiles SET status_text = ? WHERE account_id = ?', body.statusText, id);
      if (body.announcement !== undefined) db.run('UPDATE profiles SET announcement = ? WHERE account_id = ?', body.announcement, id);
      if (body.bannerColor) db.run('UPDATE profiles SET banner_color = ? WHERE account_id = ?', body.bannerColor, id);
      if (body.joinDateOverride !== undefined) db.run('UPDATE profiles SET join_date_override = ? WHERE account_id = ?', body.joinDateOverride, id);
      if (body.showcaseItemIds) db.run('UPDATE profiles SET showcase_item_ids = ? WHERE account_id = ?', toJson(body.showcaseItemIds), id);
      if (body.statOverrides) {
        const cur = parseJson(db.value('SELECT stat_overrides FROM profiles WHERE account_id = ?', id), {});
        for (const [k, val] of Object.entries(body.statOverrides)) { if (val === null) delete cur[k]; else cur[k] = val; }
        db.run('UPDATE profiles SET stat_overrides = ? WHERE account_id = ?', toJson(cur), id);
      }
      db.run('UPDATE accounts SET updated_at = ? WHERE id = ?', now(), id);
      audit(ctx, 'account.update', 'account', id, { changes: body, before: { username: before.account.username, displayName: before.account.displayName, status: before.account.status } });
    });
    return adminAccountView(id);
  });

  r.post('/api/admin/accounts/:id/picture', UPLOAD, ...A('accounts.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { dataUrl } = check(v.object({ dataUrl: v.string({ min: 20, max: 3_000_000, trim: false }) }), ctx.body);
    const f = saveDataUrl(dataUrl, { ownerUserId: ctx.user.id, purpose: 'profile_picture' });
    app.db.run('UPDATE profiles SET picture_file_id = ? WHERE account_id = ?', f.id, id);
    audit(ctx, 'account.picture', 'account', id, { file: f.publicId });
    return { picture: f.url };
  });

  r.delete('/api/admin/accounts/:id/picture', ...A('accounts.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    app.db.run('UPDATE profiles SET picture_file_id = NULL WHERE account_id = ?', id);
    audit(ctx, 'account.picture_removed', 'account', id);
    return { picture: null };
  });

  /** Switch the staff session into a fictional account (any staff member's), audited. */
  r.post('/api/admin/accounts/:id/switch', ...A('accounts.manage'), (ctx) => {
    const acc = requireAccount(Number(ctx.params.id));
    if (!acc.is_fictional && acc.owner_user_id !== ctx.user.id) throw E.forbidden('Only fictional accounts (or your own) can be switched into');
    app.db.run('UPDATE auth_sessions SET acting_account_id = ? WHERE id = ?', acc.id, ctx.session.id);
    audit(ctx, 'account.switch', 'account', acc.id, { from: ctx.account.id });
    return { actingAccountId: acc.id, account: accountCard(acc.id, { isStaff: true }) };
  });

  // ───────────── Fictional currency ─────────────
  r.get('/api/admin/accounts/:id/transactions', ...A('currency.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 50 });
    const rows = app.db.all('SELECT * FROM transactions WHERE account_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', id, limit + 1, offset);
    return page(rows.map(transactionView), limit, offset);
  });

  r.post('/api/admin/accounts/:id/wallet', ...A('currency.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const body = check(v.object({
      op: v.enum(['set', 'add', 'remove']),
      amount: v.int({ min: 0, max: 1_000_000_000_000 }),
      description: v.string({ max: 200 }).optional(),
      scripted: v.bool().default(false),
      notify: v.bool().default(false),
      notifyTitle: v.string({ max: 140 }).optional(),
    }), ctx.body);
    const before = getBalance(id);
    const meta = (type, fallback) => ({ type: body.scripted ? 'scripted' : type, description: body.description || fallback, scripted: body.scripted, userId: ctx.user.id });
    const res = app.db.tx(() => {
      let out;
      if (body.op === 'set') out = setBalance(id, body.amount, meta('admin_set', 'Balance adjusted by staff'));
      else if (body.amount === 0) throw E.bad('Amount must be greater than zero');
      else if (body.op === 'add') out = credit(id, body.amount, meta('admin_add', 'Sparks added by staff'));
      else out = debit(id, body.amount, meta('admin_remove', 'Sparks removed by staff'));
      if (body.notify) {
        const delta = out.balance - before;
        notify(id, {
          type: 'reward', force: true, scripted: true,
          title: body.notifyTitle ?? (delta >= 0 ? `You received ${delta.toLocaleString('en-US')} Sparks` : `${(-delta).toLocaleString('en-US')} Sparks were removed`),
          body: `${body.description ?? 'Roleplay adjustment'} · fictional roleplay currency`,
        });
      }
      audit(ctx, `currency.${body.op}`, 'account', id, { amount: body.amount, before, after: out.balance, description: body.description, scripted: body.scripted });
      return out;
    });
    return { balance: res.balance, transactionId: res.transactionId, before };
  });

  r.post('/api/admin/wallets/reset', ...A('currency.manage'), (ctx) => {
    const { balance, scope } = check(v.object({ balance: v.int({ min: 0, max: 1_000_000_000_000 }), scope: v.enum(['fictional', 'all']) }), ctx.body);
    const ids = app.db.all(`SELECT id FROM accounts ${scope === 'fictional' ? 'WHERE is_fictional = 1' : ''}`).map((x) => x.id);
    app.db.tx(() => {
      for (const id of ids) setBalance(id, balance, { type: 'admin_set', description: 'Balance reset by staff', userId: ctx.user.id });
      audit(ctx, 'currency.reset_all', null, null, { scope, balance, accounts: ids.length });
    });
    return { reset: ids.length, balance };
  });

  r.get('/api/admin/transactions', ...A('currency.manage'), (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 60 });
    const where = ['1 = 1'];
    const params = [];
    if (ctx.query.accountId) { where.push('t.account_id = ?'); params.push(Number(ctx.query.accountId)); }
    if (ctx.query.type) { where.push('t.type = ?'); params.push(String(ctx.query.type)); }
    if (ctx.query.scripted === '1') where.push('t.is_scripted = 1');
    const rows = app.db.all(
      `SELECT t.*, a.username FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE ${where.join(' AND ')} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
      ...params, limit + 1, offset);
    return page(rows.map((t) => ({ ...transactionView(t), accountId: t.account_id, username: t.username })), limit, offset);
  });

  // ───────────── Badges ─────────────
  r.get('/api/admin/badges', ...A('badges.manage'), () => ({
    badges: app.db.all('SELECT b.*, (SELECT COUNT(*) FROM account_badges ab WHERE ab.badge_id = b.id) AS holders FROM badges b ORDER BY sort, id')
      .map((b) => ({ ...badgeView(b), holders: b.holders })),
  }));

  const badgeSchema = (create) => v.object({
    key: create ? v.string({ min: 2, max: 40, pattern: /^[a-z0-9_]+$/, message: 'use lowercase letters, numbers and _' }) : v.any().optional(),
    name: create ? v.string({ min: 1, max: 40 }) : v.string({ min: 1, max: 40 }).optional(),
    description: v.string({ max: 300 }).optional(),
    icon: v.enum(['check', 'star', 'crown', 'shield', 'gem', 'bolt', 'heart', 'trophy', 'flame', 'leaf', 'music', 'camera', 'mic', 'sparkle']).optional(),
    color: v.color().optional(),
    perks: v.object({
      verified: v.bool().optional(), featuredCreator: v.bool().optional(), freeGroups: v.bool().optional(),
      hostLimitBonus: v.int({ min: 0, max: 30 }).optional(),
    }, { strict: true }).optional(),
    sort: v.int({ min: 0, max: 1000 }).optional(),
  });

  r.post('/api/admin/badges', ...A('badges.manage'), (ctx) => {
    const b = check(badgeSchema(true), ctx.body);
    const t = now();
    const id = app.db.run("INSERT INTO badges (key, name, description, icon, color, kind, perks, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'custom', ?, ?, ?, ?)",
      b.key, b.name, b.description ?? '', b.icon ?? 'star', b.color ?? '#8b5cf6', toJson(b.perks ?? {}), b.sort ?? 200, t, t).id;
    audit(ctx, 'badge.create', 'badge', id, b);
    ctx.status = 201;
    return badgeView(app.db.get('SELECT * FROM badges WHERE id = ?', id));
  });

  r.patch('/api/admin/badges/:id', ...A('badges.manage'), (ctx) => {
    const badge = app.db.get('SELECT * FROM badges WHERE id = ?', Number(ctx.params.id));
    if (!badge) throw E.notFound('Badge not found');
    const b = check(badgeSchema(false), ctx.body);
    if (badge.kind === 'system' && b.perks) throw E.bad('System badge perks are fixed');
    app.db.run('UPDATE badges SET name = ?, description = ?, icon = ?, color = ?, perks = ?, sort = ?, updated_at = ? WHERE id = ?',
      b.name ?? badge.name, b.description ?? badge.description, b.icon ?? badge.icon, b.color ?? badge.color,
      b.perks ? toJson(b.perks) : badge.perks, b.sort ?? badge.sort, now(), badge.id);
    audit(ctx, 'badge.update', 'badge', badge.id, b);
    return badgeView(app.db.get('SELECT * FROM badges WHERE id = ?', badge.id));
  });

  r.delete('/api/admin/badges/:id', ...A('badges.manage'), (ctx) => {
    const badge = app.db.get('SELECT * FROM badges WHERE id = ?', Number(ctx.params.id));
    if (!badge) throw E.notFound('Badge not found');
    if (badge.kind !== 'custom') throw E.bad('Only custom badges can be deleted');
    app.db.run('DELETE FROM badges WHERE id = ?', badge.id);
    audit(ctx, 'badge.delete', 'badge', badge.id, { key: badge.key });
    return { ok: true };
  });

  r.post('/api/admin/accounts/:id/badges', ...A('badges.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { badgeId, labelOverride, notify: doNotify } = check(v.object({ badgeId: v.int({ min: 1 }), labelOverride: v.string({ max: 40 }).nullable().optional(), notify: v.bool().default(false) }), ctx.body);
    const badge = assignBadge(id, badgeId, { labelOverride: labelOverride || null, userId: ctx.user.id });
    if (doNotify) notify(id, { type: 'badge', title: `You earned the ${labelOverride || badge.name} badge`, body: badge.description, scripted: true });
    audit(ctx, 'badge.assign', 'account', id, { badge: badge.key, labelOverride });
    return { badges: badgesFor([id]).get(id) };
  });

  r.delete('/api/admin/accounts/:id/badges/:badgeId', ...A('badges.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const badgeId = Number(ctx.params.badgeId);
    const badge = app.db.get('SELECT * FROM badges WHERE id = ?', badgeId);
    if (badge?.kind === 'system') throw E.bad('System badges follow staff roles; change the staff role instead');
    removeBadge(id, badgeId);
    audit(ctx, 'badge.remove', 'account', id, { badgeId });
    return { badges: badgesFor([id]).get(id) };
  });

  // ───────────── Inventory ─────────────
  r.get('/api/admin/accounts/:id/inventory', ...A('inventory.manage'), (ctx) => inventoryQuery(requireAccount(Number(ctx.params.id)).id, ctx.query));

  r.post('/api/admin/accounts/:id/inventory', ...A('inventory.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { itemId, notify: doNotify, equip } = check(v.object({ itemId: v.int({ min: 1 }), notify: v.bool().default(false), equip: v.bool().default(false) }), ctx.body);
    const added = app.db.tx(() => {
      const got = grantItem(id, itemId, { source: 'grant', allowSoldOut: true });
      if (equip) { try { equipItem(id, itemId); } catch { /* not wearable */ } }
      const item = app.db.get('SELECT name FROM items WHERE id = ?', itemId);
      if (doNotify && got.length) notify(id, { type: 'reward', title: `You received ${item.name}`, body: 'Added to your inventory (roleplay item).', data: { itemId }, scripted: true });
      audit(ctx, 'inventory.grant', 'account', id, { itemId, added: got });
      return got;
    });
    return { added };
  });

  r.delete('/api/admin/accounts/:id/inventory/:itemId', ...A('inventory.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const itemId = Number(ctx.params.itemId);
    const removed = revokeItem(id, itemId, { reason: 'revoked' });
    audit(ctx, 'inventory.revoke', 'account', id, { itemId, removed });
    return { removed };
  });

  r.get('/api/admin/accounts/:id/purchases', ...A('inventory.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const rows = app.db.all('SELECT * FROM purchases WHERE account_id = ? ORDER BY id DESC LIMIT 100', id);
    return { items: rows.map((p) => purchaseView(p, app.db.get('SELECT * FROM items WHERE id = ?', p.item_id))) };
  });

  r.post('/api/admin/purchases/:id/refund', ...A('inventory.manage'), (ctx) => {
    const { silent } = check(v.object({ silent: v.bool().default(false) }), ctx.body);
    const res = refundPurchase(Number(ctx.params.id), { byUserId: ctx.user.id, reason: 'Staff refund', silent });
    audit(ctx, 'purchase.refund', 'purchase', Number(ctx.params.id), { silent });
    return res;
  });

  /**
   * Repeatable purchases for recordings: undo the latest purchase of an item (refund + remove)
   * so the same purchase flow can be filmed again. Falls back to revoking a granted copy.
   */
  r.post('/api/admin/accounts/:id/reset-item', ...A('inventory.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { itemId } = check(v.object({ itemId: v.int({ min: 1 }) }), ctx.body);
    const p = app.db.get("SELECT id FROM purchases WHERE account_id = ? AND item_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1", id, itemId);
    const res = p ? refundPurchase(p.id, { byUserId: ctx.user.id, reason: 'Scene reset', silent: true }) : { removed: revokeItem(id, itemId, { reason: 'revoked' }) };
    audit(ctx, 'purchase.reset_item', 'account', id, { itemId, purchaseId: p?.id ?? null });
    return { ...res, balance: getBalance(id) };
  });

  // ───────────── Avatar ─────────────
  r.get('/api/admin/accounts/:id/avatar', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    return { ...getAvatar(id), outfits: app.db.all('SELECT * FROM outfits WHERE account_id = ? ORDER BY updated_at DESC', id).map(outfitView) };
  });

  r.patch('/api/admin/accounts/:id/avatar', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const body = check(v.object({ bodyColors: bodyColorsSchema.optional(), bodyType: v.enum(['classic', 'slim', 'chunky']).optional() }), ctx.body);
    audit(ctx, 'avatar.body', 'account', id, body);
    return setBody(id, body);
  });

  r.post('/api/admin/accounts/:id/avatar/equip', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { itemId, grant } = check(v.object({ itemId: v.int({ min: 1 }), grant: v.bool().default(false) }), ctx.body);
    return app.db.tx(() => {
      if (grant) grantItem(id, itemId, { source: 'grant', allowSoldOut: true });
      audit(ctx, 'avatar.equip', 'account', id, { itemId, grant });
      return equipItem(id, itemId);
    });
  });

  r.post('/api/admin/accounts/:id/avatar/unequip', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { itemId } = check(v.object({ itemId: v.int({ min: 1 }) }), ctx.body);
    audit(ctx, 'avatar.unequip', 'account', id, { itemId });
    return unequipItem(id, itemId);
  });

  r.post('/api/admin/accounts/:id/avatar/reset', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    audit(ctx, 'avatar.reset', 'account', id);
    return resetAvatar(id);
  });

  r.post('/api/admin/accounts/:id/outfits', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { name } = check(v.object({ name: v.string({ min: 1, max: 40 }) }), ctx.body);
    audit(ctx, 'avatar.outfit_save', 'account', id, { name });
    return saveOutfit(id, name);
  });

  r.post('/api/admin/accounts/:id/outfits/:outfitId/wear', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    audit(ctx, 'avatar.outfit_wear', 'account', id, { outfitId: Number(ctx.params.outfitId) });
    return wearOutfit(id, Number(ctx.params.outfitId));
  });

  r.delete('/api/admin/accounts/:id/outfits/:outfitId', ...A('avatar.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    app.db.run('DELETE FROM outfits WHERE id = ? AND account_id = ?', Number(ctx.params.outfitId), id);
    audit(ctx, 'avatar.outfit_delete', 'account', id, { outfitId: Number(ctx.params.outfitId) });
    return { ok: true };
  });

  // ───────────── Social ─────────────
  r.get('/api/admin/accounts/:id/social', ...A('social.manage'), (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const { db } = app;
    const followers = db.all('SELECT follower_id AS x FROM follows WHERE followee_id = ? ORDER BY created_at DESC LIMIT 200', id).map((r) => r.x);
    const following = db.all('SELECT followee_id AS x FROM follows WHERE follower_id = ? ORDER BY created_at DESC LIMIT 200', id).map((r) => r.x);
    const friendships = db.all('SELECT * FROM friendships WHERE account_a = ? OR account_b = ? ORDER BY created_at DESC LIMIT 300', id, id);
    const other = (f) => (f.account_a === id ? f.account_b : f.account_a);
    const cards = new Map(cardsList([...followers, ...following, ...friendships.map(other)], { isStaff: true }).map((c) => [c.id, c]));
    return {
      stats: displayStats(id),
      followers: followers.map((x) => cards.get(x)).filter(Boolean),
      following: following.map((x) => cards.get(x)).filter(Boolean),
      friendships: friendships.map((f) => ({ id: f.id, status: f.status, requesterId: f.requester_id, account: cards.get(other(f)) })).filter((f) => f.account),
    };
  });

  r.post('/api/admin/social/follow', ...A('social.manage'), (ctx) => {
    const { followerId, followeeId, notify: doNotify, remove } = check(v.object({ followerId: v.int({ min: 1 }), followeeId: v.int({ min: 1 }), notify: v.bool().default(false), remove: v.bool().default(false) }), ctx.body);
    if (followerId === followeeId) throw E.bad('An account cannot follow itself');
    requireAccount(followerId); requireAccount(followeeId);
    const { db } = app;
    if (remove) db.run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', followerId, followeeId);
    else if (db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', followerId, followeeId, now()).changes && doNotify) {
      notify(followeeId, { type: 'follow', title: `${db.value('SELECT display_name FROM accounts WHERE id = ?', followerId)} started following you`, actorId: followerId, data: { accountId: followerId }, scripted: true });
    }
    audit(ctx, remove ? 'social.unfollow' : 'social.follow', 'account', followeeId, { followerId });
    return { ok: true, stats: displayStats(followeeId) };
  });

  r.post('/api/admin/social/friendship', ...A('social.manage'), (ctx) => {
    const { aId, bId, status, requesterId, notify: doNotify } = check(v.object({
      aId: v.int({ min: 1 }), bId: v.int({ min: 1 }), status: v.enum(['accepted', 'pending', 'none']), requesterId: v.int({ min: 1 }).optional(), notify: v.bool().default(false),
    }), ctx.body);
    if (aId === bId) throw E.bad('Pick two different accounts');
    requireAccount(aId); requireAccount(bId);
    const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
    const { db } = app;
    db.tx(() => {
      db.run('DELETE FROM friendships WHERE account_a = ? AND account_b = ?', a, b);
      if (status !== 'none') {
        const req = requesterId === aId || requesterId === bId ? requesterId : aId;
        db.run('INSERT INTO friendships (account_a, account_b, requester_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?)', a, b, req, status, now(), status === 'accepted' ? now() : null);
        if (doNotify) {
          const target = req === aId ? bId : aId;
          const name = db.value('SELECT display_name FROM accounts WHERE id = ?', req);
          notify(target, { type: status === 'pending' ? 'friend_request' : 'friend_accept', title: status === 'pending' ? `${name} sent you a friend request` : `You are now friends with ${name}`, actorId: req, data: { accountId: req }, scripted: true });
        }
      }
      audit(ctx, 'social.friendship', 'account', aId, { other: bId, status });
    });
    return { ok: true };
  });
}

