import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { cardsList, requireAccount, settingsOf, visibleTo } from '../services/accounts.js';
import { notify } from '../services/notify.js';
import { now, page, paginate, parseJson } from '../util.js';

const MAX_FRIENDS = 500;

function pair(x, y) {
  return x < y ? [x, y] : [y, x];
}

function listGuard(ctx, ownerId) {
  const settings = settingsOf(ownerId);
  const isStaff = Boolean(ctx.perms?.has('accounts.view'));
  if (!visibleTo(settings.privacy.profileVisibility, ownerId, ctx.account?.id ?? null, isStaff)) {
    throw E.forbidden('This profile is private');
  }
  return { viewerId: ctx.account?.id ?? null, isStaff };
}

export default function register(r) {
  r.get('/api/accounts/:id/friends', (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const opts = listGuard(ctx, id);
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 50 });
    const ids = app.db.all(
      `SELECT CASE WHEN account_a = ? THEN account_b ELSE account_a END AS fid FROM friendships
        WHERE status = 'accepted' AND (account_a = ? OR account_b = ?) ORDER BY responded_at DESC LIMIT ? OFFSET ?`,
      id, id, id, limit + 1, offset).map((x) => x.fid);
    const result = page(cardsList(ids, opts), limit, offset);
    const order = { in_experience: 0, online: 1, offline: 2 };
    result.items.sort((a, b) => order[a.presence.status] - order[b.presence.status]);
    return result;
  });

  r.get('/api/accounts/:id/followers', (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const opts = listGuard(ctx, id);
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 50 });
    const ids = app.db.all('SELECT follower_id AS x FROM follows WHERE followee_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', id, limit + 1, offset).map((r) => r.x);
    return page(cardsList(ids, opts), limit, offset);
  });

  r.get('/api/accounts/:id/following', (ctx) => {
    const id = requireAccount(Number(ctx.params.id)).id;
    const opts = listGuard(ctx, id);
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 50 });
    const ids = app.db.all('SELECT followee_id AS x FROM follows WHERE follower_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', id, limit + 1, offset).map((r) => r.x);
    return page(cardsList(ids, opts), limit, offset);
  });

  r.get('/api/social/requests', requireAuth, (ctx) => {
    const me = ctx.account.id;
    const rows = app.db.all("SELECT * FROM friendships WHERE status = 'pending' AND (account_a = ? OR account_b = ?) ORDER BY created_at DESC", me, me);
    const incoming = rows.filter((f) => f.requester_id !== me);
    const outgoing = rows.filter((f) => f.requester_id === me);
    const other = (f) => (f.account_a === me ? f.account_b : f.account_a);
    const cards = new Map(cardsList(rows.map(other), { viewerId: me }).map((c) => [c.id, c]));
    const view = (f) => ({ id: f.id, createdAt: f.created_at, account: cards.get(other(f)) });
    return { incoming: incoming.map(view).filter((x) => x.account), outgoing: outgoing.map(view).filter((x) => x.account) };
  });

  r.post('/api/social/friends/:id/request', requireActiveAccount, (ctx) => {
    const me = ctx.account.id;
    const target = requireAccount(Number(ctx.params.id));
    if (target.id === me) throw E.bad('You cannot friend yourself');
    if (target.status !== 'active') throw E.notFound('Account not found');
    const { db } = app;
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`friendreq:${me}`, 60, 3600_000, 'You have sent a lot of friend requests. Try again later.');
    return db.tx(() => {
      const [a, b] = pair(me, target.id);
      const existing = db.get('SELECT * FROM friendships WHERE account_a = ? AND account_b = ?', a, b);
      if (existing?.status === 'accepted') return { status: 'friends' };
      if (existing && existing.requester_id === me) return { status: 'outgoing' };
      if (existing) {
        // They already asked us: accepting is the natural result.
        db.run("UPDATE friendships SET status = 'accepted', responded_at = ? WHERE id = ?", now(), existing.id);
        notify(target.id, { type: 'friend_accept', title: `${ctx.account.display_name} accepted your friend request`, actorId: me, data: { accountId: me } });
        return { status: 'friends' };
      }
      if (settingsOf(target.id).privacy.friendRequests === 'nobody') throw E.forbidden('This person is not accepting friend requests', 'requests_closed');
      const count = db.value("SELECT COUNT(*) FROM friendships WHERE status = 'accepted' AND (account_a = ? OR account_b = ?)", me, me);
      if (count >= MAX_FRIENDS) throw E.conflict(`You can have up to ${MAX_FRIENDS} friends`);
      db.run("INSERT INTO friendships (account_a, account_b, requester_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)", a, b, me, now());
      notify(target.id, { type: 'friend_request', title: `${ctx.account.display_name} sent you a friend request`, actorId: me, data: { accountId: me } });
      return { status: 'outgoing' };
    });
  });

  r.post('/api/social/requests/:id/accept', requireActiveAccount, (ctx) => {
    const me = ctx.account.id;
    const f = app.db.get("SELECT * FROM friendships WHERE id = ? AND status = 'pending'", Number(ctx.params.id));
    if (!f || (f.account_a !== me && f.account_b !== me) || f.requester_id === me) throw E.notFound('Request not found');
    app.db.run("UPDATE friendships SET status = 'accepted', responded_at = ? WHERE id = ?", now(), f.id);
    notify(f.requester_id, { type: 'friend_accept', title: `${ctx.account.display_name} accepted your friend request`, actorId: me, data: { accountId: me } });
    return { status: 'friends' };
  });

  r.post('/api/social/requests/:id/decline', requireAuth, (ctx) => {
    const me = ctx.account.id;
    const f = app.db.get("SELECT * FROM friendships WHERE id = ? AND status = 'pending'", Number(ctx.params.id));
    if (!f || (f.account_a !== me && f.account_b !== me)) throw E.notFound('Request not found');
    app.db.run('DELETE FROM friendships WHERE id = ?', f.id);
    return { status: 'none' };
  });

  /** Unfriend, or cancel an outgoing request. */
  r.delete('/api/social/friends/:id', requireAuth, (ctx) => {
    const [a, b] = pair(ctx.account.id, Number(ctx.params.id));
    app.db.run('DELETE FROM friendships WHERE account_a = ? AND account_b = ?', a, b);
    return { status: 'none' };
  });

  r.post('/api/social/follow/:id', requireActiveAccount, (ctx) => {
    const me = ctx.account.id;
    const target = requireAccount(Number(ctx.params.id));
    if (target.id === me) throw E.bad('You cannot follow yourself');
    if (!settingsOf(target.id).privacy.allowFollow) throw E.forbidden('This person does not allow followers', 'follow_closed');
    const r1 = app.db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', me, target.id, now());
    if (r1.changes) notify(target.id, { type: 'follow', title: `${ctx.account.display_name} started following you`, actorId: me, data: { accountId: me } });
    return { following: true };
  });

  r.delete('/api/social/follow/:id', requireAuth, (ctx) => {
    app.db.run('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', ctx.account.id, Number(ctx.params.id));
    return { following: false };
  });

  /** Friends activity: presence plus a recent feed of public actions by friends. */
  r.get('/api/social/activity', requireAuth, (ctx) => {
    const me = ctx.account.id;
    const { db } = app;
    const friendIds = db.all(
      `SELECT CASE WHEN account_a = ? THEN account_b ELSE account_a END AS fid FROM friendships
        WHERE status = 'accepted' AND (account_a = ? OR account_b = ?)`, me, me, me).map((x) => x.fid);
    if (friendIds.length === 0) return { friends: [], feed: [] };
    const ph = friendIds.map(() => '?').join(',');
    const cards = cardsList(friendIds, { viewerId: me });
    const order = { in_experience: 0, online: 1, offline: 2 };
    cards.sort((a, b) => order[a.presence.status] - order[b.presence.status]);
    const feed = [];
    for (const p of db.all(
      `SELECT p.account_id, p.created_at, i.id, i.name, i.asset, i.rarity, i.category FROM purchases p JOIN items i ON i.id = p.item_id
        WHERE p.account_id IN (${ph}) AND p.status = 'completed' ORDER BY p.id DESC LIMIT 15`, ...friendIds)) {
      feed.push({ kind: 'purchase', accountId: p.account_id, at: p.created_at, item: { id: p.id, name: p.name, asset: parseJson(p.asset, {}), rarity: p.rarity, category: p.category } });
    }
    for (const h of db.all(
      `SELECT ph.account_id, ph.started_at, e.id, e.name, e.art FROM play_history ph JOIN experiences e ON e.id = ph.experience_id
        WHERE ph.account_id IN (${ph}) ORDER BY ph.id DESC LIMIT 15`, ...friendIds)) {
      feed.push({ kind: 'played', accountId: h.account_id, at: h.started_at, experience: { id: h.id, name: h.name, art: parseJson(h.art, {}) } });
    }
    for (const b of db.all(
      `SELECT ab.account_id, ab.awarded_at, b.name, b.icon, b.color, b.kind FROM account_badges ab JOIN badges b ON b.id = ab.badge_id
        WHERE ab.account_id IN (${ph}) AND b.kind != 'system' ORDER BY ab.awarded_at DESC LIMIT 10`, ...friendIds)) {
      feed.push({ kind: 'badge', accountId: b.account_id, at: b.awarded_at, badge: { name: b.name, icon: b.icon, color: b.color } });
    }
    feed.sort((a, b) => b.at - a.at);
    const cardMap = new Map(cards.map((c) => [c.id, c]));
    return { friends: cards, feed: feed.slice(0, 25).map((f) => ({ ...f, account: cardMap.get(f.accountId) })) };
  });
}
