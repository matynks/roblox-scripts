import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { boot, PNG_DATA_URL } from './helpers.js';

let env;
before(async () => { env = await boot(); });
after(async () => { await env.close(); });

describe('authentication & sessions', () => {
  test('register creates a login, primary account, wallet and starter outfit', async () => {
    const c = env.client();
    const res = await c.register('alice_rp', 'Password123', 'Alice');
    assert.ok(res.token);
    assert.equal(res.me.account.username, 'alice_rp');
    assert.equal(res.me.account.displayName, 'Alice');
    assert.equal(res.me.wallet.balance, 500);
    assert.deepEqual(res.me.user.permissions, []);
    const avatar = await c.ok('GET', '/api/avatar');
    assert.ok(avatar.equipped.length >= 4, 'starter items are equipped');
    const tx = await c.ok('GET', '/api/wallet/transactions');
    assert.equal(tx.items[0].type, 'starting_balance');
  });

  test('duplicate usernames, weak passwords and invalid usernames are rejected', async () => {
    const c = env.client();
    assert.equal((await c.post('/api/auth/register', { username: 'alice_rp', password: 'Password123' })).status, 409);
    assert.equal((await c.post('/api/auth/register', { username: 'bobby', password: 'short' })).status, 400);
    assert.equal((await c.post('/api/auth/register', { username: '_bad_', password: 'Password123' })).status, 400);
    assert.equal((await c.post('/api/auth/register', { username: 'NovaStudio', password: 'Password123' })).status, 409, 'seeded fictional names are taken');
  });

  test('login, me, logout; sessions persist across requests and logout revokes', async () => {
    const c = env.client();
    await c.login('alice_rp', 'Password123');
    const me = await c.ok('GET', '/api/me');
    assert.equal(me.account.username, 'alice_rp');
    const token = c.token;
    await c.ok('POST', '/api/auth/logout');
    c.token = token;
    assert.equal((await c.get('/api/me')).status, 401);
  });

  test('wrong password returns 401 and repeated failures lock the login', async () => {
    const c = env.client();
    await c.register('locky', 'Password123');
    for (let i = 0; i < 8; i++) assert.equal((await c.post('/api/auth/login', { username: 'locky', password: 'nope-nope-1' })).status, 401);
    const r = await c.post('/api/auth/login', { username: 'locky', password: 'Password123' });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'locked');
  });

  test('password change revokes other sessions; session list and login history work', async () => {
    const a = env.client();
    await a.register('pw_user', 'Password123');
    const b = env.client();
    await b.login('pw_user', 'Password123');
    const sessions = await a.ok('GET', '/api/security/sessions');
    assert.equal(sessions.sessions.length, 2);
    assert.equal((await a.post('/api/security/password', { currentPassword: 'wrong-pass1', newPassword: 'NewPassword456' })).status, 403);
    await a.ok('POST', '/api/security/password', { currentPassword: 'Password123', newPassword: 'NewPassword456' });
    assert.equal((await b.get('/api/me')).status, 401, 'other session revoked');
    assert.equal((await a.get('/api/me')).status, 200, 'current session kept');
    await env.client().login('pw_user', 'NewPassword456');
    const logins = await a.ok('GET', '/api/security/logins');
    assert.ok(logins.logins.length >= 2);
  });

  test('alternate accounts and switching between owned accounts', async () => {
    const c = env.client();
    await c.register('switcher', 'Password123');
    const me = await c.ok('POST', '/api/me/accounts', { username: 'switcher_alt', displayName: 'Alt' });
    assert.equal(me.account.username, 'switcher_alt');
    assert.equal(me.accounts.length, 2);
    const primaryId = me.accounts.find((a) => a.username === 'switcher').id;
    const back = await c.ok('POST', '/api/me/switch', { accountId: primaryId });
    assert.equal(back.account.username, 'switcher');
    // Cannot switch into someone else's or a fictional account without staff permission.
    const nova = (await c.ok('GET', '/api/users/by-username/NovaStudio')).id;
    assert.equal((await c.post('/api/me/switch', { accountId: nova })).status, 403);
  });
});

