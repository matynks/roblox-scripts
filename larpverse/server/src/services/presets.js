import { app } from '../app.js';
import { E } from '../http.js';
import { now, parseJson, toJson } from '../util.js';
import { v, check } from '../validate.js';
import { applyLook, getAvatar } from './avatar.js';
import { assignBadge } from './badges.js';
import { grantItem, revokeItem } from './inventory.js';
import { notify, NOTIFICATION_TYPES, schedule } from './notify.js';
import { credit, debit, getBalance, setBalance } from './wallet.js';

export const PRESET_KINDS = [
  'new_account', 'experienced', 'verified', 'collector', 'high_balance', 'rare_showcase', 'marketplace_demo', 'larp_session', 'custom',
];

const colors = v.object({
  head: v.color().optional(), torso: v.color().optional(), leftArm: v.color().optional(),
  rightArm: v.color().optional(), leftLeg: v.color().optional(), rightLeg: v.color().optional(),
}, { strict: true });

/** Portable preset format: items/badges are referenced by sku/key so presets move between servers. */
export const presetDataSchema = v.object({
  version: v.int({ min: 1, max: 1 }).default(1),
  profile: v.object({
    displayName: v.string({ min: 1, max: 30 }).optional(),
    bio: v.string({ max: 1000, multiline: true }).optional(),
    statusText: v.string({ max: 80 }).optional(),
    bannerColor: v.color().optional(),
    announcement: v.string({ max: 280 }).nullable().optional(),
    showcaseSkus: v.array(v.string({ max: 60 }), { max: 12 }).optional(),
  }).optional(),
  balance: v.int({ min: 0, max: 1_000_000_000_000 }).optional(),
  statOverrides: v.object({
    followers: v.int({ min: 0, max: 1e10 }).nullable().optional(),
    following: v.int({ min: 0, max: 1e10 }).nullable().optional(),
    friends: v.int({ min: 0, max: 1e10 }).nullable().optional(),
    visits: v.int({ min: 0, max: 1e12 }).nullable().optional(),
    presence: v.enum(['online', 'in_experience', 'offline']).nullable().optional(),
  }).optional(),
  joinDateDaysAgo: v.int({ min: 0, max: 7000 }).nullable().optional(),
  badges: v.object({ mode: v.enum(['add', 'replace']).default('add'), keys: v.array(v.string({ max: 40 }), { max: 30 }) }).optional(),
  inventory: v.object({ mode: v.enum(['add', 'replace']).default('add'), skus: v.array(v.string({ max: 60 }), { max: 500 }) }).optional(),
  look: v.object({ bodyColors: colors.optional(), equippedSkus: v.array(v.string({ max: 60 }), { max: 40 }).optional() }).optional(),
  notifications: v.object({
    clear: v.bool().default(false),
    items: v.array(v.object({
      type: v.enum(NOTIFICATION_TYPES).default('system'),
      title: v.string({ min: 1, max: 140 }),
      body: v.string({ max: 600 }).default(''),
      delaySeconds: v.int({ min: 0, max: 86400 }).default(0),
    }), { max: 30 }).default([]),
  }).optional(),
  transactions: v.array(v.object({ amount: v.int({ min: -1e12, max: 1e12 }), description: v.string({ min: 1, max: 200 }) }), { max: 50 }).optional(),
  larpSession: v.object({
    experienceName: v.string({ max: 80 }).optional(),
    scenarioKey: v.string({ max: 40 }).optional(),
    name: v.string({ max: 50 }).optional(),
    extras: v.int({ min: 0, max: 20 }).default(0),
    start: v.bool().default(false),
  }).nullable().optional(),
});

export function presetView(p) {
  return { id: p.id, name: p.name, kind: p.kind, description: p.description, data: parseJson(p.data, {}), createdAt: p.created_at, updatedAt: p.updated_at };
}

