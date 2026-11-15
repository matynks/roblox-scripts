import { app } from '../app.js';
import { E } from '../http.js';
import { STAFF_RANK } from '../permissions.js';
import { now, parseJson } from '../util.js';

export function badgeView(b) {
  return {
    id: b.id,
    key: b.key,
    name: b.name,
    description: b.description,
    icon: b.icon,
    color: b.color,
    kind: b.kind,
    requiredStaffRole: b.required_staff_role,
    perks: parseJson(b.perks, {}),
    sort: b.sort,
  };
}

/** Badges for many accounts at once: Map<accountId, badge[]> sorted by priority. */
export function badgesFor(accountIds) {
  const out = new Map(accountIds.map((id) => [id, []]));
  if (accountIds.length === 0) return out;
  const rows = app.db.all(
    `SELECT ab.account_id, ab.label_override, ab.awarded_at, b.*
       FROM account_badges ab JOIN badges b ON b.id = ab.badge_id
      WHERE ab.account_id IN (${accountIds.map(() => '?').join(',')})
      ORDER BY b.sort, b.id`,
    ...accountIds,
  );
  for (const r of rows) {
    out.get(r.account_id)?.push({ ...badgeView(r), label: r.label_override || r.name, awardedAt: r.awarded_at });
  }
  return out;
}

export function perksOf(badges) {
  const perks = { verified: false, featuredCreator: false, hostLimitBonus: 0, freeGroups: false };
  for (const b of badges) {
    const p = b.perks ?? {};
    if (p.verified) perks.verified = true;
    if (p.featuredCreator) perks.featuredCreator = true;
    if (p.freeGroups) perks.freeGroups = true;
    if (Number.isInteger(p.hostLimitBonus)) perks.hostLimitBonus = Math.max(perks.hostLimitBonus, p.hostLimitBonus);
  }
  return perks;
}

export function accountPerks(accountId) {
  return perksOf(badgesFor([accountId]).get(accountId));
}

/**
 * System badges (Administrator, Moderator) mirror real staff permissions: they can only sit on
 * the primary, non-fictional account of a login whose staff role meets the requirement.
 */
export function systemBadgeAllowed(badge, accountId) {
  if (badge.kind !== 'system') return true;
  const acc = app.db.get(
    `SELECT a.is_primary, a.is_fictional, u.staff_role FROM accounts a LEFT JOIN users u ON u.id = a.owner_user_id WHERE a.id = ?`,
    accountId,
  );
  if (!acc || !acc.is_primary || acc.is_fictional || !acc.staff_role) return false;
  return STAFF_RANK[acc.staff_role] >= STAFF_RANK[badge.required_staff_role ?? 'owner'];
}

export function assignBadge(accountId, badgeIdOrKey, { labelOverride = null, userId = null } = {}) {
  const { db } = app;
  const badge = typeof badgeIdOrKey === 'number'
    ? db.get('SELECT * FROM badges WHERE id = ?', badgeIdOrKey)
    : db.get('SELECT * FROM badges WHERE key = ?', badgeIdOrKey);
  if (!badge) throw E.notFound('Badge not found');
  if (!systemBadgeAllowed(badge, accountId)) {
    throw E.forbidden(`"${badge.name}" reflects real staff permissions and can only be shown on a staff member's primary account`, 'badge_requires_staff');
  }
  db.run(
    `INSERT INTO account_badges (account_id, badge_id, label_override, awarded_by_user_id, awarded_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id, badge_id) DO UPDATE SET label_override = excluded.label_override`,
    accountId, badge.id, labelOverride, userId, now(),
  );
  return badge;
}

export function removeBadge(accountId, badgeId) {
  return app.db.run('DELETE FROM account_badges WHERE account_id = ? AND badge_id = ?', accountId, badgeId).changes > 0;
}

/** Keep system badges in sync with the login's staff role (called after role changes). */
export function syncSystemBadges(userId) {
  const { db } = app;
  const primary = db.get('SELECT id FROM accounts WHERE owner_user_id = ? AND is_primary = 1', userId);
  if (!primary) return;
  const role = db.value('SELECT staff_role FROM users WHERE id = ?', userId);
  const system = db.all("SELECT * FROM badges WHERE kind = 'system'");
  // Show only the highest system badge the login qualifies for.
  const best = system
    .filter((b) => STAFF_RANK[role] >= STAFF_RANK[b.required_staff_role ?? 'owner'])
    .sort((a, b) => STAFF_RANK[b.required_staff_role] - STAFF_RANK[a.required_staff_role])[0];
  for (const b of system) {
    if (best && b.id === best.id) {
      db.run('INSERT OR IGNORE INTO account_badges (account_id, badge_id, awarded_at) VALUES (?, ?, ?)', primary.id, b.id, now());
    } else {
      db.run('DELETE FROM account_badges WHERE account_id = ? AND badge_id = ?', primary.id, b.id);
    }
  }
}
