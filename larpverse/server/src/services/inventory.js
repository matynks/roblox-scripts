import { app } from '../app.js';
import { E } from '../http.js';
import { now, parseJson } from '../util.js';
import { fileUrl } from './files.js';

export function itemView(i, extra = {}) {
  const remaining = i.stock == null ? null : Math.max(0, i.stock - i.sold_count);
  return {
    id: i.id,
    sku: i.sku,
    name: i.name,
    description: i.description,
    category: i.category,
    slot: i.slot,
    asset: parseJson(i.asset, {}),
    price: i.price,
    rarity: i.rarity,
    isLimited: Boolean(i.is_limited),
    stock: i.stock,
    remaining,
    soldCount: i.sold_count,
    onSale: Boolean(i.on_sale) && !i.is_archived && remaining !== 0,
    isFeatured: Boolean(i.is_featured),
    isArchived: Boolean(i.is_archived),
    creatorId: i.creator_account_id,
    thumbnail: fileUrl(i.thumbnail_file_id),
    tags: parseJson(i.tags, []),
    bundleItemIds: parseJson(i.bundle_item_ids, []),
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    ...extra,
  };
}

function history(accountId, itemId, action, source, details) {
  app.db.run('INSERT INTO inventory_history (account_id, item_id, action, source, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    accountId, itemId, action, source ?? null, details ?? null, now());
}

/**
 * Adds an item (and, for bundles, every contained item) to an inventory. Limited items get the
 * next serial number and consume stock; `allowSoldOut` lets staff grant past the stock cap.
 * Returns ids of items newly added.
 */
export function grantItem(accountId, itemId, { source, sourceRef = null, allowSoldOut = false, consumeStock = true } = {}) {
  const { db } = app;
  return db.tx(() => {
    const item = db.get('SELECT * FROM items WHERE id = ?', itemId);
    if (!item) throw E.notFound('Item not found');
    const added = [];
    if (!db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', accountId, itemId)) {
      let serial = null;
      if (item.is_limited && consumeStock) {
        const r = db.run('UPDATE items SET sold_count = sold_count + 1 WHERE id = ? AND (stock IS NULL OR sold_count < stock OR ?)', itemId, allowSoldOut ? 1 : 0);
        if (!r.changes) throw E.conflict(`${item.name} is sold out`, 'sold_out');
        serial = db.value('SELECT sold_count FROM items WHERE id = ?', itemId);
      }
      db.run('INSERT INTO inventory (account_id, item_id, source, source_ref, serial_number, acquired_at) VALUES (?, ?, ?, ?, ?, ?)',
        accountId, itemId, source, sourceRef, serial, now());
      history(accountId, itemId, 'acquired', source, serial ? `Serial #${serial}` : null);
      added.push(itemId);
    }
    if (item.category === 'bundle') {
      for (const childId of parseJson(item.bundle_item_ids, [])) {
        if (childId === itemId) continue;
        if (!db.get('SELECT 1 FROM items WHERE id = ?', childId)) continue;
        if (db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', accountId, childId)) continue;
        db.run('INSERT INTO inventory (account_id, item_id, source, source_ref, acquired_at) VALUES (?, ?, ?, ?, ?)',
          accountId, childId, 'bundle', itemId, now());
        history(accountId, childId, 'acquired', 'bundle', `From ${item.name}`);
        added.push(childId);
      }
    }
    return added;
  });
}

/** Removes an item from an inventory and from the avatar. Bundle children granted with it go too. */
export function revokeItem(accountId, itemId, { reason = 'revoked' } = {}) {
  const { db } = app;
  return db.tx(() => {
    const removed = [];
    const drop = (id) => {
      if (db.run('DELETE FROM inventory WHERE account_id = ? AND item_id = ?', accountId, id).changes) {
        db.run('DELETE FROM avatar_equipped WHERE account_id = ? AND item_id = ?', accountId, id);
        history(accountId, id, reason, null, null);
        removed.push(id);
      }
    };
    drop(itemId);
    for (const child of db.all("SELECT item_id FROM inventory WHERE account_id = ? AND source = 'bundle' AND source_ref = ?", accountId, itemId)) {
      drop(child.item_id);
    }
    return removed;
  });
}