describe('profiles, settings and privacy', () => {
  test('profile edit, picture upload validation, username change fee', async () => {
    const c = env.client();
    await c.register('profiled', 'Password123');
    const p = await c.ok('PATCH', '/api/me/profile', { bio: 'Hello there', statusText: 'Roleplaying', bannerColor: '#123456', displayName: 'Pro File' });
    assert.equal(p.bio, 'Hello there');
    assert.equal(p.displayName, 'Pro File');
    const pic = await c.ok('POST', '/api/me/picture', { dataUrl: PNG_DATA_URL });
    assert.match(pic.picture, /^\/files\//);
    const file = await fetch(env.base + pic.picture);
    assert.equal(file.headers.get('content-type'), 'image/png');
    assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
    // Declared PNG but the bytes are not a PNG.
    const fake = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    assert.equal((await c.post('/api/me/picture', { dataUrl: fake })).status, 400);
    assert.equal((await c.post('/api/me/picture', { dataUrl: 'data:text/html;base64,PGgxPg==' })).status, 400);
    // Username change costs 1,000 Sparks; the account only has 500.
    const r = await c.post('/api/me/username', { username: 'profiled2' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'insufficient_funds');
    assert.equal((await c.ok('GET', '/api/me')).account.username, 'profiled', 'rename rolled back with the failed charge');
  });

  test('privacy: private profile, inventory visibility, friend requests off, unsearchable', async () => {
    const owner = env.client();
    await owner.register('shy_one', 'Password123');
    const stranger = env.client();
    await stranger.register('stranger1', 'Password123');
    await owner.ok('PATCH', '/api/me/settings', { privacy: { profileVisibility: 'friends', inventoryVisibility: 'nobody', friendRequests: 'nobody', searchable: false } });
    const id = owner.me.account.id;
    const prof = await stranger.ok('GET', `/api/accounts/${id}/profile`);
    assert.equal(prof.canView, false);
    assert.equal(prof.bio, '');
    assert.equal((await stranger.get(`/api/accounts/${id}/inventory`)).status, 403);
    assert.equal((await stranger.get(`/api/accounts/${id}/friends`)).status, 403);
    const fr = await stranger.post(`/api/social/friends/${id}/request`);
    assert.equal(fr.status, 403);
    const search = await stranger.ok('GET', '/api/search?q=shy_one&type=people');
    assert.equal(search.people.items.length, 0);
    assert.equal((await stranger.patch('/api/me/settings', { privacy: { bogus: true } })).status, 400);
  });
});

describe('social graph', () => {
  test('friend request → accept → friends; unfriend; follow/unfollow; notifications', async () => {
    const a = env.client();
    const b = env.client();
    await a.register('friend_a', 'Password123');
    await b.register('friend_b', 'Password123');
    const bid = b.me.account.id;
    const aid = a.me.account.id;
    assert.equal((await a.ok('POST', `/api/social/friends/${bid}/request`)).status, 'outgoing');
    const reqs = await b.ok('GET', '/api/social/requests');
    assert.equal(reqs.incoming.length, 1);
    assert.equal(reqs.incoming[0].account.username, 'friend_a');
    const notes = await b.ok('GET', '/api/notifications');
    assert.ok(notes.items.some((n) => n.type === 'friend_request'));
    await b.ok('POST', `/api/social/requests/${reqs.incoming[0].id}/accept`);
    const prof = await a.ok('GET', `/api/accounts/${bid}/profile`);
    assert.equal(prof.relationship.friendStatus, 'friends');
    assert.equal(prof.stats.friends, 1);
    const friends = await a.ok('GET', `/api/accounts/${aid}/friends`);
    assert.equal(friends.items[0].username, 'friend_b');

    await a.ok('POST', `/api/social/follow/${bid}`);
    assert.equal((await a.ok('GET', `/api/accounts/${bid}/followers`)).items[0].id, aid);
    assert.equal((await a.ok('GET', `/api/accounts/${aid}/following`)).items[0].id, bid);
    await a.ok('DELETE', `/api/social/follow/${bid}`);
    assert.equal((await a.ok('GET', `/api/accounts/${bid}/followers`)).items.length, 0);

    await a.ok('DELETE', `/api/social/friends/${bid}`);
    assert.equal((await a.ok('GET', `/api/accounts/${bid}/profile`)).relationship.friendStatus, 'none');
    assert.equal((await a.post(`/api/social/follow/${aid}`)).status, 400, 'cannot follow self');
  });

  test('mutual requests auto-accept and decline removes the request', async () => {
    const a = env.client();
    const b = env.client();
    await a.register('mutual_a', 'Password123');
    await b.register('mutual_b', 'Password123');
    await a.ok('POST', `/api/social/friends/${b.me.account.id}/request`);
    assert.equal((await b.ok('POST', `/api/social/friends/${a.me.account.id}/request`)).status, 'friends');
    const c = env.client();
    await c.register('decliner', 'Password123');
    await a.ok('POST', `/api/social/friends/${c.me.account.id}/request`);
    const reqId = (await c.ok('GET', '/api/social/requests')).incoming[0].id;
    await c.ok('POST', `/api/social/requests/${reqId}/decline`);
    assert.equal((await c.ok('GET', '/api/social/requests')).incoming.length, 0);
  });
});

describe('fictional economy, marketplace and inventory', () => {
  let c;
  let item;
  before(async () => {
    c = env.client();
    await c.register('shopper', 'Password123');
  });

  test('wallet shows a fictional-currency notice and the daily reward claims once', async () => {
    const w = await c.ok('GET', '/api/wallet');
    assert.equal(w.currency.fictional, true);
    assert.match(w.currency.notice, /fictional/i);
    const d = await c.ok('POST', '/api/wallet/daily');
    assert.equal(d.balance, 525);
    const again = await c.post('/api/wallet/daily');
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'daily_claimed');
  });

  test('catalog lists, filters, searches and sorts', async () => {
    const home = await c.ok('GET', '/api/catalog/home');
    assert.ok(home.featured.length > 0 && home.newest.length > 0 && home.limited.length > 0);
    const hats = await c.ok('GET', '/api/catalog/items?category=hats&sort=price_asc&limit=50');
    assert.ok(hats.items.every((i) => i.category === 'hat'));
    for (let i = 1; i < hats.items.length; i++) assert.ok(hats.items[i - 1].price <= hats.items[i].price);
    const clothing = await c.ok('GET', '/api/catalog/items?category=clothing&limit=100');
    assert.ok(clothing.items.every((i) => ['shirt', 'pants'].includes(i.category)));
    const search = await c.ok('GET', '/api/catalog/items?q=wings');
    assert.ok(search.items.length >= 2 && search.items.every((i) => /wings/i.test(i.name + i.tags.join(' ') + i.description)));
    const limited = await c.ok('GET', '/api/catalog/items?limited=1');
    assert.ok(limited.items.every((i) => i.isLimited));
    const ranged = await c.ok('GET', '/api/catalog/items?minPrice=100&maxPrice=200');
    assert.ok(ranged.items.every((i) => i.price >= 100 && i.price <= 200));
    assert.equal((await c.get('/api/catalog/items?sort=bogus')).status, 400);
    item = (await c.ok('GET', '/api/catalog/items?category=hats&sort=price_asc&onSale=1')).items.find((i) => i.price > 0 && i.price <= 500);
    assert.ok(item);
  });

  test('purchase flow: price check, debit, inventory, ledger, purchase history, creator share', async () => {
    const detail = await c.ok('GET', `/api/catalog/items/${item.id}`);
    assert.equal(detail.item.owned, false);
    assert.match(detail.notice, /fictional/i);
    assert.ok(detail.creator, 'seeded items have a creator');
    const before = (await c.ok('GET', '/api/wallet')).balance;
    const stale = await c.post(`/api/catalog/items/${item.id}/purchase`, { expectedPrice: item.price + 1 });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'price_changed');
    const res = await c.ok('POST', `/api/catalog/items/${item.id}/purchase`, { expectedPrice: item.price });
    assert.equal(res.balance, before - item.price);
    assert.equal(res.item.owned, true);
    assert.equal(res.fictional, true);
    const again = await c.post(`/api/catalog/items/${item.id}/purchase`, { expectedPrice: item.price });
    assert.equal(again.body.error.code, 'already_owned');
    const inv = await c.ok('GET', '/api/inventory?category=hats');
    assert.ok(inv.items.some((i) => i.id === item.id && i.source === 'purchase'));
    const tx = await c.ok('GET', '/api/wallet/transactions');
    assert.equal(tx.items[0].type, 'purchase');
    assert.equal(tx.items[0].amount, -item.price);
    assert.equal(tx.items[0].balanceAfter, res.balance);
    const purchases = await c.ok('GET', '/api/wallet/purchases');
    assert.equal(purchases.items[0].item.id, item.id);
    assert.equal(purchases.items[0].refundable, true);
    const hist = await c.ok('GET', `/api/inventory/${item.id}`);
    assert.equal(hist.history.at(-1).action, 'acquired');
    assert.equal(hist.purchase.pricePaid, item.price);
  });

  test('insufficient funds is refused atomically', async () => {
    const pricey = (await c.ok('GET', '/api/catalog/items?sort=price_desc&onSale=1&limit=1')).items[0];
    const before = (await c.ok('GET', '/api/wallet')).balance;
    const r = await c.post(`/api/catalog/items/${pricey.id}/purchase`, { expectedPrice: pricey.price });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'insufficient_funds');
    assert.equal((await c.ok('GET', '/api/wallet')).balance, before);
    assert.equal((await c.ok('GET', `/api/catalog/items/${pricey.id}`)).item.owned, false);
  });

  test('concurrent purchases can never overspend the wallet', async () => {
    const d = env.client();
    await d.register('racer', 'Password123');
    const cheap = (await d.ok('GET', '/api/catalog/items?minPrice=100&maxPrice=150&onSale=1&limit=10')).items.slice(0, 6);
    assert.ok(cheap.length >= 5);
    const results = await Promise.all(cheap.map((i) => d.post(`/api/catalog/items/${i.id}/purchase`, { expectedPrice: i.price })));
    const spent = cheap.filter((_, k) => results[k].status === 200).reduce((s, i) => s + i.price, 0);
    const w = await d.ok('GET', '/api/wallet');
    assert.ok(w.balance >= 0);
    assert.equal(w.balance, 500 - spent);
    assert.ok(results.some((r) => r.status === 409), 'at least one purchase was refused');
  });

  test('refund returns Sparks and removes the item from inventory and avatar', async () => {
    await c.ok('POST', '/api/avatar/equip', { itemId: item.id });
    const p = (await c.ok('GET', '/api/wallet/purchases')).items.find((x) => x.item.id === item.id);
    const before = (await c.ok('GET', '/api/wallet')).balance;
    const r = await c.ok('POST', `/api/wallet/purchases/${p.id}/refund`);
    assert.equal(r.balance, before + item.price);
    assert.equal((await c.ok('GET', `/api/catalog/items/${item.id}`)).item.owned, false);
    assert.ok(!(await c.ok('GET', '/api/avatar')).equipped.some((e) => e.itemId === item.id));
    assert.equal((await c.post(`/api/wallet/purchases/${p.id}/refund`)).status, 409);
  });

  test('bundles grant every contained item', async () => {
    const rich = env.client();
    await rich.register('bundler', 'Password123');
    const bundle = (await rich.ok('GET', '/api/catalog/items?category=bundles&sort=price_asc')).items[0];
    assert.ok(bundle.price <= 500, 'cheapest bundle fits a fresh wallet');
    const res = await rich.ok('POST', `/api/catalog/items/${bundle.id}/purchase`, { expectedPrice: bundle.price });
    assert.ok(res.addedItemIds.length >= bundle.bundleItemIds.length);
    const inv = await rich.ok('GET', '/api/inventory?limit=200');
    for (const child of bundle.bundleItemIds) assert.ok(inv.items.some((i) => i.id === child));
  });
});

