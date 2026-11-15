import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { cardsList } from '../services/accounts.js';
import { getConfig } from '../services/config.js';
import { grantItem, itemView } from '../services/inventory.js';
import { notify } from '../services/notify.js';
import { credit, debit } from '../services/wallet.js';
import { now, page, paginate } from '../util.js';
import { v, check } from '../validate.js';

export const CATEGORY_GROUPS = {
  all: null,
  clothing: ['shirt', 'pants'],
  accessories: ['accessory'],
  hats: ['hat'],
  hair: ['hair'],
  faces: ['face'],
  shirts: ['shirt'],
  pants: ['pants'],
  bundles: ['bundle'],
  animations: ['animation'],
  emotes: ['emote'],
  collectibles: ['collectible'],
  special: ['special'],
};

const RARITY_ORDER = "CASE rarity WHEN 'mythic' THEN 6 WHEN 'legendary' THEN 5 WHEN 'epic' THEN 4 WHEN 'rare' THEN 3 WHEN 'uncommon' THEN 2 ELSE 1 END";
const SORTS = {
  relevance: 'is_featured DESC, sold_count DESC, id DESC',
  newest: 'created_at DESC, id DESC',
  price_asc: 'price ASC, id',
  price_desc: 'price DESC, id',
  bestselling: 'sold_count DESC, id',
  rarity: `${RARITY_ORDER} DESC, price DESC`,
  favorited: '(SELECT COUNT(*) FROM item_favorites f WHERE f.item_id = items.id) DESC, id',
};

function ownedSet(accountId, ids) {
  if (!accountId || ids.length === 0) return new Set();
  return new Set(app.db.all(`SELECT item_id FROM inventory WHERE account_id = ? AND item_id IN (${ids.map(() => '?').join(',')})`, accountId, ...ids).map((r) => r.item_id));
}

export function itemsWithOwnership(rows, accountId) {
  const owned = ownedSet(accountId, rows.map((r) => r.id));
  return rows.map((r) => itemView(r, { owned: owned.has(r.id) }));
}

