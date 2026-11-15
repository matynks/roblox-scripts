import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { getConfig } from '../services/config.js';
import { itemView, revokeItem } from '../services/inventory.js';
import { notify } from '../services/notify.js';
import { credit, debit, getBalance, transactionView } from '../services/wallet.js';
import { now, page, paginate } from '../util.js';

export function purchaseView(p, item) {
  return {
    id: p.id,
    item: item ? itemView(item) : null,
    pricePaid: p.price_paid,
    status: p.status,
    transactionId: p.transaction_id,
    createdAt: p.created_at,
    refundedAt: p.refunded_at,
  };
}

/**
 * Reverses a purchase: buyer gets the price back, the item leaves their inventory and avatar,
 * and the creator's share is taken back when their balance allows. All in one transaction.
 */
export function refundPurchase(purchaseId, { byUserId = null, reason = 'Roleplay refund', silent = false } = {}) {
  const { db } = app;
  return db.tx(() => {
    const p = db.get('SELECT * FROM purchases WHERE id = ?', purchaseId);
    if (!p) throw E.notFound('Purchase not found');
    if (p.status !== 'completed') throw E.conflict('This purchase was already refunded', 'already_refunded');
    const item = db.get('SELECT * FROM items WHERE id = ?', p.item_id);
    let refundTx = null;
    if (p.price_paid > 0) {
      refundTx = credit(p.account_id, p.price_paid, { type: 'refund', description: `${reason}: ${item.name}`, refType: 'purchase', refId: p.id, userId: byUserId }).transactionId;
    }
    if (p.creator_transaction_id) {
      const ct = db.get('SELECT * FROM transactions WHERE id = ?', p.creator_transaction_id);
      const take = Math.min(ct.amount, getBalance(ct.account_id));
      if (take > 0) debit(ct.account_id, take, { type: 'refund_reversal', description: `Sale refunded: ${item.name}`, refType: 'purchase', refId: p.id, userId: byUserId });
    }
    revokeItem(p.account_id, p.item_id, { reason: 'refunded' });
    if (item.is_limited) db.run('UPDATE items SET sold_count = MAX(0, sold_count - 1) WHERE id = ?', item.id);
    db.run("UPDATE purchases SET status = 'refunded', refunded_at = ?, refund_transaction_id = ? WHERE id = ?", now(), refundTx, p.id);
    if (!silent) notify(p.account_id, { type: 'purchase', title: `Refunded ${item.name}`, body: `${p.price_paid.toLocaleString('en-US')} Sparks were returned to your wallet.`, data: { itemId: item.id } });
    return { purchaseId: p.id, refunded: p.price_paid, balance: getBalance(p.account_id) };
  });
}

export default function register(r) {
  r.get('/api/wallet', requireAuth, (ctx) => {
    const w = app.db.get('SELECT * FROM wallets WHERE account_id = ?', ctx.account.id);
    const eco = getConfig('economy');
    const nextDaily = w.last_daily_at ? w.last_daily_at + eco.dailyCooldownHours * 3600_000 : 0;
    return {
      balance: w.balance,
      lifetimeEarned: w.lifetime_earned,
      lifetimeSpent: w.lifetime_spent,
      dailyReward: eco.dailyReward,
      dailyAvailableAt: nextDaily > now() ? nextDaily : null,
      currency: { name: 'Sparks', symbol: '✦', fictional: true, notice: 'Sparks are fictional roleplay currency. They have no real-world value and cannot be bought, sold, or exchanged for Robux or money.' },
    };
  });

  r.get('/api/wallet/transactions', requireAuth, (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 40 });
    const type = ctx.query.type;
    const dir = ctx.query.direction;
    const where = ['account_id = ?'];
    const params = [ctx.account.id];
    if (type) { where.push('type = ?'); params.push(String(type)); }
    if (dir === 'in') where.push('amount > 0');
    if (dir === 'out') where.push('amount < 0');
    const rows = app.db.all(`SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, limit + 1, offset);
    const res = page(rows.map(transactionView), limit, offset);
    const totals = app.db.get(
      `SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) AS incoming, COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0) AS outgoing
         FROM transactions WHERE account_id = ? AND created_at > ?`, ctx.account.id, now() - 30 * 86400_000);
    return { ...res, last30Days: totals };
  });

  r.get('/api/wallet/purchases', requireAuth, (ctx) => {
    const { limit, offset } = paginate(ctx.query, { defaultLimit: 40 });
    const rows = app.db.all('SELECT * FROM purchases WHERE account_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', ctx.account.id, limit + 1, offset);
    const windowMs = getConfig('economy').refundWindowMinutes * 60_000;
    return page(rows.map((p) => {
      const item = app.db.get('SELECT * FROM items WHERE id = ?', p.item_id);
      return { ...purchaseView(p, item), refundable: p.status === 'completed' && !item.is_limited && now() - p.created_at < windowMs };
    }), limit, offset);
  });

  r.post('/api/wallet/purchases/:id/refund', requireActiveAccount, (ctx) => {
    const p = app.db.get('SELECT * FROM purchases WHERE id = ? AND account_id = ?', Number(ctx.params.id), ctx.account.id);
    if (!p) throw E.notFound('Purchase not found');
    const item = app.db.get('SELECT * FROM items WHERE id = ?', p.item_id);
    const windowMin = getConfig('economy').refundWindowMinutes;
    if (item.is_limited) throw E.conflict('Limited collectibles cannot be refunded', 'not_refundable');
    if (now() - p.created_at > windowMin * 60_000) throw E.conflict(`Refunds are available for ${windowMin} minutes after purchase`, 'refund_window_closed');
    return refundPurchase(p.id, { reason: 'Refund' });
  });

  r.post('/api/wallet/daily', requireActiveAccount, (ctx) => {
    const { db } = app;
    const eco = getConfig('economy');
    return db.tx(() => {
      const w = db.get('SELECT * FROM wallets WHERE account_id = ?', ctx.account.id);
      const next = (w.last_daily_at ?? 0) + eco.dailyCooldownHours * 3600_000;
      if (next > now()) throw E.conflict('Daily reward already claimed', 'daily_claimed', { availableAt: next });
      db.run('UPDATE wallets SET last_daily_at = ? WHERE account_id = ?', now(), ctx.account.id);
      const res = credit(ctx.account.id, eco.dailyReward, { type: 'daily_reward', description: 'Daily login reward' });
      return { ...res, amount: eco.dailyReward, nextAvailableAt: now() + eco.dailyCooldownHours * 3600_000 };
    });
  });
}
