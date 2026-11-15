import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { cardsList } from '../services/accounts.js';
import { accountPerks } from '../services/badges.js';
import { getConfig } from '../services/config.js';
import { notify } from '../services/notify.js';
import { debit } from '../services/wallet.js';
import { now, page, paginate, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';

export const emblemSchema = v.object({
  shape: v.enum(['shield', 'circle', 'hexagon', 'diamond', 'star']).default('shield'),
  color: v.color().default('#6d4aff'),
  accent: v.color().default('#ffd166'),
  symbol: v.enum(['crown', 'bolt', 'heart', 'star', 'skull', 'leaf', 'flame', 'gem', 'paw', 'music', 'sword', 'rocket']).default('star'),
});

export function groupView(g, viewerId) {
  const { db } = app;
  const members = db.value("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND rank != 'pending'", g.id);
  const myRank = viewerId ? db.value('SELECT rank FROM group_members WHERE group_id = ? AND account_id = ?', g.id, viewerId) : null;
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    emblem: parseJson(g.emblem, {}),
    isPublic: Boolean(g.is_public),
    members: g.member_count_override ?? members,
    realMembers: members,
    owner: g.owner_account_id ? cardsList([g.owner_account_id], { viewerId })[0] ?? null : null,
    shout: g.shout ? { text: g.shout, at: g.shout_at } : null,
    myRank,
    createdAt: g.created_at,
  };
}

function requireGroup(id) {
  const g = app.db.get('SELECT * FROM user_groups WHERE id = ?', id);
  if (!g) throw E.notFound('Group not found');
  return g;
}

function requireRank(groupId, accountId, ranks) {
  const rank = app.db.value('SELECT rank FROM group_members WHERE group_id = ? AND account_id = ?', groupId, accountId);
  if (!ranks.includes(rank)) throw E.forbidden('Only group leaders can do that');
  return rank;
}

