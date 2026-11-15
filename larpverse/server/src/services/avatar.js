import { app } from '../app.js';
import { E } from '../http.js';
import { now, parseJson, toJson } from '../util.js';

export const DEFAULT_BODY_COLORS = {
  head: '#f2c9a0', torso: '#4f7cff', leftArm: '#f2c9a0', rightArm: '#f2c9a0', leftLeg: '#2f3b52', rightLeg: '#2f3b52',
};
export const BODY_PARTS = Object.keys(DEFAULT_BODY_COLORS);
export const BODY_TYPES = ['classic', 'slim', 'chunky'];

/** Equip slots. Every slot holds one item except emotes, which fill an emote wheel. */
export const SLOTS = ['hat', 'hair', 'face', 'face_acc', 'neck', 'back', 'shoulder', 'waist', 'shirt', 'pants', 'aura', 'animation', 'emote'];
export const MAX_EMOTES = 8;

export function avatarSpecs(accountIds) {
  const out = new Map();
  if (accountIds.length === 0) return out;
  const ph = accountIds.map(() => '?').join(',');
  for (const a of app.db.all(`SELECT account_id, body_colors, body_type FROM avatars WHERE account_id IN (${ph})`, ...accountIds)) {
    out.set(a.account_id, { bodyColors: { ...DEFAULT_BODY_COLORS, ...parseJson(a.body_colors, {}) }, bodyType: a.body_type, items: [] });
  }
  const rows = app.db.all(
    `SELECT ae.account_id, ae.slot, i.id, i.asset FROM avatar_equipped ae JOIN items i ON i.id = ae.item_id
      WHERE ae.account_id IN (${ph}) AND ae.slot NOT IN ('emote')`,
    ...accountIds,
  );
  for (const r of rows) out.get(r.account_id)?.items.push({ id: r.id, slot: r.slot, ...parseJson(r.asset, {}) });
  for (const id of accountIds) if (!out.has(id)) out.set(id, { bodyColors: { ...DEFAULT_BODY_COLORS }, bodyType: 'classic', items: [] });
  return out;
}

export function getAvatar(accountId) {
  const { db } = app;
  const a = db.get('SELECT * FROM avatars WHERE account_id = ?', accountId);
  const equipped = db.all(
    `SELECT ae.slot, ae.equipped_at, i.id, i.name, i.category, i.rarity, i.asset
       FROM avatar_equipped ae JOIN items i ON i.id = ae.item_id WHERE ae.account_id = ? ORDER BY ae.equipped_at`,
    accountId,
  ).map((r) => ({ itemId: r.id, slot: r.slot, name: r.name, category: r.category, rarity: r.rarity, asset: parseJson(r.asset, {}) }));
  return {
    bodyColors: { ...DEFAULT_BODY_COLORS, ...parseJson(a?.body_colors, {}) },
    bodyType: a?.body_type ?? 'classic',
    equipped,
    updatedAt: a?.updated_at ?? null,
  };
}