function queryItems(q, accountId, { includeArchived = false } = {}) {
  const where = [];
  const params = [];
  if (!includeArchived) where.push('is_archived = 0');
  const cats = CATEGORY_GROUPS[q.category ?? 'all'];
  if (q.category && cats === undefined) throw E.bad('Unknown category');
  if (cats) { where.push(`category IN (${cats.map(() => '?').join(',')})`); params.push(...cats); }
  if (q.slot) { where.push('slot = ?'); params.push(String(q.slot)); }
  if (q.q) {
    const like = `%${String(q.q).slice(0, 60).replace(/[%_]/g, (m) => `\\${m}`)}%`;
    where.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  if (q.rarity) { where.push('rarity = ?'); params.push(String(q.rarity)); }
  if (q.minPrice) { where.push('price >= ?'); params.push(Number(q.minPrice) || 0); }
  if (q.maxPrice) { where.push('price <= ?'); params.push(Number(q.maxPrice) || 0); }
  if (q.limited === '1') where.push('is_limited = 1');
  if (q.onSale === '1') where.push('on_sale = 1 AND (stock IS NULL OR sold_count < stock)');
  if (q.featured === '1') where.push('is_featured = 1');
  if (q.free === '1') where.push('price = 0');
  if (q.creatorId) { where.push('creator_account_id = ?'); params.push(Number(q.creatorId)); }
  if (q.hideOwned === '1' && accountId) { where.push('id NOT IN (SELECT item_id FROM inventory WHERE account_id = ?)'); params.push(accountId); }
  const sort = SORTS[q.sort ?? 'relevance'];
  if (!sort) throw E.bad('Unknown sort');
  const { limit, offset } = paginate(q, { defaultLimit: 30 });
  const rows = app.db.all(`SELECT * FROM items ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
  return page(itemsWithOwnership(rows, accountId), limit, offset);
}

export { queryItems };

export default function register(r) {
  r.get('/api/catalog/home', (ctx) => {
    const { db } = app;
    const me = ctx.account?.id ?? null;
    const list = (sql, ...p) => itemsWithOwnership(db.all(sql, ...p), me);
    const featured = list('SELECT * FROM items WHERE is_featured = 1 AND is_archived = 0 ORDER BY updated_at DESC LIMIT 12');
    const newest = list('SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 ORDER BY created_at DESC, id DESC LIMIT 12');
    const bestselling = list('SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 ORDER BY sold_count DESC LIMIT 12');
    const limited = list("SELECT * FROM items WHERE is_archived = 0 AND is_limited = 1 ORDER BY (stock IS NOT NULL AND sold_count >= stock), created_at DESC LIMIT 12");
    // Recommended: categories this account buys most, excluding owned; falls back to popular.
    let recommended = [];
    if (me) {
      const cats = db.all(
        `SELECT i.category, COUNT(*) AS n FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.account_id = ? AND inv.source = 'purchase'
          GROUP BY i.category ORDER BY n DESC LIMIT 3`, me).map((c) => c.category);
      if (cats.length) {
        recommended = list(
          `SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 AND category IN (${cats.map(() => '?').join(',')})
             AND id NOT IN (SELECT item_id FROM inventory WHERE account_id = ?) ORDER BY sold_count DESC LIMIT 12`, ...cats, me);
      }
    }
    if (recommended.length < 6) {
      recommended = list(
        `SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 AND price > 0 ${me ? 'AND id NOT IN (SELECT item_id FROM inventory WHERE account_id = ?)' : ''}
          ORDER BY (sold_count * 7 + id * 13) % 97 DESC LIMIT 12`, ...(me ? [me] : []));
    }
    const creatorIds = db.all(
      `SELECT ab.account_id FROM account_badges ab JOIN badges b ON b.id = ab.badge_id
        WHERE json_extract(b.perks, '$.featuredCreator') = 1 LIMIT 10`).map((x) => x.account_id);
    const counts = Object.fromEntries(db.all('SELECT category, COUNT(*) AS n FROM items WHERE is_archived = 0 GROUP BY category').map((c) => [c.category, c.n]));
    return { featured, recommended, newest, bestselling, limited, featuredCreators: cardsList(creatorIds, { viewerId: me }), counts };
  });

  r.get('/api/catalog/items', (ctx) => queryItems(ctx.query, ctx.account?.id ?? null));

  r.get('/api/catalog/items/:id', (ctx) => {
    const { db } = app;
    const me = ctx.account?.id ?? null;
    const item = db.get('SELECT * FROM items WHERE id = ?', Number(ctx.params.id));
    if (!item || (item.is_archived && !ctx.perms?.has('catalog.manage'))) throw E.notFound('Item not found');
    const inv = me ? db.get('SELECT * FROM inventory WHERE account_id = ? AND item_id = ?', me, item.id) : null;
    const equipped = me ? Boolean(db.get('SELECT 1 FROM avatar_equipped WHERE account_id = ? AND item_id = ?', me, item.id)) : false;
    const favorite = me ? Boolean(db.get('SELECT 1 FROM item_favorites WHERE account_id = ? AND item_id = ?', me, item.id)) : false;
    const favorites = db.value('SELECT COUNT(*) FROM item_favorites WHERE item_id = ?', item.id);
    const bundleItems = item.category === 'bundle'
      ? itemsWithOwnership(db.all(`SELECT * FROM items WHERE id IN (SELECT value FROM json_each(?))`, item.bundle_item_ids), me) : [];
    const moreFromCreator = item.creator_account_id
      ? itemsWithOwnership(db.all('SELECT * FROM items WHERE creator_account_id = ? AND id != ? AND is_archived = 0 ORDER BY sold_count DESC LIMIT 8', item.creator_account_id, item.id), me) : [];
    const similar = itemsWithOwnership(db.all('SELECT * FROM items WHERE category = ? AND id != ? AND is_archived = 0 ORDER BY ABS(price - ?) LIMIT 8', item.category, item.id, item.price), me);
    return {
      item: itemView(item, { owned: Boolean(inv), equipped, favorite, favorites, serial: inv?.serial_number ?? null, acquiredAt: inv?.acquired_at ?? null }),
      creator: item.creator_account_id ? cardsList([item.creator_account_id], { viewerId: me })[0] ?? null : null,
      bundleItems,
      moreFromCreator,
      similar,
      notice: 'Roleplay item. Purchases use fictional Sparks only.',
    };
  });

  r.post('/api/catalog/items/:id/favorite', requireAuth, (ctx) => {
    app.db.run('INSERT OR IGNORE INTO item_favorites (account_id, item_id, created_at) VALUES (?, ?, ?)', ctx.account.id, Number(ctx.params.id), now());
    return { favorite: true };
  });
  r.delete('/api/catalog/items/:id/favorite', requireAuth, (ctx) => {
    app.db.run('DELETE FROM item_favorites WHERE account_id = ? AND item_id = ?', ctx.account.id, Number(ctx.params.id));
    return { favorite: false };
  });

  /**
   * Fictional roleplay purchase. In one transaction: verify the item is on sale and not owned,
   * verify the price the buyer saw, take stock, debit the wallet (fails if it cannot cover the
   * price), grant the item, pay the creator's share, and record purchase + ledger rows.
   */
  r.post('/api/catalog/items/:id/purchase', requireActiveAccount, (ctx) => {
    const { expectedPrice } = check(v.object({ expectedPrice: v.int({ min: 0 }) }), ctx.body);
    const rl = app.cfg.rateLimits;
    if (rl) ctx.limiter.enforce(`purchase:${ctx.account.id}`, 30, 60_000, 'Slow down: too many purchases in a minute');
    return purchaseItem(ctx.account, Number(ctx.params.id), expectedPrice);
  });
}

export function purchaseItem(account, itemId, expectedPrice) {
  const { db } = app;
  return db.tx(() => {
    const item = db.get('SELECT * FROM items WHERE id = ?', itemId);
    if (!item || item.is_archived) throw E.notFound('Item not found');
    if (!item.on_sale) throw E.conflict('This item is not for sale', 'not_for_sale');
    if (db.get('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?', account.id, item.id)) throw E.conflict('You already own this item', 'already_owned');
    if (item.price !== expectedPrice) throw E.conflict('The price changed. Check the new price and try again.', 'price_changed', { price: item.price });
    if (item.stock != null && item.sold_count >= item.stock) throw E.conflict(`${item.name} is sold out`, 'sold_out');

    let txInfo = { transactionId: null, balance: db.value('SELECT balance FROM wallets WHERE account_id = ?', account.id) };
    if (item.price > 0) {
      txInfo = debit(account.id, item.price, { type: 'purchase', description: `Purchased ${item.name}`, refType: 'item', refId: item.id, counterpartyId: item.creator_account_id });
    }
    if (!item.is_limited) db.run('UPDATE items SET sold_count = sold_count + 1 WHERE id = ?', item.id);
    const purchaseId = db.run('INSERT INTO purchases (account_id, item_id, price_paid, transaction_id, created_at) VALUES (?, ?, ?, ?, ?)',
      account.id, item.id, item.price, txInfo.transactionId, now()).id;
    const added = grantItem(account.id, item.id, { source: 'purchase', sourceRef: purchaseId });

    let creatorTx = null;
    const share = Math.floor(item.price * getConfig('economy').creatorShare);
    if (share > 0 && item.creator_account_id && item.creator_account_id !== account.id) {
      creatorTx = credit(item.creator_account_id, share, { type: 'sale', description: `Sold ${item.name}`, refType: 'purchase', refId: purchaseId, counterpartyId: account.id }).transactionId;
      db.run('UPDATE purchases SET creator_transaction_id = ? WHERE id = ?', creatorTx, purchaseId);
    }
    notify(account.id, { type: 'purchase', title: `You got ${item.name}!`, body: item.price ? `${item.price.toLocaleString('en-US')} Sparks spent (roleplay purchase).` : 'Added to your inventory.', data: { itemId: item.id } });
    const serial = db.value('SELECT serial_number FROM inventory WHERE account_id = ? AND item_id = ?', account.id, item.id);
    return {
      purchaseId,
      balance: txInfo.balance,
      transactionId: txInfo.transactionId,
      item: itemView(db.get('SELECT * FROM items WHERE id = ?', item.id), { owned: true, serial }),
      addedItemIds: added,
      fictional: true,
    };
  });
}

