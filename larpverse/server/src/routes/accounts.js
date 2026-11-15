import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E, UPLOAD } from '../http.js';
import { cardsList, fullProfile, requireAccount, settingsOf, validateUsername } from '../services/accounts.js';
import { getConfig } from '../services/config.js';
import { fileUrl, saveDataUrl } from '../services/files.js';
import { itemView } from '../services/inventory.js';
import { debit } from '../services/wallet.js';
import { now, page, paginate, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';

const VIS = ['everyone', 'friends', 'nobody'];

export default function register(r) {
  r.get('/api/accounts/:id/profile', (ctx) => {
    const id = Number(ctx.params.id);
    return fullProfile(id, { viewerId: ctx.account?.id ?? null, isStaff: Boolean(ctx.perms?.has('accounts.view')) });
  });

  r.get('/api/users/by-username/:username', (ctx) => {
    const acc = app.db.get('SELECT id FROM accounts WHERE username = ?', ctx.params.username);
    if (!acc) throw E.notFound('No account with that username');
    return fullProfile(acc.id, { viewerId: ctx.account?.id ?? null, isStaff: Boolean(ctx.perms?.has('accounts.view')) });
  });

  r.patch('/api/me/profile', requireActiveAccount, (ctx) => {
    const body = check(v.object({
      displayName: v.string({ min: 1, max: 30 }).optional(),
      bio: v.string({ max: 1000, multiline: true }).optional(),
      statusText: v.string({ max: 80 }).optional(),
      bannerColor: v.color().optional(),
      showcaseItemIds: v.array(v.int({ min: 1 }), { max: 12 }).optional(),
    }), ctx.body);
    const { db } = app;
    const id = ctx.account.id;
    db.tx(() => {
      if (body.displayName !== undefined) db.run('UPDATE accounts SET display_name = ?, updated_at = ? WHERE id = ?', body.displayName, now(), id);
      if (body.bio !== undefined) db.run('UPDATE profiles SET bio = ? WHERE account_id = ?', body.bio, id);
      if (body.statusText !== undefined) db.run('UPDATE profiles SET status_text = ? WHERE account_id = ?', body.statusText, id);
      if (body.bannerColor !== undefined) db.run('UPDATE profiles SET banner_color = ? WHERE account_id = ?', body.bannerColor, id);
      if (body.showcaseItemIds !== undefined) {
        const owned = body.showcaseItemIds.filter((iid) => db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', id, iid));
        db.run('UPDATE profiles SET showcase_item_ids = ? WHERE account_id = ?', toJson(owned), id);
      }
    });
    return fullProfile(id, { viewerId: id });
  });

  /** Username changes cost a fictional fee, charged atomically with the rename. */
  r.post('/api/me/username', requireActiveAccount, (ctx) => {
    const { username } = check(v.object({ username: v.string({ min: 3, max: 20 }) }), ctx.body);
    const { db } = app;
    const acc = ctx.account;
    if (username.toLowerCase() === acc.username.toLowerCase()) throw E.bad('That is already your username');
    const cost = getConfig('economy').usernameChangeCost;
    db.tx(() => {
      validateUsername(username);
      if (cost > 0) debit(acc.id, cost, { type: 'fee', description: `Username change to @${username}`, refType: 'account', refId: acc.id });
      db.run('UPDATE accounts SET username = ?, updated_at = ? WHERE id = ?', username, now(), acc.id);
      db.run('UPDATE profiles SET username_changed_at = ? WHERE account_id = ?', now(), acc.id);
      if (acc.is_primary && acc.owner_user_id === ctx.user.id) db.run('UPDATE users SET username = ? WHERE id = ?', username, ctx.user.id);
    });
    return { username, cost };
  });

  r.post('/api/me/picture', UPLOAD, requireActiveAccount, (ctx) => {
    const { dataUrl } = check(v.object({ dataUrl: v.string({ min: 20, max: 3_000_000, trim: false }) }), ctx.body);
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`upload:${ctx.user.id}`, 20, 3600_000, 'Upload limit reached, try again later');
    const f = saveDataUrl(dataUrl, { ownerUserId: ctx.user.id, purpose: 'profile_picture' });
    app.db.run('UPDATE profiles SET picture_file_id = ? WHERE account_id = ?', f.id, ctx.account.id);
    return { picture: f.url };
  });

  r.delete('/api/me/picture', requireActiveAccount, (ctx) => {
    app.db.run('UPDATE profiles SET picture_file_id = NULL WHERE account_id = ?', ctx.account.id);
    return { picture: null };
  });

  r.get('/api/me/settings', requireAuth, (ctx) => settingsOf(ctx.account.id));

  r.patch('/api/me/settings', requireAuth, (ctx) => {
    const body = check(v.object({
      privacy: v.object({
        profileVisibility: v.enum(VIS).optional(),
        inventoryVisibility: v.enum(VIS).optional(),
        friendRequests: v.enum(['everyone', 'nobody']).optional(),
        allowFollow: v.bool().optional(),
        gameInvites: v.enum(VIS).optional(),
        showOnlineStatus: v.bool().optional(),
        searchable: v.bool().optional(),
      }, { strict: true }).optional(),
      notifications: v.json({ maxBytes: 2000 }).optional(),
      preferences: v.object({
        theme: v.enum(['dark', 'light', 'system']).optional(),
        reduceMotion: v.bool().optional(),
        dataSaver: v.bool().optional(),
        compactLists: v.bool().optional(),
      }, { strict: true }).optional(),
    }), ctx.body);
    const { db } = app;
    const cur = settingsOf(ctx.account.id);
    const notifications = { ...cur.notifications };
    if (body.notifications) {
      for (const [k, val] of Object.entries(body.notifications)) {
        if (k in notifications && typeof val === 'boolean') notifications[k] = val;
      }
    }
    db.run('UPDATE account_settings SET privacy = ?, notifications = ?, preferences = ? WHERE account_id = ?',
      toJson({ ...cur.privacy, ...(body.privacy ?? {}) }), toJson(notifications), toJson({ ...cur.preferences, ...(body.preferences ?? {}) }), ctx.account.id);
    return settingsOf(ctx.account.id);
  });

  // ───── Search ─────
  r.get('/api/search', (ctx) => {
    const { db } = app;
    const q = String(ctx.query.q ?? '').trim().slice(0, 60);
    const type = ctx.query.type ?? 'all';
    const { limit, offset } = paginate(ctx.query, { defaultLimit: type === 'all' ? 8 : 30 });
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const isStaff = Boolean(ctx.perms?.has('accounts.view'));
    const viewerId = ctx.account?.id ?? null;
    const out = {};
    if (!q) return { people: [], experiences: [], items: [], groups: [] };
    if (type === 'all' || type === 'people') {
      const ids = db.all(
        `SELECT a.id FROM accounts a JOIN account_settings s ON s.account_id = a.id
          WHERE (a.username LIKE ? ESCAPE '\\' OR a.display_name LIKE ? ESCAPE '\\') AND a.status = 'active'
            AND (? OR json_extract(s.privacy, '$.searchable') IS NOT 0 OR a.id = ?)
          ORDER BY (a.username = ?) DESC, length(a.username) LIMIT ? OFFSET ?`,
        like, like, isStaff ? 1 : 0, viewerId, q, limit + 1, offset).map((x) => x.id);
      out.people = page(cardsList(ids, { viewerId, isStaff }), limit, offset);
    }
    if (type === 'all' || type === 'experiences') {
      const rows = db.all(
        `SELECT * FROM experiences WHERE status = 'public' AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR genre LIKE ? ESCAPE '\\')
          ORDER BY visits DESC LIMIT ? OFFSET ?`, like, like, like, limit + 1, offset);
      out.experiences = page(rows.map((e) => ({ id: e.id, name: e.name, genre: e.genre, art: parseJson(e.art, {}), thumbnail: fileUrl(e.thumbnail_file_id), visits: e.visits, likes: e.likes, dislikes: e.dislikes })), limit, offset);
    }
    if (type === 'all' || type === 'items') {
      const rows = db.all(
        `SELECT * FROM items WHERE is_archived = 0 AND (name LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
          ORDER BY is_featured DESC, sold_count DESC LIMIT ? OFFSET ?`, like, like, like, limit + 1, offset);
      out.items = page(rows.map((i) => itemView(i)), limit, offset);
    }
    if (type === 'all' || type === 'groups') {
      const rows = db.all(
        `SELECT g.*, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id AND m.rank != 'pending') AS members
           FROM user_groups g WHERE g.name LIKE ? ESCAPE '\\' OR g.description LIKE ? ESCAPE '\\' ORDER BY members DESC LIMIT ? OFFSET ?`,
        like, like, limit + 1, offset);
      out.groups = page(rows.map((g) => ({ id: g.id, name: g.name, emblem: parseJson(g.emblem, {}), members: g.member_count_override ?? g.members, isPublic: Boolean(g.is_public) })), limit, offset);
    }
    return out;
  });

  r.get('/api/accounts/:id/summary', (ctx) => {
    const acc = requireAccount(Number(ctx.params.id));
    return cardsList([acc.id], { viewerId: ctx.account?.id, isStaff: Boolean(ctx.perms?.has('accounts.view')) })[0];
  });
}