export function equipItem(accountId, itemId) {
  const { db } = app;
  return db.tx(() => {
    const item = db.get('SELECT id, slot, name FROM items WHERE id = ?', itemId);
    if (!item) throw E.notFound('Item not found');
    if (!db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', accountId, itemId)) throw E.forbidden('You do not own this item', 'not_owned');
    if (!SLOTS.includes(item.slot)) throw E.bad(`${item.name} cannot be worn`);
    if (db.get('SELECT 1 FROM avatar_equipped WHERE account_id = ? AND item_id = ?', accountId, itemId)) return getAvatar(accountId);
    if (item.slot === 'emote') {
      const n = db.value("SELECT COUNT(*) FROM avatar_equipped WHERE account_id = ? AND slot = 'emote'", accountId);
      if (n >= MAX_EMOTES) throw E.conflict(`You can equip up to ${MAX_EMOTES} emotes`, 'emote_wheel_full');
    } else {
      for (const prev of db.all('SELECT item_id FROM avatar_equipped WHERE account_id = ? AND slot = ?', accountId, item.slot)) {
        db.run('DELETE FROM avatar_equipped WHERE account_id = ? AND item_id = ?', accountId, prev.item_id);
        historyRow(accountId, prev.item_id, 'unequipped');
      }
    }
    db.run('INSERT INTO avatar_equipped (account_id, item_id, slot, equipped_at) VALUES (?, ?, ?, ?)', accountId, itemId, item.slot, now());
    historyRow(accountId, itemId, 'equipped');
    touch(accountId);
    return getAvatar(accountId);
  });
}

export function unequipItem(accountId, itemId) {
  const { db } = app;
  return db.tx(() => {
    if (db.run('DELETE FROM avatar_equipped WHERE account_id = ? AND item_id = ?', accountId, itemId).changes) {
      historyRow(accountId, itemId, 'unequipped');
      touch(accountId);
    }
    return getAvatar(accountId);
  });
}

export function setBody(accountId, { bodyColors, bodyType }) {
  const { db } = app;
  const cur = getAvatar(accountId);
  const colors = { ...cur.bodyColors, ...(bodyColors ?? {}) };
  db.run('UPDATE avatars SET body_colors = ?, body_type = ?, updated_at = ? WHERE account_id = ?',
    toJson(colors), bodyType ?? cur.bodyType, now(), accountId);
  return getAvatar(accountId);
}

/** Default colors and the starter outfit (only items the account still owns). */
export function resetAvatar(accountId) {
  const { db } = app;
  return db.tx(() => {
    db.run('DELETE FROM avatar_equipped WHERE account_id = ?', accountId);
    db.run('UPDATE avatars SET body_colors = ?, body_type = ?, updated_at = ? WHERE account_id = ?', toJson(DEFAULT_BODY_COLORS), 'classic', now(), accountId);
    const starters = db.all(
      `SELECT i.id, i.slot FROM items i JOIN inventory inv ON inv.item_id = i.id AND inv.account_id = ?
        WHERE i.tags LIKE '%"starter"%' ORDER BY i.id`, accountId);
    const used = new Set();
    for (const s of starters) {
      if (!SLOTS.includes(s.slot) || (s.slot !== 'emote' && used.has(s.slot))) continue;
      used.add(s.slot);
      db.run('INSERT OR IGNORE INTO avatar_equipped (account_id, item_id, slot, equipped_at) VALUES (?, ?, ?, ?)', accountId, s.id, s.slot, now());
    }
    return getAvatar(accountId);
  });
}

/** Replace the whole look: colors + an exact list of owned item ids. Unowned ids are skipped. */
export function applyLook(accountId, { bodyColors, bodyType, itemIds }) {
  const { db } = app;
  return db.tx(() => {
    if (bodyColors || bodyType) setBody(accountId, { bodyColors, bodyType });
    if (Array.isArray(itemIds)) {
      db.run('DELETE FROM avatar_equipped WHERE account_id = ?', accountId);
      const skipped = [];
      for (const id of itemIds) {
        try { equipItem(accountId, id); } catch { skipped.push(id); }
      }
      return { avatar: getAvatar(accountId), skipped };
    }
    return { avatar: getAvatar(accountId), skipped: [] };
  });
}

export function outfitView(o) {
  const data = parseJson(o.data, {});
  return { id: o.id, name: o.name, bodyColors: data.bodyColors, bodyType: data.bodyType, itemIds: data.itemIds ?? [], createdAt: o.created_at, updatedAt: o.updated_at };
}

export function saveOutfit(accountId, name) {
  const { db } = app;
  if (db.value('SELECT COUNT(*) FROM outfits WHERE account_id = ?', accountId) >= 50) throw E.conflict('You can save up to 50 outfits');
  const cur = getAvatar(accountId);
  const data = { bodyColors: cur.bodyColors, bodyType: cur.bodyType, itemIds: cur.equipped.map((e) => e.itemId) };
  const t = now();
  const id = db.run('INSERT INTO outfits (account_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', accountId, name, toJson(data), t, t).id;
  return outfitView(db.get('SELECT * FROM outfits WHERE id = ?', id));
}

export function wearOutfit(accountId, outfitId) {
  const o = app.db.get('SELECT * FROM outfits WHERE id = ? AND account_id = ?', outfitId, accountId);
  if (!o) throw E.notFound('Outfit not found');
  const v = outfitView(o);
  return applyLook(accountId, v);
}

function historyRow(accountId, itemId, action) {
  app.db.run('INSERT INTO inventory_history (account_id, item_id, action, created_at) VALUES (?, ?, ?, ?)', accountId, itemId, action, now());
}

function touch(accountId) {
  app.db.run('UPDATE avatars SET updated_at = ? WHERE account_id = ?', now(), accountId);
}