/** Captures an account's current presentation as preset data. */
export function snapshotAccount(accountId) {
  const { db } = app;
  const acc = db.get('SELECT * FROM accounts WHERE id = ?', accountId);
  if (!acc) throw E.notFound('Account not found');
  const p = db.get('SELECT * FROM profiles WHERE account_id = ?', accountId);
  const avatar = getAvatar(accountId);
  const skuOf = new Map(db.all('SELECT id, sku FROM items').map((i) => [i.id, i.sku]));
  const overrides = parseJson(p.stat_overrides, {});
  return {
    version: 1,
    profile: {
      displayName: acc.display_name, bio: p.bio, statusText: p.status_text, bannerColor: p.banner_color, announcement: p.announcement,
      showcaseSkus: parseJson(p.showcase_item_ids, []).map((id) => skuOf.get(id)).filter(Boolean),
    },
    balance: getBalance(accountId),
    statOverrides: Object.fromEntries(['followers', 'following', 'friends', 'visits', 'presence'].filter((k) => overrides[k] !== undefined).map((k) => [k, overrides[k]])),
    joinDateDaysAgo: p.join_date_override ? Math.round((now() - p.join_date_override) / 86400_000) : null,
    badges: { mode: 'replace', keys: db.all("SELECT b.key FROM account_badges ab JOIN badges b ON b.id = ab.badge_id WHERE ab.account_id = ? AND b.kind != 'system'", accountId).map((b) => b.key) },
    inventory: { mode: 'replace', skus: db.all('SELECT item_id FROM inventory WHERE account_id = ?', accountId).map((r) => skuOf.get(r.item_id)).filter(Boolean) },
    look: { bodyColors: avatar.bodyColors, equippedSkus: avatar.equipped.map((e) => skuOf.get(e.itemId)).filter(Boolean) },
  };
}

/**
 * Applies preset data to an account in one transaction. Returns a report of what changed and
 * anything skipped (unknown skus, badges that require real staff permissions, etc.).
 */
