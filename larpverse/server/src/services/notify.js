import { app } from '../app.js';
import { now, parseJson, toJson } from '../util.js';

export const NOTIFICATION_TYPES = [
  'friend_request', 'friend_accept', 'follow', 'purchase', 'sale', 'reward', 'badge',
  'group', 'game_invite', 'event', 'announcement', 'system', 'security',
];

const ALWAYS = new Set(['system', 'security']);

export function notify(accountId, { type, title, body = '', data = {}, actorId = null, scripted = false, force = false, at }) {
  const { db } = app;
  if (!force && !ALWAYS.has(type)) {
    const prefs = parseJson(db.value('SELECT notifications FROM account_settings WHERE account_id = ?', accountId), {});
    if (prefs[type] === false) return null;
  }
  return db.run(
    `INSERT INTO notifications (account_id, type, title, body, data, actor_account_id, is_scripted, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    accountId, type, String(title).slice(0, 140), String(body).slice(0, 600), toJson(data), actorId, scripted ? 1 : 0, at ?? now(),
  ).id;
}

export function unreadCount(accountId) {
  return app.db.value('SELECT COUNT(*) AS n FROM notifications WHERE account_id = ? AND read_at IS NULL', accountId) ?? 0;
}

/** Queue delayed work (scripted notifications, timed events). Processed by the job worker. */
export function schedule(kind, payload, delayMs) {
  return app.db.run('INSERT INTO scheduled_jobs (run_at, kind, payload, created_at) VALUES (?, ?, ?, ?)',
    now() + Math.max(0, delayMs), kind, toJson(payload), now()).id;
}