describe('avatar editor', () => {
  test('equip, slot replacement, unequip, colors, outfits, reset persist', async () => {
    const c = env.client();
    await c.register('dresser', 'Password123');
    const inv = await c.ok('GET', '/api/inventory?limit=100');
    const hair = inv.items.find((i) => i.slot === 'hair');
    const freeHair = (await c.ok('GET', '/api/catalog/items?category=hair&sort=price_asc&hideOwned=1&minPrice=1&limit=1')).items[0];
    await c.ok('POST', `/api/catalog/items/${freeHair.id}/purchase`, { expectedPrice: freeHair.price });
    let av = await c.ok('POST', '/api/avatar/equip', { itemId: freeHair.id });
    assert.equal(av.equipped.filter((e) => e.slot === 'hair').length, 1);
    assert.equal(av.equipped.find((e) => e.slot === 'hair').itemId, freeHair.id);
    assert.ok(!av.equipped.some((e) => e.itemId === hair.id), 'previous hair was replaced');
    const notOwned = (await c.ok('GET', '/api/catalog/items?category=hats&hideOwned=1&limit=1')).items[0];
    assert.equal((await c.post('/api/avatar/equip', { itemId: notOwned.id })).body.error.code, 'not_owned');
    av = await c.ok('PATCH', '/api/avatar', { bodyColors: { torso: '#ff0000', head: '#00ff00' } });
    assert.equal(av.bodyColors.torso, '#ff0000');
    assert.equal((await c.patch('/api/avatar', { bodyColors: { torso: 'red' } })).status, 400);
    const outfit = await c.ok('POST', '/api/avatar/outfits', { name: 'Green look' });
    assert.equal(outfit.bodyColors.head, '#00ff00');
    av = await c.ok('POST', '/api/avatar/reset');
    assert.equal(av.bodyColors.torso, '#4f7cff');
    av = await c.ok('POST', `/api/avatar/outfits/${outfit.id}/wear`);
    assert.equal(av.avatar.bodyColors.head, '#00ff00');
    assert.ok(av.avatar.equipped.some((e) => e.itemId === freeHair.id));
    const again = await c.ok('GET', '/api/avatar');
    assert.equal(again.bodyColors.head, '#00ff00', 'persisted');
    await c.ok('POST', '/api/avatar/unequip', { itemId: freeHair.id });
    assert.ok(!(await c.ok('GET', '/api/avatar')).equipped.some((e) => e.itemId === freeHair.id));
    assert.equal((await c.ok('GET', '/api/avatar/outfits')).outfits.length, 1);
    await c.ok('DELETE', `/api/avatar/outfits/${outfit.id}`);
    assert.equal((await c.ok('GET', '/api/avatar/outfits')).outfits.length, 0);
  });
});

