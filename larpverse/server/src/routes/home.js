import { app } from '../app.js';
import { requireAuth } from '../auth.js';
import { cardsList } from '../services/accounts.js';
import { getConfig } from '../services/config.js';
import { unreadCount } from '../services/notify.js';
import { getBalance } from '../services/wallet.js';
import { itemsWithOwnership } from './catalog.js';
import { discover } from './experiences.js';
import { notificationViews } from './notifications.js';

export default function register(r) {
  /** Everything the home screen needs in one round trip. */
  r.get('/api/home', requireAuth, (ctx) => {
    const { db } = app;
    const me = ctx.account.id;
    const opts = { viewerId: me, limit: 10 };
    const friendIds = db.all(
      `SELECT CASE WHEN account_a = ? THEN account_b ELSE account_a END AS fid FROM friendships
        WHERE status = 'accepted' AND (account_a = ? OR account_b = ?)`, me, me, me).map((x) => x.fid);
    const order = { in_experience: 0, online: 1, offline: 2 };
    const friends = cardsList(friendIds, { viewerId: me }).sort((a, b) => order[a.presence.status] - order[b.presence.status]).slice(0, 24);
    const ownedCats = db.all(
      `SELECT i.category FROM inventory inv JOIN items i ON i.id = inv.item_id WHERE inv.account_id = ? AND inv.source = 'purchase' GROUP BY i.category ORDER BY COUNT(*) DESC LIMIT 2`, me)
      .map((c) => c.category);
    const itemRows = ownedCats.length
      ? db.all(`SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 AND category IN (${ownedCats.map(() => '?').join(',')}) AND id NOT IN (SELECT item_id FROM inventory WHERE account_id = ?) ORDER BY sold_count DESC LIMIT 10`, ...ownedCats, me)
      : db.all('SELECT * FROM items WHERE is_archived = 0 AND on_sale = 1 AND is_featured = 1 AND id NOT IN (SELECT item_id FROM inventory WHERE account_id = ?) ORDER BY sold_count DESC LIMIT 10', me);
    const activeSession = db.get(
      `SELECT s.id, s.name, s.status, s.experience_id FROM session_participants p JOIN larp_sessions s ON s.id = p.session_id
        WHERE p.account_id = ? AND p.status = 'active' AND s.status != 'ended' ORDER BY p.joined_at DESC LIMIT 1`, me);
    const latest = db.all('SELECT * FROM notifications WHERE account_id = ? ORDER BY id DESC LIMIT 3', me);
    return {
      account: cardsList([me], { viewerId: me })[0],
      balance: getBalance(me),
      motd: getConfig('platform').motd,
      featured: discover('featured', opts).items,
      recommended: discover('recommended', opts).items,
      popular: discover('popular', opts).items,
      recentlyPlayed: discover('history', opts).items,
      favorites: discover('favorites', opts).items,
      recommendedItems: itemsWithOwnership(itemRows, me),
      friends,
      friendCount: friendIds.length,
      activeSession: activeSession ? { id: activeSession.id, name: activeSession.name, status: activeSession.status, experienceId: activeSession.experience_id } : null,
      notifications: notificationViews(latest, me),
      unreadNotifications: unreadCount(me),
      announcement: db.value('SELECT announcement FROM profiles WHERE account_id = ?', me),
    };
  });
}
