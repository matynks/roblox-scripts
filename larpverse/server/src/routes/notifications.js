import { app } from '../app.js';
import { requireAuth } from '../auth.js';
import { E } from '../http.js';
import { cardsList } from '../services/accounts.js';
import { unreadCount } from '../services/notify.js';
import { now, page, paginate, parseJson } from '../util.js';

export function notificationViews(rows, viewerId) {
  const cards = new Map(cardsList(rows.map((n) => n.actor_account_id).filter(Boolean), { viewerId }).map((c) => [c.id, c]));
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: parseJson(n.data, {}),
    actor: n.actor_account_id ? cards.get(n.actor_account_id) ?? null : null,
    read: Boolean(n.read_at),
    createdAt: n.created_at,
  }));
}

export default function register(r) {
  r.get('/api/notifications', requireAuth, (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 40 });
    const unreadOnly = ctx.query.unread === '1';
    const rows = app.db.all(
      `SELECT * FROM notifications WHERE account_id = ? ${unreadOnly ? 'AND read_at IS NULL' : ''} AND created_at <= ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      ctx.account.id, now(), limit + 1, offset);
    return { ...page(notificationViews(rows, ctx.account.id), limit, offset), unread: unreadCount(ctx.account.id) };
  });

  r.get('/api/notifications/unread-count', requireAuth, (ctx) => {
    const latest = app.db.get('SELECT id, title, body, type, created_at FROM notifications WHERE account_id = ? AND read_at IS NULL ORDER BY id DESC LIMIT 1', ctx.account.id);
    return { unread: unreadCount(ctx.account.id), latest: latest ? { id: latest.id, title: latest.title, body: latest.body, type: latest.type, createdAt: latest.created_at } : null };
  });

  r.post('/api/notifications/:id/read', requireAuth, (ctx) => {
    const n = app.db.run('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND account_id = ?', now(), Number(ctx.params.id), ctx.account.id).changes;
    if (!n) throw E.notFound('Notification not found');
    return { unread: unreadCount(ctx.account.id) };
  });

  r.post('/api/notifications/read-all', requireAuth, (ctx) => {
    app.db.run('UPDATE notifications SET read_at = ? WHERE account_id = ? AND read_at IS NULL', now(), ctx.account.id);
    return { unread: 0 };
  });

  r.delete('/api/notifications/:id', requireAuth, (ctx) => {
    app.db.run('DELETE FROM notifications WHERE id = ? AND account_id = ?', Number(ctx.params.id), ctx.account.id);
    return { unread: unreadCount(ctx.account.id) };
  });

  r.delete('/api/notifications', requireAuth, (ctx) => {
    app.db.run('DELETE FROM notifications WHERE account_id = ?', ctx.account.id);
    return { unread: 0 };
  });
}
