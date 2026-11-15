import { app } from '../app.js';
import { audit } from '../audit.js';
import { E } from '../http.js';
import { GAME_EVENT_TYPES } from '../game/engine.js';
import { now, parseJson, toJson } from '../util.js';
import { assignBadge } from './badges.js';
import { grantItem } from './inventory.js';
import { notify, NOTIFICATION_TYPES, schedule } from './notify.js';
import { credit, debit } from './wallet.js';

export const PLATFORM_EVENT_TYPES = [
  'notification', 'scripted_transaction', 'marketplace_drop', 'profile_announcement', 'group_event',
  'follower_surge', 'friend_request_wave', 'reward',
];

export const EVENT_TYPES = { platform: PLATFORM_EVENT_TYPES, game: GAME_EVENT_TYPES };

function randomFictional(excludeId, n) {
  return app.db.all("SELECT id, display_name FROM accounts WHERE is_fictional = 1 AND status = 'active' AND id != ? ORDER BY random() LIMIT ?", excludeId, n);
}

/** Raises a displayed statistic by `by`. Real rows just added are part of `by`, not on top of it. */
function bumpOverride(accountId, key, by, realAdded = 0) {
  const { db } = app;
  const overrides = parseJson(db.value('SELECT stat_overrides FROM profiles WHERE account_id = ?', accountId), {});
  const realCounts = {
    followers: db.value('SELECT COUNT(*) FROM follows WHERE followee_id = ?', accountId),
    following: db.value('SELECT COUNT(*) FROM follows WHERE follower_id = ?', accountId),
  };
  overrides[key] = Number.isInteger(overrides[key]) ? overrides[key] + by : (realCounts[key] ?? 0) - realAdded + by;
  db.run('UPDATE profiles SET stat_overrides = ? WHERE account_id = ?', toJson(overrides), accountId);
  return overrides[key];
}

