import { app } from '../app.js';
import { E } from '../http.js';
import { now, parseJson, toJson, USERNAME_RE } from '../util.js';
import { avatarSpecs, DEFAULT_BODY_COLORS, SLOTS } from './avatar.js';
import { badgesFor, perksOf } from './badges.js';
import { getConfig } from './config.js';
import { fileUrl } from './files.js';
import { grantItem } from './inventory.js';
import { credit } from './wallet.js';

export const DEFAULT_PRIVACY = {
  profileVisibility: 'everyone', // everyone | friends | nobody
  inventoryVisibility: 'everyone',
  friendRequests: 'everyone', // everyone | nobody
  allowFollow: true,
  gameInvites: 'everyone', // everyone | friends | nobody
  showOnlineStatus: true,
  searchable: true,
};

export const DEFAULT_NOTIFICATION_PREFS = {
  friend_request: true, friend_accept: true, follow: true, purchase: true, sale: true, reward: true,
  badge: true, group: true, game_invite: true, event: true, announcement: true,
};

export const DEFAULT_PREFERENCES = { theme: 'dark', reduceMotion: false, dataSaver: false, compactLists: false };

export function validateUsername(username, { ownerUserId = null } = {}) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    throw E.bad('Usernames are 3–20 letters, numbers or underscores and cannot start or end with _', { field: 'username' });
  }
  if (/__/.test(username)) throw E.bad('Usernames cannot contain two underscores in a row', { field: 'username' });
  if (app.db.get('SELECT 1 FROM accounts WHERE username = ?', username)
    || app.db.get('SELECT 1 FROM users WHERE username = ? AND id IS NOT ?', username, ownerUserId)) {
    throw E.conflict('That username is taken', 'username_taken', { field: 'username' });
  }
}

