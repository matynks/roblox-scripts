import { app } from '../app.js';
import { requireAuth } from '../auth.js';
import { E } from '../http.js';
import { requireAccount, settingsOf, visibleTo } from '../services/accounts.js';
import { itemView } from '../services/inventory.js';
import { page, paginate } from '../util.js';
import { CATEGORY_GROUPS } from './catalog.js';

const RARITY_ORDER = "CASE i.rarity WHEN 'mythic' THEN 6 WHEN 'legendary' THEN 5 WHEN 'epic' THEN 4 WHEN 'rare' THEN 3 WHEN 'uncommon' THEN 2 ELSE 1 END";
const SORTS = {
  recent: 'inv.acquired_at DESC, inv.id DESC',
  oldest: 'inv.acquired_at ASC, inv.id',
  name: 'i.name COLLATE NOCASE',
  rarity: `${RARITY_ORDER} DESC, i.name`,
  value: 'i.price DESC',
};

export function inventoryQuery(accountId, q) {
  const where = ['inv.account_id = ?'];
  const params = [accountId];
  const cats = CATEGORY_GROUPS[q.category ?? 'all'];
  if (q.category && cats === undefined) throw E.bad('Unknown category');
  if (cats) { where.push(`i.category IN (${cats.map(() => '?').join(',')})`); params.push(...cats); }
  if (q.slot) { where.push('i.slot = ?'); params.push(String(q.slot)); }
  if (q.rarity) { where.push('i.rarity = ?'); params.push(String(q.rarity)); }
  if (q.q) {
    const like = `%${String(q.q).slice(0, 60).replace(/[%_]/g, (m) => `\\${m}`)}%`;
    where.push("(i.name LIKE ? ESCAPE '\\' OR i.tags LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  if (q.equipped === '1') where.push('ae.item_id IS NOT NULL');
  if (q.equipped === '0') where.push('ae.item_id IS NULL');
  const sort = SORTS[q.sort ?? 'recent'];
  if (!sort) throw E.bad('Unknown sort');
  const { limit, offset } = paginate(q, { defaultLimit: 60, maxLimit: 200 });
  const rows = app.db.all(
    `SELECT i.*, inv.acquired_at, inv.source, inv.serial_number, ae.item_id IS NOT NULL AS is_equipped
       FROM inventory inv JOIN items i ON i.id = inv.item_id
       LEFT JOIN avatar_equipped ae ON ae.account_id = inv.account_id AND ae.item_id = inv.item_id
      WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
  const res = page(rows.map((r) => itemView(r, {
    owned: true, equipped: Boolean(r.is_equipped), acquiredAt: r.acquired_at, source: r.source, serial: r.serial_number,
  })), limit, offset);
  const totals = app.db.get(
    `SELECT COUNT(*) AS count, COALESCE(SUM(i.price), 0) AS value FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.account_id = ?`, accountId);
  return { ...res, totals };
}

export default function register(r) {
  r.get('/api/inventory', requireAuth, (ctx) => inventoryQuery(ctx.account.id, ctx.query));

  r.get('/api/accounts/:id/inventory', (ctx) => {
    const acc = requireAccount(Number(ctx.params.id));
    const isStaff = Boolean(ctx.perms?.has('accounts.view'));
    if (!visibleTo(settingsOf(acc.id).privacy.inventoryVisibility, acc.id, ctx.account?.id ?? null, isStaff)) {
      throw E.forbidden('This inventory is private', 'inventory_private');
    }
    return inventoryQuery(acc.id, ctx.query);
  });

  /** Ownership details and the full acquisition/equip history for one item. */
  r.get('/api/inventory/:itemId', requireAuth, (ctx) => {
    const { db } = app;
    const itemId = Number(ctx.params.itemId);
    const item = db.get('SELECT * FROM items WHERE id = ?', itemId);
    if (!item) throw E.notFound('Item not found');
    const inv = db.get('SELECT * FROM inventory WHERE account_id = ? AND item_id = ?', ctx.account.id, itemId);
    const equipped = Boolean(db.get('SELECT 1 FROM avatar_equipped WHERE account_id = ? AND item_id = ?', ctx.account.id, itemId));
    const historyRows = db.all('SELECT * FROM inventory_history WHERE account_id = ? AND item_id = ? ORDER BY id DESC LIMIT 50', ctx.account.id, itemId);
    const purchase = inv?.source === 'purchase' && inv.source_ref ? db.get('SELECT * FROM purchases WHERE id = ?', inv.source_ref) : null;
    return {
      item: itemView(item, { owned: Boolean(inv), equipped, acquiredAt: inv?.acquired_at ?? null, source: inv?.source ?? null, serial: inv?.serial_number ?? null }),
      purchase: purchase ? { id: purchase.id, pricePaid: purchase.price_paid, createdAt: purchase.created_at, status: purchase.status } : null,
      history: historyRows.map((h) => ({ id: h.id, action: h.action, source: h.source, details: h.details, createdAt: h.created_at })),
    };
  });
}
