import { app } from '../app.js';
import { E } from '../http.js';
import { now } from '../util.js';

export const MAX_BALANCE = 1_000_000_000_000;
const SPEND_TYPES = new Set(['purchase', 'fee']);

function assertAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_BALANCE) {
    throw E.bad('Amount must be a positive whole number');
  }
}

function ledger(accountId, amount, balanceAfter, meta) {
  return app.db.run(
    `INSERT INTO transactions (account_id, amount, balance_after, type, description, counterparty_account_id,
                               reference_type, reference_id, is_scripted, created_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    accountId, amount, balanceAfter, meta.type, (meta.description ?? meta.type).slice(0, 200),
    meta.counterpartyId ?? null, meta.refType ?? null, meta.refId ?? null, meta.scripted ? 1 : 0, meta.userId ?? null, now(),
  ).id;
}

export function getBalance(accountId) {
  return app.db.value('SELECT balance FROM wallets WHERE account_id = ?', accountId) ?? 0;
}

/** Adds fictional currency and records the ledger entry atomically. */
export function credit(accountId, amount, meta) {
  assertAmount(amount);
  const { db } = app;
  return db.tx(() => {
    const r = db.run(
      `UPDATE wallets SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = ?
        WHERE account_id = ? AND balance + ? <= ?`,
      amount, amount, now(), accountId, amount, MAX_BALANCE,
    );
    if (!r.changes) throw E.conflict('Wallet is missing or at its maximum balance', 'wallet_limit');
    const balance = getBalance(accountId);
    const transactionId = ledger(accountId, amount, balance, meta);
    return { transactionId, balance };
  });
}

/** Removes fictional currency only if the balance covers it; never goes negative. */
export function debit(accountId, amount, meta) {
  assertAmount(amount);
  const { db } = app;
  return db.tx(() => {
    const spent = SPEND_TYPES.has(meta.type) ? amount : 0;
    const r = db.run(
      `UPDATE wallets SET balance = balance - ?, lifetime_spent = lifetime_spent + ?, updated_at = ?
        WHERE account_id = ? AND balance >= ?`,
      amount, spent, now(), accountId, amount,
    );
    if (!r.changes) {
      throw E.conflict(`Not enough Sparks: this needs ${amount.toLocaleString('en-US')}`, 'insufficient_funds', {
        needed: amount, balance: getBalance(accountId),
      });
    }
    const balance = getBalance(accountId);
    const transactionId = ledger(accountId, -amount, balance, meta);
    return { transactionId, balance };
  });
}

/** Sets an exact balance, recording the difference as a single adjustment. */
export function setBalance(accountId, target, meta) {
  if (!Number.isInteger(target) || target < 0 || target > MAX_BALANCE) throw E.bad('Balance must be between 0 and 1,000,000,000,000');
  const { db } = app;
  return db.tx(() => {
    const current = db.value('SELECT balance FROM wallets WHERE account_id = ?', accountId);
    if (current == null) throw E.notFound('Wallet not found');
    const delta = target - current;
    if (delta === 0) return { transactionId: null, balance: current };
    db.run('UPDATE wallets SET balance = ?, updated_at = ? WHERE account_id = ?', target, now(), accountId);
    const transactionId = ledger(accountId, delta, target, { ...meta, type: meta.type ?? 'admin_set' });
    return { transactionId, balance: target };
  });
}

export function transactionView(t) {
  return {
    id: t.id,
    amount: t.amount,
    balanceAfter: t.balance_after,
    type: t.type,
    description: t.description,
    counterpartyId: t.counterparty_account_id,
    referenceType: t.reference_type,
    referenceId: t.reference_id,
    scripted: Boolean(t.is_scripted),
    createdAt: t.created_at,
  };
}