function platformEffect(type, params, targets, ctx) {
  const { db } = app;
  const details = [];
  const needTargets = () => { if (!targets.length) throw E.bad('Pick at least one target account'); };
  switch (type) {
    case 'notification': {
      needTargets();
      const ntype = NOTIFICATION_TYPES.includes(params.type) ? params.type : 'system';
      const delayMs = Math.max(0, Number(params.delaySeconds ?? 0) * 1000);
      for (const id of targets) {
        const payload = { accountId: id, type: ntype, title: String(params.title ?? 'Notification').slice(0, 140), body: String(params.body ?? '').slice(0, 600), actorId: params.actorAccountId ?? null, data: params.data ?? {}, scripted: true };
        if (delayMs > 0) schedule('notification', payload, delayMs);
        else notify(id, { ...payload, force: true });
        details.push({ accountId: id, scheduled: delayMs > 0 });
      }
      break;
    }
    case 'scripted_transaction': {
      needTargets();
      const amount = Math.trunc(Number(params.amount ?? 0));
      if (!amount) throw E.bad('Set a non-zero amount');
      const description = String(params.description ?? (amount > 0 ? 'Roleplay payout' : 'Roleplay charge')).slice(0, 200);
      for (const id of targets) {
        try {
          const res = amount > 0
            ? credit(id, amount, { type: 'scripted', description, scripted: true, userId: ctx?.user?.id })
            : debit(id, -amount, { type: 'scripted', description, scripted: true, userId: ctx?.user?.id });
          if (params.notify !== false) {
            notify(id, { type: 'reward', title: params.notifyTitle ?? (amount > 0 ? `You received ${amount.toLocaleString('en-US')} Sparks` : `${(-amount).toLocaleString('en-US')} Sparks were charged`), body: `${description} · fictional roleplay currency`, scripted: true, force: true });
          }
          details.push({ accountId: id, balance: res.balance });
        } catch (e) {
          details.push({ accountId: id, error: e.message });
        }
      }
      break;
    }
    case 'marketplace_drop': {
      const ids = [...(params.itemIds ?? []), ...db.all(`SELECT id FROM items WHERE sku IN (SELECT value FROM json_each(?))`, toJson(params.itemSkus ?? [])).map((r) => r.id)];
      if (!ids.length) throw E.bad('Pick the items to drop');
      for (const id of ids) {
        const item = db.get('SELECT * FROM items WHERE id = ?', id);
        if (!item) continue;
        db.run('UPDATE items SET on_sale = 1, is_archived = 0, is_featured = ?, price = ?, stock = ?, updated_at = ? WHERE id = ?',
          params.feature === false ? item.is_featured : 1, Number.isInteger(params.price) ? params.price : item.price,
          params.stock === undefined ? item.stock : params.stock, now(), id);
        details.push({ itemId: id, name: item.name });
      }
      const audience = params.notifyAll ? db.all("SELECT id FROM accounts WHERE status = 'active'").map((r) => r.id) : targets;
      for (const acc of audience) {
        notify(acc, { type: 'announcement', title: params.title ?? `New marketplace drop: ${details.map((d) => d.name).join(', ')}`.slice(0, 140), body: params.body ?? 'Available now for fictional Sparks.', data: { itemId: details[0]?.itemId }, scripted: true });
      }
      break;
    }
    case 'profile_announcement': {
      needTargets();
      const text = String(params.text ?? '').slice(0, 280);
      for (const id of targets) {
        db.run('UPDATE profiles SET announcement = ? WHERE account_id = ?', text || null, id);
        if (params.statusText !== undefined) db.run('UPDATE profiles SET status_text = ? WHERE account_id = ?', String(params.statusText).slice(0, 80), id);
        let notified = 0;
        if (text && params.notifyFollowers !== false) {
          const name = db.value('SELECT display_name FROM accounts WHERE id = ?', id);
          for (const f of db.all('SELECT follower_id FROM follows WHERE followee_id = ? LIMIT 500', id)) {
            notify(f.follower_id, { type: 'announcement', title: `${name} posted an announcement`, body: text, actorId: id, data: { accountId: id }, scripted: true });
            notified++;
          }
        }
        details.push({ accountId: id, notified });
      }
      break;
    }
    case 'group_event': {
      const g = db.get('SELECT * FROM user_groups WHERE id = ?', Number(params.groupId));
      if (!g) throw E.bad('Pick a group');
      const shout = String(params.shout ?? '').slice(0, 255);
      if (shout) db.run('UPDATE user_groups SET shout = ?, shout_at = ? WHERE id = ?', shout, now(), g.id);
      if (params.post) db.run('INSERT INTO group_posts (group_id, account_id, body, created_at) VALUES (?, ?, ?, ?)', g.id, g.owner_account_id, String(params.post).slice(0, 500), now());
      if (Number.isInteger(params.memberCount)) db.run('UPDATE user_groups SET member_count_override = ? WHERE id = ?', params.memberCount, g.id);
      let notified = 0;
      if (params.notifyMembers !== false && (shout || params.post)) {
        for (const m of db.all("SELECT account_id FROM group_members WHERE group_id = ? AND rank != 'pending'", g.id)) {
          notify(m.account_id, { type: 'group', title: `${g.name}: ${params.title ?? 'group event'}`, body: shout || String(params.post), data: { groupId: g.id }, scripted: true });
          notified++;
        }
      }
      details.push({ groupId: g.id, notified });
      break;
    }
    case 'follower_surge': {
      needTargets();
      const count = Math.max(1, Math.min(10_000_000, Math.trunc(Number(params.count ?? 100))));
      const realFollows = Math.max(0, Math.min(25, Math.trunc(Number(params.realFollows ?? 5))));
      for (const id of targets) {
        let added = 0;
        for (const f of randomFictional(id, realFollows)) {
          if (db.run('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', f.id, id, now()).changes) {
            added++;
            if (params.notify !== false) notify(id, { type: 'follow', title: `${f.display_name} started following you`, actorId: f.id, data: { accountId: f.id }, scripted: true });
          }
        }
        const total = bumpOverride(id, 'followers', Math.max(count, added), added);
        details.push({ accountId: id, realFollowsAdded: added, displayedFollowers: total });
      }
      break;
    }
    case 'friend_request_wave': {
      needTargets();
      const count = Math.max(1, Math.min(20, Math.trunc(Number(params.count ?? 3))));
      for (const id of targets) {
        let sent = 0;
        for (const f of randomFictional(id, count * 2)) {
          if (sent >= count) break;
          const [a, b] = f.id < id ? [f.id, id] : [id, f.id];
          if (db.get('SELECT 1 FROM friendships WHERE account_a = ? AND account_b = ?', a, b)) continue;
          db.run("INSERT INTO friendships (account_a, account_b, requester_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)", a, b, f.id, now());
          notify(id, { type: 'friend_request', title: `${f.display_name} sent you a friend request`, actorId: f.id, data: { accountId: f.id }, scripted: true });
          sent++;
        }
        details.push({ accountId: id, sent });
      }
      break;
    }
    case 'reward': {
      needTargets();
      const sparks = Math.max(0, Math.trunc(Number(params.sparks ?? 0)));
      const item = params.itemSku ? db.get('SELECT id, name FROM items WHERE sku = ?', params.itemSku) : (params.itemId ? db.get('SELECT id, name FROM items WHERE id = ?', params.itemId) : null);
      for (const id of targets) {
        const got = [];
        if (sparks) { credit(id, sparks, { type: 'event_reward', description: params.description ?? 'Event reward', scripted: true, userId: ctx?.user?.id }); got.push(`${sparks.toLocaleString('en-US')} Sparks`); }
        if (item && grantItem(id, item.id, { source: 'reward', allowSoldOut: true }).length) got.push(item.name);
        if (params.badgeKey) {
          try { assignBadge(id, String(params.badgeKey), { userId: ctx?.user?.id, labelOverride: params.badgeLabel ?? null }); got.push('a badge'); } catch (e) { details.push({ accountId: id, badgeError: e.message }); }
        }
        notify(id, { type: 'reward', title: params.title ?? 'You received a reward!', body: params.body ?? (got.length ? `${got.join(', ')} · roleplay reward` : 'Roleplay reward'), scripted: true, force: true });
        details.push({ accountId: id, rewards: got });
      }
      break;
    }
    default:
      throw E.bad('Unknown platform event type');
  }
  return details;
}