describe('groups, notifications, experiences, home and search', () => {
  test('groups: create costs Sparks, join, post, leave', async () => {
    const owner = env.client();
    await owner.register('grouper', 'Password123');
    const g = await owner.ok('POST', '/api/groups', { name: 'Test Guild', description: 'For tests', emblem: { shape: 'circle', color: '#112233', accent: '#ffffff', symbol: 'bolt' } });
    assert.equal(g.myRank, 'owner');
    assert.equal((await owner.ok('GET', '/api/wallet')).balance, 400);
    const member = env.client();
    await member.register('joiner', 'Password123');
    const joined = await member.ok('POST', `/api/groups/${g.id}/join`);
    assert.equal(joined.myRank, 'member');
    assert.equal(joined.members, 2);
    await member.ok('POST', `/api/groups/${g.id}/posts`, { body: 'Hi all' });
    const posts = await owner.ok('GET', `/api/groups/${g.id}/posts`);
    assert.equal(posts.items[0].body, 'Hi all');
    await owner.ok('PATCH', `/api/groups/${g.id}`, { shout: 'Meeting now' });
    assert.ok((await member.ok('GET', '/api/notifications')).items.some((n) => n.type === 'group'));
    await member.ok('POST', `/api/groups/${g.id}/leave`);
    assert.equal((await owner.post(`/api/groups/${g.id}/leave`)).status, 409, 'owner cannot leave');
    assert.equal((await member.post('/api/groups', { name: 'Test Guild' })).status, 409);
  });

  test('notifications: unread count, mark read, read all, delete', async () => {
    const c = env.client();
    await c.register('notified', 'Password123');
    let u = await c.ok('GET', '/api/notifications/unread-count');
    assert.equal(u.unread, 1, 'welcome notification');
    const list = await c.ok('GET', '/api/notifications');
    await c.ok('POST', `/api/notifications/${list.items[0].id}/read`);
    u = await c.ok('GET', '/api/notifications/unread-count');
    assert.equal(u.unread, 0);
    await c.ok('DELETE', `/api/notifications/${list.items[0].id}`);
    assert.equal((await c.ok('GET', '/api/notifications')).items.length, 0);
  });

  test('experiences: sorts, genre filter, detail, favorite, votes, history', async () => {
    const c = env.client();
    await c.register('explorer', 'Password123');
    for (const sort of ['featured', 'popular', 'top_rated', 'recent', 'recommended', 'newest', 'most_visited']) {
      const r = await c.ok('GET', `/api/experiences?sort=${sort}`);
      assert.ok(r.items.length > 0, sort);
    }
    const popular = (await c.ok('GET', '/api/experiences?sort=popular')).items;
    for (let i = 1; i < popular.length; i++) assert.ok(popular[i - 1].playing >= popular[i].playing);
    const obbies = (await c.ok('GET', '/api/experiences?sort=popular&genre=obby')).items;
    assert.ok(obbies.every((x) => x.genre === 'obby'));
    const flagship = (await c.ok('GET', '/api/experiences?sort=featured')).items.find((x) => x.engine === 'larp');
    const detail = await c.ok('GET', `/api/experiences/${flagship.id}`);
    assert.equal(detail.engine, 'larp');
    assert.ok(detail.creator);
    await c.ok('POST', `/api/experiences/${flagship.id}/favorite`);
    assert.equal((await c.ok('GET', '/api/experiences?sort=favorites')).items[0].id, flagship.id);
    const v1 = await c.ok('POST', `/api/experiences/${flagship.id}/vote`, { vote: 1 });
    const v2 = await c.ok('POST', `/api/experiences/${flagship.id}/vote`, { vote: -1 });
    assert.equal(v2.likes, v1.likes - 1);
    assert.equal(v2.dislikes, v1.dislikes + 1);
    const showcase = popular.find((x) => x.engine === 'showcase');
    const play = await c.ok('POST', `/api/experiences/${showcase.id}/play`);
    assert.equal(play.engine, 'showcase');
    assert.equal((await c.ok('GET', '/api/experiences?sort=history')).items[0].id, showcase.id);
    assert.equal((await c.ok('GET', '/api/me/history')).items[0].experience.id, showcase.id);
  });

  test('home aggregates the whole platform; unified search finds every type', async () => {
    const c = env.client();
    await c.loginOwner({ elevate: false });
    const home = await c.ok('GET', '/api/home');
    assert.equal(home.account.username, 'owner');
    assert.ok(home.featured.length && home.recommended.length && home.friends.length && home.recommendedItems.length);
    assert.ok(home.friends[0].presence.status !== 'offline', 'online friends sort first');
    const s = await c.ok('GET', '/api/search?q=nova');
    assert.ok(s.people.items.some((p) => p.username === 'NovaStudio'));
    assert.ok(s.groups.items.some((g) => g.name === 'Nova Studio Fans'));
    const s2 = await c.ok('GET', '/api/search?q=city');
    assert.ok(s2.experiences.items.length > 0);
    const s3 = await c.ok('GET', '/api/search?q=crown');
    assert.ok(s3.items.items.length > 0);
    const activity = await c.ok('GET', '/api/social/activity');
    assert.ok(activity.friends.length > 0);
  });

  test('verified badge shows on profile and is not presented as external verification', async () => {
    const c = env.client();
    const nova = await c.ok('GET', '/api/users/by-username/NovaStudio');
    assert.equal(nova.verified, true);
    const badge = nova.badgesFull.find((b) => b.key === 'roleplay_verified');
    assert.match(badge.description, /not an official verification/i);
    assert.equal(nova.perks.featuredCreator, true);
  });
});