/** Creates an account with profile, settings, avatar, wallet (+ starting balance) and starter items. */
export function createAccount({
  ownerUserId = null, username, displayName, isFictional = false, isPrimary = false,
  startingBalance, bodyColors, createdByUserId = null, bio = '',
}) {
  const { db } = app;
  validateUsername(username, { ownerUserId: isPrimary ? ownerUserId : null });
  return db.tx(() => {
    const t = now();
    const id = db.run(
      `INSERT INTO accounts (owner_user_id, username, display_name, is_fictional, is_primary, created_at, updated_at, last_online_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ownerUserId, username, displayName || username, isFictional ? 1 : 0, isPrimary ? 1 : 0, t, t, isFictional ? null : t,
    ).id;
    db.run('INSERT INTO profiles (account_id, bio) VALUES (?, ?)', id, bio);
    db.run('INSERT INTO account_settings (account_id, privacy, notifications, preferences) VALUES (?, ?, ?, ?)',
      id, toJson(DEFAULT_PRIVACY), toJson(DEFAULT_NOTIFICATION_PREFS), toJson(DEFAULT_PREFERENCES));
    db.run('INSERT INTO avatars (account_id, body_colors, updated_at) VALUES (?, ?, ?)', id, toJson({ ...DEFAULT_BODY_COLORS, ...(bodyColors ?? {}) }), t);
    db.run('INSERT INTO wallets (account_id, balance, updated_at) VALUES (?, 0, ?)', id, t);
    const start = startingBalance ?? getConfig('economy').startingBalance;
    if (start > 0) credit(id, start, { type: 'starting_balance', description: 'Welcome to Larpverse — starting Sparks', userId: createdByUserId });

    const used = new Set();
    for (const s of db.all(`SELECT id, slot FROM items WHERE tags LIKE '%"starter"%' ORDER BY id`)) {
      grantItem(id, s.id, { source: 'starter' });
      if (SLOTS.includes(s.slot) && (s.slot === 'emote' || !used.has(s.slot))) {
        used.add(s.slot);
        db.run('INSERT OR IGNORE INTO avatar_equipped (account_id, item_id, slot, equipped_at) VALUES (?, ?, ?, ?)', id, s.id, s.slot, t);
      }
    }
    return id;
  });
}

export function getAccount(id) {
  return app.db.get('SELECT * FROM accounts WHERE id = ?', id);
}

export function requireAccount(id) {
  const a = getAccount(id);
  if (!a) throw E.notFound('Account not found');
  return a;
}

export function settingsOf(accountId) {
  const s = app.db.get('SELECT * FROM account_settings WHERE account_id = ?', accountId);
  return {
    privacy: { ...DEFAULT_PRIVACY, ...parseJson(s?.privacy, {}) },
    notifications: { ...DEFAULT_NOTIFICATION_PREFS, ...parseJson(s?.notifications, {}) },
    preferences: { ...DEFAULT_PREFERENCES, ...parseJson(s?.preferences, {}) },
  };
}

export function friendStatus(viewerId, otherId) {
  if (!viewerId || viewerId === otherId) return 'self';
  const [a, b] = viewerId < otherId ? [viewerId, otherId] : [otherId, viewerId];
  const f = app.db.get('SELECT status, requester_id FROM friendships WHERE account_a = ? AND account_b = ?', a, b);
  if (!f) return 'none';
  if (f.status === 'accepted') return 'friends';
  return f.requester_id === viewerId ? 'outgoing' : 'incoming';
}

export function areFriends(x, y) {
  return friendStatus(x, y) === 'friends';
}

/** Whether `viewer` passes a visibility setting ('everyone' | 'friends' | 'nobody') of `owner`. */
export function visibleTo(setting, ownerId, viewerId, isStaff = false) {
  if (isStaff || ownerId === viewerId) return true;
  if (setting === 'everyone') return true;
  if (setting === 'friends') return viewerId ? areFriends(ownerId, viewerId) : false;
  return false;
}

function presenceFor(acc, overrides, privacy, viewerId, isStaff) {
  const live = app.game?.presenceOf(acc.id);
  if (!privacy.showOnlineStatus && viewerId !== acc.id && !isStaff) return { status: 'offline' };
  if (live) return { status: 'in_experience', experienceId: live.experienceId, experienceName: live.experienceName, sessionId: live.sessionId };
  if (overrides.presence && ['online', 'in_experience', 'offline'].includes(overrides.presence)) {
    const p = { status: overrides.presence };
    if (overrides.presence === 'in_experience' && overrides.presenceExperienceId) {
      p.experienceId = overrides.presenceExperienceId;
      p.experienceName = app.db.value('SELECT name FROM experiences WHERE id = ?', overrides.presenceExperienceId);
    }
    return p;
  }
  if (acc.last_online_at && now() - acc.last_online_at < 3 * 60_000) return { status: 'online' };
  return { status: 'offline', lastOnlineAt: acc.last_online_at };
}

/** Compact public representation of many accounts (Map<id, card>), used across every list. */
export function accountCards(ids, { viewerId = null, isStaff = false } = {}) {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map();
  if (unique.length === 0) return out;
  const ph = unique.map(() => '?').join(',');
  const rows = app.db.all(
    `SELECT a.*, p.picture_file_id, p.stat_overrides, s.privacy FROM accounts a
       JOIN profiles p ON p.account_id = a.id JOIN account_settings s ON s.account_id = a.id
      WHERE a.id IN (${ph})`, ...unique);
  const avatars = avatarSpecs(unique);
  const badges = badgesFor(unique);
  for (const r of rows) {
    const b = badges.get(r.id) ?? [];
    const overrides = parseJson(r.stat_overrides, {});
    const privacy = { ...DEFAULT_PRIVACY, ...parseJson(r.privacy, {}) };
    out.set(r.id, {
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      picture: fileUrl(r.picture_file_id),
      avatar: avatars.get(r.id),
      badges: b.map((x) => ({ key: x.key, name: x.name, label: x.label, icon: x.icon, color: x.color, kind: x.kind })),
      verified: perksOf(b).verified,
      presence: presenceFor(r, overrides, privacy, viewerId, isStaff),
      status: r.status,
      ...(isStaff ? { isFictional: Boolean(r.is_fictional), ownerUserId: r.owner_user_id } : {}),
    });
  }
  return out;
}

export function accountCard(id, opts) {
  return accountCards([id], opts).get(id) ?? null;
}

export function cardsList(ids, opts) {
  const m = accountCards(ids, opts);
  return ids.map((id) => m.get(id)).filter(Boolean);
}

export function socialCounts(accountId) {
  const { db } = app;
  return {
    friends: db.value("SELECT COUNT(*) FROM friendships WHERE status = 'accepted' AND (account_a = ? OR account_b = ?)", accountId, accountId),
    followers: db.value('SELECT COUNT(*) FROM follows WHERE followee_id = ?', accountId),
    following: db.value('SELECT COUNT(*) FROM follows WHERE follower_id = ?', accountId),
  };
}

/** Counts shown on a profile: real counts unless staff staged an override for the scenario. */
export function displayStats(accountId) {
  const { db } = app;
  const real = socialCounts(accountId);
  const overrides = parseJson(db.value('SELECT stat_overrides FROM profiles WHERE account_id = ?', accountId), {});
  const visits = db.value('SELECT COALESCE(SUM(visits), 0) FROM experiences WHERE creator_account_id = ?', accountId);
  const pick = (k, v) => (Number.isInteger(overrides[k]) ? overrides[k] : v);
  return {
    friends: pick('friends', real.friends),
    followers: pick('followers', real.followers),
    following: pick('following', real.following),
    visits: pick('visits', visits),
    real,
  };
}

export function fullProfile(accountId, { viewerId, isStaff = false }) {
  const { db } = app;
  const acc = requireAccount(accountId);
  if (acc.status === 'disabled' && !isStaff && viewerId !== acc.id) throw E.notFound('This account is unavailable');
  const p = db.get('SELECT * FROM profiles WHERE account_id = ?', accountId);
  const settings = settingsOf(accountId);
  const card = accountCard(accountId, { viewerId, isStaff });
  const canView = visibleTo(settings.privacy.profileVisibility, accountId, viewerId, isStaff);
  const relationship = {
    friendStatus: friendStatus(viewerId, accountId),
    isFollowing: viewerId ? Boolean(db.get('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', viewerId, accountId)) : false,
    followsYou: viewerId ? Boolean(db.get('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', accountId, viewerId)) : false,
  };
  const badgeList = badgesFor([accountId]).get(accountId);
  const base = {
    ...card,
    bannerColor: p.banner_color,
    joinedAt: p.join_date_override ?? acc.created_at,
    relationship,
    canView,
    stats: (({ real, ...rest }) => rest)(displayStats(accountId)),
    badgesFull: badgeList.map((b) => ({ ...b })),
    perks: perksOf(badgeList),
    allowsFriendRequests: settings.privacy.friendRequests === 'everyone',
    allowsFollow: settings.privacy.allowFollow,
  };
  if (!canView) return { ...base, bio: '', statusText: '', limited: true };
  const groups = db.all(
    `SELECT g.id, g.name, g.emblem, gm.rank FROM group_members gm JOIN user_groups g ON g.id = gm.group_id
      WHERE gm.account_id = ? AND gm.rank != 'pending' ORDER BY gm.joined_at LIMIT 12`, accountId)
    .map((g) => ({ id: g.id, name: g.name, emblem: parseJson(g.emblem, {}), rank: g.rank }));
  const creations = db.all(
    "SELECT id, name, art, thumbnail_file_id, visits, genre FROM experiences WHERE creator_account_id = ? AND status = 'public' ORDER BY visits DESC LIMIT 10", accountId)
    .map((x) => ({ id: x.id, name: x.name, art: parseJson(x.art, {}), thumbnail: fileUrl(x.thumbnail_file_id), visits: x.visits, genre: x.genre }));
  const favorites = db.all(
    `SELECT e.id, e.name, e.art, e.thumbnail_file_id, e.genre FROM experience_favorites f JOIN experiences e ON e.id = f.experience_id
      WHERE f.account_id = ? AND e.status = 'public' ORDER BY f.created_at DESC LIMIT 10`, accountId)
    .map((x) => ({ id: x.id, name: x.name, art: parseJson(x.art, {}), thumbnail: fileUrl(x.thumbnail_file_id), genre: x.genre }));
  const wearing = db.all(
    `SELECT i.id, i.name, i.category, i.rarity, i.asset, i.slot FROM avatar_equipped ae JOIN items i ON i.id = ae.item_id
      WHERE ae.account_id = ? ORDER BY ae.equipped_at`, accountId)
    .map((i) => ({ id: i.id, name: i.name, category: i.category, rarity: i.rarity, slot: i.slot, asset: parseJson(i.asset, {}) }));
  const showcaseIds = parseJson(p.showcase_item_ids, []).filter(Number.isInteger).slice(0, 12);
  const showcase = showcaseIds.length && visibleTo(settings.privacy.inventoryVisibility, accountId, viewerId, isStaff)
    ? db.all(`SELECT i.id, i.name, i.category, i.rarity, i.asset, i.slot, i.is_limited, inv.serial_number FROM inventory inv JOIN items i ON i.id = inv.item_id
               WHERE inv.account_id = ? AND i.id IN (${showcaseIds.map(() => '?').join(',')})`, accountId, ...showcaseIds)
      .map((i) => ({ id: i.id, name: i.name, category: i.category, rarity: i.rarity, slot: i.slot, asset: parseJson(i.asset, {}), isLimited: Boolean(i.is_limited), serial: i.serial_number }))
    : [];
  const friendPreview = db.all(
    `SELECT CASE WHEN account_a = ? THEN account_b ELSE account_a END AS fid FROM friendships
      WHERE status = 'accepted' AND (account_a = ? OR account_b = ?) ORDER BY responded_at DESC LIMIT 9`,
    accountId, accountId, accountId).map((r) => r.fid);
  return {
    ...base,
    bio: p.bio,
    statusText: p.status_text,
    announcement: p.announcement,
    groups,
    creations,
    favorites,
    wearing,
    showcase,
    friendsPreview: cardsList(friendPreview, { viewerId, isStaff }),
    inventoryVisible: visibleTo(settings.privacy.inventoryVisibility, accountId, viewerId, isStaff),
  };
}