/** Runs a stored (or ad-hoc) scripted event. Platform events apply atomically. */
export function runEvent(ev, { ctx, accountIds = [], sessionId = null, overrides = {} }) {
  const { db } = app;
  const params = { ...parseJson(ev.params, {}), ...overrides };
  const targets = [...new Set(accountIds.map(Number).filter(Boolean))];
  for (const id of targets) if (!db.get('SELECT 1 FROM accounts WHERE id = ?', id)) throw E.bad(`Account ${id} does not exist`);
  let result;
  if (ev.scope === 'game') {
    if (!sessionId) throw E.bad('Pick the LARP session to run this event in');
    result = app.game.triggerEvent(sessionId, ev.type, params, { accountId: ctx?.account?.id ?? null, userId: ctx?.user?.id ?? null });
  } else {
    result = db.tx(() => ({ details: platformEffect(ev.type, params, targets, ctx) }));
  }
  if (ev.id) {
    db.run('UPDATE scripted_events SET run_count = run_count + 1, last_run_at = ? WHERE id = ?', now(), ev.id);
    db.run('INSERT INTO event_runs (event_id, triggered_by_user_id, target, result, created_at) VALUES (?, ?, ?, ?, ?)',
      ev.id, ctx?.user?.id ?? null, toJson({ accountIds: targets, sessionId }), toJson(result).slice(0, 20000), now());
  }
  audit(ctx, 'event.run', 'event', ev.id ?? null, { type: ev.type, scope: ev.scope, accountIds: targets, sessionId, overrides });
  return result;
}

export function eventView(e) {
  return {
    id: e.id, name: e.name, description: e.description, scope: e.scope, type: e.type, params: parseJson(e.params, {}),
    runCount: e.run_count, lastRunAt: e.last_run_at, createdAt: e.created_at, updatedAt: e.updated_at,
  };
}