export function applyPreset(accountId, rawData, { userId = null, presetName = 'preset' } = {}) {
  const data = check(presetDataSchema, rawData);
  const { db } = app;
  const report = { skipped: [], session: null };
  db.tx(() => {
    if (!db.get('SELECT 1 FROM accounts WHERE id = ?', accountId)) throw E.notFound('Account not found');
    const pr = data.profile;
    if (pr) {
      if (pr.displayName) db.run('UPDATE accounts SET display_name = ?, updated_at = ? WHERE id = ?', pr.displayName, now(), accountId);
      if (pr.bio !== undefined) db.run('UPDATE profiles SET bio = ? WHERE account_id = ?', pr.bio, accountId);
      if (pr.statusText !== undefined) db.run('UPDATE profiles SET status_text = ? WHERE account_id = ?', pr.statusText, accountId);
      if (pr.bannerColor) db.run('UPDATE profiles SET banner_color = ? WHERE account_id = ?', pr.bannerColor, accountId);
      if (pr.announcement !== undefined) db.run('UPDATE profiles SET announcement = ? WHERE account_id = ?', pr.announcement, accountId);
    }
    if (data.statOverrides) {
      const cur = parseJson(db.value('SELECT stat_overrides FROM profiles WHERE account_id = ?', accountId), {});
      for (const [k, val] of Object.entries(data.statOverrides)) { if (val === null) delete cur[k]; else cur[k] = val; }
      db.run('UPDATE profiles SET stat_overrides = ? WHERE account_id = ?', toJson(cur), accountId);
    }
    if (data.joinDateDaysAgo !== undefined) {
      db.run('UPDATE profiles SET join_date_override = ? WHERE account_id = ?', data.joinDateDaysAgo === null ? null : now() - data.joinDateDaysAgo * 86400_000, accountId);
    }
    if (data.badges) {
      if (data.badges.mode === 'replace') db.run("DELETE FROM account_badges WHERE account_id = ? AND badge_id IN (SELECT id FROM badges WHERE kind != 'system')", accountId);
      for (const key of data.badges.keys) {
        try { assignBadge(accountId, key, { userId }); } catch (e) { report.skipped.push({ badge: key, reason: e.message }); }
      }
    }
    if (data.inventory) {
      const wanted = new Map();
      for (const sku of data.inventory.skus) {
        const id = db.value('SELECT id FROM items WHERE sku = ?', sku);
        if (id) wanted.set(id, sku); else report.skipped.push({ sku, reason: 'unknown item' });
      }
      if (data.inventory.mode === 'replace') {
        for (const r of db.all('SELECT item_id FROM inventory WHERE account_id = ?', accountId)) {
          if (!wanted.has(r.item_id) && db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', accountId, r.item_id)) revokeItem(accountId, r.item_id, { reason: 'preset' });
        }
      }
      for (const id of wanted.keys()) grantItem(accountId, id, { source: 'preset', allowSoldOut: true });
    }
    if (data.look) {
      const itemIds = data.look.equippedSkus?.map((sku) => db.value('SELECT id FROM items WHERE sku = ?', sku)).filter(Boolean);
      const res = applyLook(accountId, { bodyColors: data.look.bodyColors, itemIds });
      for (const id of res.skipped) report.skipped.push({ equip: id, reason: 'not owned' });
    }
    if (pr?.showcaseSkus) {
      const owned = pr.showcaseSkus
        .map((sku) => db.value('SELECT i.id FROM items i JOIN inventory inv ON inv.item_id = i.id AND inv.account_id = ? WHERE i.sku = ?', accountId, sku))
        .filter(Boolean);
      db.run('UPDATE profiles SET showcase_item_ids = ? WHERE account_id = ?', toJson(owned), accountId);
    }
    for (const t of data.transactions ?? []) {
      if (t.amount > 0) credit(accountId, t.amount, { type: 'scripted', description: t.description, scripted: true, userId });
      else if (t.amount < 0) {
        try { debit(accountId, -t.amount, { type: 'scripted', description: t.description, scripted: true, userId }); } catch (e) { report.skipped.push({ transaction: t.description, reason: e.message }); }
      }
    }
    if (data.balance !== undefined) setBalance(accountId, data.balance, { type: 'admin_set', description: `Balance set by scenario preset "${presetName}"`, userId });
    if (data.notifications) {
      if (data.notifications.clear) db.run('DELETE FROM notifications WHERE account_id = ?', accountId);
      for (const n of data.notifications.items) {
        const payload = { accountId, type: n.type, title: n.title, body: n.body, scripted: true };
        if (n.delaySeconds > 0) schedule('notification', payload, n.delaySeconds * 1000);
        else notify(accountId, { ...payload, force: true });
      }
    }
  });
  if (data.larpSession) {
    const ls = data.larpSession;
    const exp = ls.experienceName
      ? db.get("SELECT id FROM experiences WHERE name = ? AND engine = 'larp'", ls.experienceName)
      : db.get("SELECT id FROM experiences WHERE engine = 'larp' AND status = 'public' ORDER BY is_featured DESC, visits DESC LIMIT 1");
    if (!exp) report.skipped.push({ larpSession: ls.experienceName, reason: 'experience not found' });
    else {
      const scenarioId = ls.scenarioKey ? db.value('SELECT id FROM scenarios WHERE key = ?', ls.scenarioKey) : undefined;
      const account = db.get('SELECT * FROM accounts WHERE id = ?', accountId);
      for (const s of db.all("SELECT id FROM larp_sessions WHERE host_account_id = ? AND status != 'ended'", accountId)) {
        app.game.control(s.id, 'end', accountId);
      }
      const session = app.game.createSession({ account, experienceId: exp.id, scenarioId: scenarioId ?? undefined, name: ls.name });
      for (const extra of db.all("SELECT * FROM accounts WHERE is_fictional = 1 AND status = 'active' AND id != ? ORDER BY random() LIMIT ?", accountId, ls.extras)) {
        try { app.game.addBot(session.id, extra, {}); } catch (e) { report.skipped.push({ extra: extra.username, reason: e.message }); }
      }
      if (ls.start) app.game.control(session.id, 'start', accountId);
      report.session = { id: session.id, experienceId: exp.id };
    }
  }
  return report;
}