export default function register(r) {
  r.get('/api/groups', (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 30 });
    const q = String(ctx.query.q ?? '').slice(0, 50);
    const rows = app.db.all(
      `SELECT g.*, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id AND m.rank != 'pending') AS n FROM user_groups g
        WHERE g.name LIKE ? ORDER BY COALESCE(g.member_count_override, n) DESC LIMIT ? OFFSET ?`, `%${q}%`, limit + 1, offset);
    return page(rows.map((g) => groupView(g, ctx.account?.id)), limit, offset);
  });

  r.get('/api/groups/mine', requireAuth, (ctx) => {
    const rows = app.db.all(
      `SELECT g.* FROM group_members m JOIN user_groups g ON g.id = m.group_id WHERE m.account_id = ? ORDER BY m.joined_at DESC`, ctx.account.id);
    return { items: rows.map((g) => groupView(g, ctx.account.id)) };
  });

  r.get('/api/groups/:id', (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const view = groupView(g, ctx.account?.id);
    const experiences = app.db.all("SELECT id, name, art, genre, visits FROM experiences WHERE creator_group_id = ? AND status = 'public'", g.id)
      .map((e) => ({ ...e, art: parseJson(e.art, {}) }));
    return { ...view, experiences };
  });

  r.post('/api/groups', requireActiveAccount, (ctx) => {
    const body = check(v.object({
      name: v.string({ min: 3, max: 40 }),
      description: v.string({ max: 1000, multiline: true }).default(''),
      isPublic: v.bool().default(true),
      emblem: emblemSchema.default(() => emblemSchema({})),
    }), ctx.body);
    const { db } = app;
    const cost = accountPerks(ctx.account.id).freeGroups ? 0 : getConfig('economy').groupCreateCost;
    if (db.value("SELECT COUNT(*) FROM group_members WHERE account_id = ? AND rank = 'owner'", ctx.account.id) >= 10) throw E.conflict('You can own up to 10 groups');
    const id = db.tx(() => {
      if (db.get('SELECT 1 FROM user_groups WHERE name = ?', body.name)) throw E.conflict('A group with that name exists', 'name_taken', { field: 'name' });
      const t = now();
      const gid = db.run('INSERT INTO user_groups (name, description, owner_account_id, emblem, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        body.name, body.description, ctx.account.id, toJson(body.emblem), body.isPublic ? 1 : 0, t, t).id;
      db.run("INSERT INTO group_members (group_id, account_id, rank, joined_at) VALUES (?, ?, 'owner', ?)", gid, ctx.account.id, t);
      if (cost > 0) debit(ctx.account.id, cost, { type: 'fee', description: `Created group ${body.name}`, refType: 'group', refId: gid });
      return gid;
    });
    ctx.status = 201;
    return groupView(requireGroup(id), ctx.account.id);
  });

  r.patch('/api/groups/:id', requireActiveAccount, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    requireRank(g.id, ctx.account.id, ['owner', 'admin']);
    const body = check(v.object({
      description: v.string({ max: 1000, multiline: true }).optional(),
      shout: v.string({ max: 255 }).optional(),
      isPublic: v.bool().optional(),
      emblem: emblemSchema.optional(),
    }), ctx.body);
    const { db } = app;
    db.tx(() => {
      if (body.description !== undefined) db.run('UPDATE user_groups SET description = ?, updated_at = ? WHERE id = ?', body.description, now(), g.id);
      if (body.isPublic !== undefined) db.run('UPDATE user_groups SET is_public = ? WHERE id = ?', body.isPublic ? 1 : 0, g.id);
      if (body.emblem) db.run('UPDATE user_groups SET emblem = ? WHERE id = ?', toJson(body.emblem), g.id);
      if (body.shout !== undefined) {
        db.run('UPDATE user_groups SET shout = ?, shout_at = ? WHERE id = ?', body.shout || null, now(), g.id);
        if (body.shout) {
          for (const m of db.all("SELECT account_id FROM group_members WHERE group_id = ? AND rank != 'pending' AND account_id != ?", g.id, ctx.account.id)) {
            notify(m.account_id, { type: 'group', title: `${g.name}: new shout`, body: body.shout, actorId: ctx.account.id, data: { groupId: g.id } });
          }
        }
      }
    });
    return groupView(requireGroup(g.id), ctx.account.id);
  });

  r.post('/api/groups/:id/join', requireActiveAccount, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const { db } = app;
    if (db.get('SELECT 1 FROM group_members WHERE group_id = ? AND account_id = ?', g.id, ctx.account.id)) return groupView(g, ctx.account.id);
    if (db.value("SELECT COUNT(*) FROM group_members WHERE account_id = ? AND rank != 'pending'", ctx.account.id) >= 100) throw E.conflict('You can join up to 100 groups');
    const rank = g.is_public ? 'member' : 'pending';
    db.run('INSERT INTO group_members (group_id, account_id, rank, joined_at) VALUES (?, ?, ?, ?)', g.id, ctx.account.id, rank, now());
    if (g.owner_account_id) {
      notify(g.owner_account_id, {
        type: 'group',
        title: rank === 'pending' ? `${ctx.account.display_name} asked to join ${g.name}` : `${ctx.account.display_name} joined ${g.name}`,
        actorId: ctx.account.id,
        data: { groupId: g.id },
      });
    }
    return groupView(g, ctx.account.id);
  });

  r.post('/api/groups/:id/leave', requireAuth, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const rank = app.db.value('SELECT rank FROM group_members WHERE group_id = ? AND account_id = ?', g.id, ctx.account.id);
    if (rank === 'owner') throw E.conflict('Owners cannot leave their own group');
    app.db.run('DELETE FROM group_members WHERE group_id = ? AND account_id = ?', g.id, ctx.account.id);
    return groupView(g, ctx.account.id);
  });

  r.get('/api/groups/:id/members', (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 50 });
    const includePending = ctx.account && ['owner', 'admin'].includes(app.db.value('SELECT rank FROM group_members WHERE group_id = ? AND account_id = ?', g.id, ctx.account.id));
    const rows = app.db.all(
      `SELECT account_id, rank, joined_at FROM group_members WHERE group_id = ? ${includePending ? '' : "AND rank != 'pending'"}
        ORDER BY CASE rank WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'pending' THEN 3 ELSE 2 END, joined_at LIMIT ? OFFSET ?`, g.id, limit + 1, offset);
    const cards = new Map(cardsList(rows.map((x) => x.account_id), { viewerId: ctx.account?.id }).map((c) => [c.id, c]));
    return page(rows.map((m) => ({ rank: m.rank, joinedAt: m.joined_at, account: cards.get(m.account_id) })).filter((m) => m.account), limit, offset);
  });

  r.post('/api/groups/:id/members/:accountId/rank', requireActiveAccount, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    requireRank(g.id, ctx.account.id, ['owner', 'admin']);
    const { rank } = check(v.object({ rank: v.enum(['admin', 'member', 'remove']) }), ctx.body);
    const target = Number(ctx.params.accountId);
    const cur = app.db.value('SELECT rank FROM group_members WHERE group_id = ? AND account_id = ?', g.id, target);
    if (!cur) throw E.notFound('Member not found');
    if (cur === 'owner') throw E.forbidden('The owner rank cannot be changed');
    if (rank === 'remove') app.db.run('DELETE FROM group_members WHERE group_id = ? AND account_id = ?', g.id, target);
    else {
      app.db.run('UPDATE group_members SET rank = ? WHERE group_id = ? AND account_id = ?', rank, g.id, target);
      if (cur === 'pending') notify(target, { type: 'group', title: `You joined ${g.name}`, body: 'Your join request was accepted.', data: { groupId: g.id } });
    }
    return { ok: true };
  });

  r.get('/api/groups/:id/posts', (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 30 });
    const rows = app.db.all('SELECT * FROM group_posts WHERE group_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', g.id, limit + 1, offset);
    const cards = new Map(cardsList(rows.map((p) => p.account_id), { viewerId: ctx.account?.id }).map((c) => [c.id, c]));
    return page(rows.map((p) => ({ id: p.id, body: p.body, createdAt: p.created_at, author: cards.get(p.account_id) ?? null })), limit, offset);
  });

  r.post('/api/groups/:id/posts', requireActiveAccount, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    requireRank(g.id, ctx.account.id, ['owner', 'admin', 'member']);
    const { body } = check(v.object({ body: v.string({ min: 1, max: 500, multiline: true }) }), ctx.body);
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`grouppost:${ctx.account.id}`, 10, 60_000, 'Posting too fast');
    const id = app.db.run('INSERT INTO group_posts (group_id, account_id, body, created_at) VALUES (?, ?, ?, ?)', g.id, ctx.account.id, body, now()).id;
    ctx.status = 201;
    return { id, body, createdAt: now(), author: cardsList([ctx.account.id])[0] };
  });

  r.delete('/api/groups/:id/posts/:postId', requireAuth, (ctx) => {
    const g = requireGroup(Number(ctx.params.id));
    const p = app.db.get('SELECT * FROM group_posts WHERE id = ? AND group_id = ?', Number(ctx.params.postId), g.id);
    if (!p) throw E.notFound('Post not found');
    if (p.account_id !== ctx.account.id) requireRank(g.id, ctx.account.id, ['owner', 'admin']);
    app.db.run('DELETE FROM group_posts WHERE id = ?', p.id);
    return { ok: true };
  });
}
