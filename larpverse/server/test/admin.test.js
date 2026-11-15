import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { boot, OWNER_PASSWORD, PNG_DATA_URL, sleep, totp } from './helpers.js';

let env;
let owner;
before(async () => {
  env = await boot();
  owner = env.client();
  await owner.loginOwner();
});
after(async () => { await env.close(); });

describe('Modify Menu access control', () => {
  test('regular users are denied every admin endpoint server-side', async () => {
    const u = env.client();
    await u.register('regular_rex', 'Password123');
    for (const [m, url] of [['GET', '/api/admin/overview'], ['GET', '/api/admin/accounts'], ['POST', '/api/admin/accounts'], ['POST', '/api/admin/accounts/1/wallet'], ['GET', '/api/admin/audit']]) {
      const r = await u.req(m, url, m === 'GET' ? undefined : {});
      assert.equal(r.status, 403, `${m} ${url}`);
    }
    assert.equal((await u.post('/api/security/elevate', { password: 'Password123' })).status, 403);
    assert.equal((await env.client().get('/api/admin/overview')).status, 401);
  });

  test('staff must unlock with their password; wrong password is audited', async () => {
    const o = env.client();
    await o.loginOwner({ elevate: false });
    const locked = await o.get('/api/admin/overview');
    assert.equal(locked.body.error.code, 'elevation_required');
    assert.equal((await o.post('/api/security/elevate', { password: 'not-it-123' })).status, 403);
    const r = await o.ok('POST', '/api/security/elevate', { password: OWNER_PASSWORD });
    assert.ok(r.elevatedUntil > Date.now());
    const ov = await o.ok('GET', '/api/admin/overview');
    assert.ok(ov.counts.accounts > 10);
    await o.ok('POST', '/api/security/lock');
    assert.equal((await o.get('/api/admin/overview')).body.error.code, 'elevation_required');
    const audit = await owner.ok('GET', '/api/admin/audit?action=admin.unlock_failed');
    assert.ok(audit.items.length >= 1);
  });

  test('moderators get only their permission set', async () => {
    await owner.ok('POST', '/api/admin/staff', { username: 'mod_mia', password: 'ModPass123', staffRole: 'moderator' });
    const m = env.client();
    await m.login('mod_mia', 'ModPass123');
    await m.ok('POST', '/api/security/elevate', { password: 'ModPass123' });
    assert.equal((await m.get('/api/admin/accounts')).status, 200);
    assert.equal((await m.post('/api/admin/accounts/1/wallet', { op: 'add', amount: 5 })).status, 403);
    assert.equal((await m.get('/api/admin/staff')).status, 403);
    const me = await m.ok('GET', '/api/me');
    assert.ok(me.account.badges.some((b) => b.key === 'moderator'), 'system badge follows the real staff role');
    // Owner grants a single extra permission.
    const staff = await owner.ok('GET', '/api/admin/staff');
    const mia = staff.users.find((u) => u.username === 'mod_mia');
    await owner.ok('PUT', `/api/admin/staff/${mia.id}/permissions`, { overrides: { 'currency.manage': true } });
    assert.equal((await m.post('/api/admin/accounts/1/wallet', { op: 'add', amount: 5, description: 'test' })).status, 200);
    // Demotion removes the badge and access.
    await owner.ok('PATCH', `/api/admin/staff/${mia.id}`, { staffRole: 'user' });
    assert.equal((await m.get('/api/admin/accounts')).status, 403);
    assert.ok(!(await m.ok('GET', '/api/me')).account.badges.some((b) => b.kind === 'system'));
    assert.equal((await owner.patch(`/api/admin/staff/${(await owner.ok('GET', '/api/me')).user.id}`, { staffRole: 'user' })).status, 400, 'cannot demote yourself');
  });
});

describe('account, currency, badge, inventory, social and avatar control', () => {
  let acc;
  test('create fictional account, edit everything, switch into it and back', async () => {
    acc = await owner.ok('POST', '/api/admin/accounts', { username: 'ScenePerson', displayName: 'Scene Person', bio: 'For the video', startingBalance: 1234 });
    assert.equal(acc.account.isFictional, true);
    assert.equal(acc.wallet.balance, 1234);
    const id = acc.account.id;
    const edited = await owner.ok('PATCH', `/api/admin/accounts/${id}`, {
      username: 'ScenePerson2', displayName: 'Scene P.', statusText: 'Live now', bannerColor: '#ff00aa',
      statOverrides: { followers: 250000, visits: 4000000, presence: 'online' }, joinDateOverride: Date.now() - 1000 * 86400_000,
    });
    assert.equal(edited.account.username, 'ScenePerson2');
    assert.equal(edited.stats.followers, 250000);
    const pic = await owner.ok('POST', `/api/admin/accounts/${id}/picture`, { dataUrl: PNG_DATA_URL });
    assert.match(pic.picture, /^\/files\//);
    const pub = await env.client().ok('GET', `/api/accounts/${id}/profile`);
    assert.equal(pub.stats.followers, 250000);
    assert.equal(pub.presence.status, 'online');
    assert.equal(pub.picture, pic.picture);
    await owner.ok('POST', `/api/admin/accounts/${id}/switch`);
    assert.equal((await owner.ok('GET', '/api/me')).account.id, id);
    const switchable = await owner.ok('GET', '/api/me/switchable');
    assert.ok(switchable.fictional.length + switchable.own.length > 10);
    const primary = switchable.own.find((a) => a.username === 'owner');
    await owner.ok('POST', '/api/me/switch', { accountId: primary.id });
  });

  test('disabled accounts cannot act', async () => {
    const id = acc.account.id;
    await owner.ok('PATCH', `/api/admin/accounts/${id}`, { status: 'disabled' });
    await owner.ok('POST', `/api/admin/accounts/${id}/switch`);
    const item = (await owner.ok('GET', '/api/catalog/items?category=hats&hideOwned=1&minPrice=1&limit=1')).items[0];
    const r = await owner.post(`/api/catalog/items/${item.id}/purchase`, { expectedPrice: item.price });
    assert.equal(r.body.error.code, 'account_disabled');
    await owner.ok('PATCH', `/api/admin/accounts/${id}`, { status: 'active' });
    const me = await owner.ok('GET', '/api/me');
    await owner.ok('POST', '/api/me/switch', { accountId: me.accounts.find((a) => a.username === 'owner').id });
  });

  test('currency: set / add / remove are atomic, ledgered, notified and audited', async () => {
    const id = acc.account.id;
    let r = await owner.ok('POST', `/api/admin/accounts/${id}/wallet`, { op: 'set', amount: 1000000, description: 'Scene setup' });
    assert.equal(r.balance, 1000000);
    r = await owner.ok('POST', `/api/admin/accounts/${id}/wallet`, { op: 'add', amount: 500, scripted: true, description: 'Group payout', notify: true });
    assert.equal(r.balance, 1000500);
    r = await owner.ok('POST', `/api/admin/accounts/${id}/wallet`, { op: 'remove', amount: 1000000 });
    assert.equal(r.balance, 500);
    const over = await owner.post(`/api/admin/accounts/${id}/wallet`, { op: 'remove', amount: 501 });
    assert.equal(over.body.error.code, 'insufficient_funds');
    const tx = await owner.ok('GET', `/api/admin/accounts/${id}/transactions`);
    assert.deepEqual(tx.items.slice(0, 3).map((t) => t.type), ['admin_remove', 'scripted', 'admin_set']);
    assert.equal(tx.items[1].scripted, true);
    const audit = await owner.ok('GET', `/api/admin/audit?action=currency.&targetId=${id}`);
    assert.equal(audit.items.length, 3);
    assert.equal(audit.items[2].details.after, 1000000);
    const global = await owner.ok('GET', `/api/admin/transactions?accountId=${id}&scripted=1`);
    assert.equal(global.items.length, 1);
  });

  test('badges: assign custom label, system badges require real staff, remove', async () => {
    const id = acc.account.id;
    const { badges } = await owner.ok('GET', '/api/admin/badges');
    const verified = badges.find((b) => b.key === 'roleplay_verified');
    const admin = badges.find((b) => b.key === 'administrator');
    const r = await owner.ok('POST', `/api/admin/accounts/${id}/badges`, { badgeId: verified.id, labelOverride: 'RP Verified Creator', notify: true });
    assert.equal(r.badges[0].label, 'RP Verified Creator');
    assert.equal((await env.client().ok('GET', `/api/accounts/${id}/profile`)).verified, true);
    const sys = await owner.post(`/api/admin/accounts/${id}/badges`, { badgeId: admin.id });
    assert.equal(sys.body.error.code, 'badge_requires_staff');
    const custom = await owner.ok('POST', '/api/admin/badges', { key: 'film_crew', name: 'Film Crew', description: 'Behind the camera', icon: 'camera', color: '#123456' });
    await owner.ok('POST', `/api/admin/accounts/${id}/badges`, { badgeId: custom.id });
    await owner.ok('PATCH', `/api/admin/badges/${custom.id}`, { name: 'Camera Crew' });
    const after2 = await owner.ok('DELETE', `/api/admin/accounts/${id}/badges/${verified.id}`);
    assert.ok(!after2.badges.some((b) => b.key === 'roleplay_verified'));
    assert.equal(after2.badges[0].name, 'Camera Crew');
    assert.equal((await owner.del(`/api/admin/badges/${verified.id}`)).status, 400, 'built-in badges are protected');
  });

  test('inventory: grant (even sold out), revoke, and repeatable purchase reset', async () => {
    const id = acc.account.id;
    const tiara = (await owner.ok('GET', '/api/admin/items?q=collectible-diamond-tiara')).items[0];
    const g = await owner.ok('POST', `/api/admin/accounts/${id}/inventory`, { itemId: tiara.id, equip: true, notify: true });
    assert.deepEqual(g.added, [tiara.id]);
    const inv = await owner.ok('GET', `/api/admin/accounts/${id}/inventory?category=collectibles`);
    assert.ok(inv.items[0].serial > 0, 'limited items get a serial number');
    assert.equal(inv.items[0].equipped, true);
    await owner.ok('DELETE', `/api/admin/accounts/${id}/inventory/${tiara.id}`);
    assert.equal((await owner.ok('GET', `/api/admin/accounts/${id}/inventory?category=collectibles`)).items.length, 0);

    await owner.ok('POST', `/api/admin/accounts/${id}/wallet`, { op: 'set', amount: 10000 });
    await owner.ok('POST', `/api/admin/accounts/${id}/switch`);
    const hat = (await owner.ok('GET', '/api/catalog/items?category=hats&hideOwned=1&minPrice=50&limit=1')).items[0];
    for (let round = 0; round < 2; round++) {
      await owner.ok('POST', `/api/catalog/items/${hat.id}/purchase`, { expectedPrice: hat.price });
      const reset = await owner.ok('POST', `/api/admin/accounts/${id}/reset-item`, { itemId: hat.id });
      assert.equal(reset.balance, 10000, `round ${round}: refunded`);
    }
    const me = await owner.ok('GET', '/api/me');
    await owner.ok('POST', '/api/me/switch', { accountId: me.accounts.find((a) => a.username === 'owner').id });
  });

  test('social: staged follows and friendships', async () => {
    const id = acc.account.id;
    const others = (await owner.ok('GET', '/api/admin/accounts?fictional=1&limit=4')).items.filter((x) => x.id !== id);
    await owner.ok('POST', '/api/admin/social/follow', { followerId: others[0].id, followeeId: id, notify: true });
    await owner.ok('POST', '/api/admin/social/friendship', { aId: id, bId: others[1].id, status: 'accepted' });
    await owner.ok('POST', '/api/admin/social/friendship', { aId: others[2].id, bId: id, status: 'pending', requesterId: others[2].id, notify: true });
    const s = await owner.ok('GET', `/api/admin/accounts/${id}/social`);
    assert.equal(s.followers.length, 1);
    assert.equal(s.friendships.filter((f) => f.status === 'accepted').length, 1);
    assert.equal(s.friendships.filter((f) => f.status === 'pending').length, 1);
    await owner.ok('POST', '/api/admin/social/follow', { followerId: others[0].id, followeeId: id, remove: true });
    assert.equal((await owner.ok('GET', `/api/admin/accounts/${id}/social`)).followers.length, 0);
  });

  test('avatar: recolor, grant+equip, outfits, reset', async () => {
    const id = acc.account.id;
    await owner.ok('PATCH', `/api/admin/accounts/${id}/avatar`, { bodyColors: { torso: '#00ffaa' } });
    const wings = (await owner.ok('GET', '/api/admin/items?q=accessory-feather-wings')).items[0];
    const av = await owner.ok('POST', `/api/admin/accounts/${id}/avatar/equip`, { itemId: wings.id, grant: true });
    assert.ok(av.equipped.some((e) => e.itemId === wings.id));
    const outfit = await owner.ok('POST', `/api/admin/accounts/${id}/outfits`, { name: 'Winged' });
    await owner.ok('POST', `/api/admin/accounts/${id}/avatar/reset`);
    const worn = await owner.ok('POST', `/api/admin/accounts/${id}/outfits/${outfit.id}/wear`);
    assert.equal(worn.avatar.bodyColors.torso, '#00ffaa');
    assert.ok(worn.avatar.equipped.some((e) => e.itemId === wings.id));
  });
});

describe('catalog, experiences, game and config control', () => {
  test('create and edit marketplace items; archived items disappear from the catalog', async () => {
    const it = await owner.ok('POST', '/api/admin/items', { name: 'Test Cap', category: 'hat', slot: 'hat', price: 77, rarity: 'rare', asset: { style: 'cap', colors: ['#ff0000', '#ffffff'] }, isLimited: true, stock: 2 });
    assert.equal(it.remaining, 2);
    const ed = await owner.ok('PATCH', `/api/admin/items/${it.id}`, { price: 88, rarity: 'epic', isFeatured: true });
    assert.equal(ed.price, 88);
    assert.equal(ed.rarity, 'epic');
    await owner.ok('POST', `/api/admin/items/${it.id}/thumbnail`, { dataUrl: PNG_DATA_URL });
    const buyerA = env.client();
    await buyerA.register('limited_a', 'Password123');
    const buyerB = env.client();
    await buyerB.register('limited_b', 'Password123');
    const buyerC = env.client();
    await buyerC.register('limited_c', 'Password123');
    await buyerA.ok('POST', `/api/catalog/items/${it.id}/purchase`, { expectedPrice: 88 });
    await buyerB.ok('POST', `/api/catalog/items/${it.id}/purchase`, { expectedPrice: 88 });
    const sold = await buyerC.post(`/api/catalog/items/${it.id}/purchase`, { expectedPrice: 88 });
    assert.equal(sold.body.error.code, 'sold_out', 'stock exhausted');
    const serials = (await buyerB.ok('GET', '/api/inventory?category=hats')).items.find((x) => x.id === it.id).serial;
    assert.equal(serials, 2);
    await owner.ok('PATCH', `/api/admin/items/${it.id}`, { isArchived: true });
    assert.equal((await buyerC.get(`/api/catalog/items/${it.id}`)).status, 404);
  });

  test('create and edit experiences including staged statistics', async () => {
    const e = await owner.ok('POST', '/api/admin/experiences', { name: 'Test World', genre: 'adventure', engine: 'showcase', art: { palette: ['#000000', '#ffffff'], motif: 'islands' } });
    const ed = await owner.ok('PATCH', `/api/admin/experiences/${e.id}`, { visits: 5_000_000, activeOverride: 4321, isFeatured: true, description: 'Updated' });
    assert.equal(ed.visits, 5_000_000);
    assert.equal(ed.playing, 4321);
    const pub = await env.client().ok('GET', `/api/experiences/${e.id}`);
    assert.equal(pub.description, 'Updated');
    const t = await owner.ok('POST', `/api/admin/experiences/${e.id}/thumbnail`, { dataUrl: PNG_DATA_URL });
    assert.match(t.thumbnail, /^\/files\//);
  });

  test('game: roles CRUD, scenario edit, staff-managed session with extras and events', async () => {
    const r = await owner.ok('POST', '/api/admin/game/roles', { key: 'firefighter', name: 'Firefighter', salary: 33, workZone: 'police', permissions: ['heal'], color: '#ff5500' });
    const meta = await env.client().ok('GET', '/api/game/meta');
    assert.ok(meta.roles.some((x) => x.key === 'firefighter'));
    await owner.ok('PATCH', `/api/admin/game/roles/${r.id}`, { salary: 44 });
    const scen = (await owner.ok('GET', '/api/admin/game/scenarios')).scenarios.find((s) => s.key === 'sandbox');
    await owner.ok('PATCH', `/api/admin/game/scenarios/${scen.id}`, { config: { startingCash: 4242, roles: [...scen.config.roles, 'firefighter'] } });
    const dup = await owner.ok('POST', `/api/admin/game/scenarios/${scen.id}/duplicate`);
    assert.match(dup.name, /copy/);
    const flagship = (await env.client().ok('GET', '/api/experiences?sort=featured')).items.find((x) => x.engine === 'larp');
    const host = (await owner.ok('GET', '/api/admin/accounts?q=MayorMaple')).items[0];
    const s = await owner.ok('POST', '/api/admin/game/sessions', { hostAccountId: host.id, experienceId: flagship.id, scenarioId: scen.id, name: 'Staff Session' });
    const extra = (await owner.ok('GET', '/api/admin/accounts?q=Starlight')).items[0];
    await owner.ok('POST', `/api/admin/game/sessions/${s.id}/participants`, { accountId: extra.id, roleId: r.id });
    await owner.ok('POST', `/api/admin/game/sessions/${s.id}/control`, { action: 'start' });
    const ev = await owner.ok('POST', `/api/admin/game/sessions/${s.id}/event`, { type: 'award_ceremony', params: { title: 'Test Award', winner: 'random', allowBots: true, rewardSparks: 321, badgeKey: 'special_event' } });
    assert.ok(ev.winner.rewards.length >= 1);
    const winner = await env.client().ok('GET', `/api/accounts/${ev.winner.accountId}/profile`);
    assert.ok(winner.badgesFull.some((b) => b.key === 'special_event'));
    const detail = await owner.ok('GET', `/api/game/sessions/${s.id}`);
    assert.equal(detail.participants.find((p) => p.accountId === extra.id).role.key, 'firefighter');
    await owner.ok('POST', `/api/admin/game/sessions/${s.id}/control`, { action: 'end' });
    const all = await owner.ok('GET', '/api/admin/game/sessions?status=ended');
    assert.ok(all.sessions.some((x) => x.id === s.id && x.summary));
  });

  test('economy config changes apply to new accounts', async () => {
    await owner.ok('PATCH', '/api/admin/config', { economy: { startingBalance: 777, dailyReward: 99 } });
    const c = env.client();
    const res = await c.register('after_config', 'Password123');
    assert.equal(res.me.wallet.balance, 777);
    assert.equal((await c.ok('POST', '/api/wallet/daily')).amount, 99);
    await owner.ok('PATCH', '/api/admin/config', { economy: { startingBalance: 500, dailyReward: 25 } });
    assert.equal((await owner.patch('/api/admin/config', { economy: { startingBalance: -1 } })).status, 400);
  });
});

describe('scripted events', () => {
  test('platform events: notifications (incl. delayed), transactions, follower surge, rewards, drops', async () => {
    const target = await owner.ok('POST', '/api/admin/accounts', { username: 'EventTarget', startingBalance: 100 });
    const id = target.account.id;
    const { events } = await owner.ok('GET', '/api/admin/events');
    const byName = (n) => events.find((e) => e.name === n);
    await owner.ok('POST', `/api/admin/events/${byName('Welcome bonus payout').id}/run`, { accountIds: [id] });
    assert.equal((await owner.ok('GET', `/api/admin/accounts/${id}`)).wallet.balance, 1100);
    await owner.ok('POST', `/api/admin/events/${byName('Follower surge (10K)').id}/run`, { accountIds: [id] });
    const stats = (await owner.ok('GET', `/api/admin/accounts/${id}`)).stats;
    assert.equal(stats.followers, 10000);
    assert.equal(stats.real.followers, 5);
    await owner.ok('POST', `/api/admin/events/${byName('Friend request wave').id}/run`, { accountIds: [id] });
    await owner.ok('POST', `/api/admin/events/${byName("Founder's Halo reward").id}/run`, { accountIds: [id] });
    const inv = await owner.ok('GET', `/api/admin/accounts/${id}/inventory?category=special`);
    assert.ok(inv.items.some((i) => i.sku === 'special-founder-s-halo'));
    const run = await owner.ok('POST', `/api/admin/events/${byName('Delayed message (5s)').id}/run`, { accountIds: [id], overrides: { delaySeconds: 1 } });
    assert.equal(run.result.details[0].scheduled, true);
    await owner.ok('POST', `/api/admin/accounts/${id}/switch`);
    const before = (await owner.ok('GET', '/api/notifications')).items.length;
    await sleep(2300);
    const afterN = await owner.ok('GET', '/api/notifications');
    assert.equal(afterN.items.length, before + 1);
    assert.equal(afterN.items[0].title, 'You have a new message');
    assert.ok(afterN.items.some((n) => n.type === 'friend_request'));
    const me = await owner.ok('GET', '/api/me');
    await owner.ok('POST', '/api/me/switch', { accountId: me.accounts.find((a) => a.username === 'owner').id });
    const drop = await owner.ok('POST', `/api/admin/events/${byName('Limited drop: Neon Shades').id}/run`, { accountIds: [id] });
    assert.equal(drop.result.details[0].name, 'Neon Shades');
    const detail = (await owner.ok('GET', '/api/admin/events')).events.find((e) => e.name === 'Welcome bonus payout');
    assert.equal(detail.runCount, 1);
    const runs = await owner.ok('GET', `/api/admin/events/${detail.id}/runs`);
    assert.equal(runs.runs.length, 1);
  });

  test('create, edit, duplicate, delete events; invalid types rejected; ad-hoc runs', async () => {
    const e = await owner.ok('POST', '/api/admin/events', { name: 'Custom note', scope: 'platform', type: 'notification', params: { title: 'Hi' } });
    assert.equal((await owner.post('/api/admin/events', { name: 'Bad', scope: 'platform', type: 'coin_rain' })).status, 400);
    await owner.ok('PATCH', `/api/admin/events/${e.id}`, { params: { title: 'Hello' } });
    const d = await owner.ok('POST', `/api/admin/events/${e.id}/duplicate`);
    assert.equal(d.params.title, 'Hello');
    await owner.ok('DELETE', `/api/admin/events/${d.id}`);
    const target = (await owner.ok('GET', '/api/admin/accounts?q=EventTarget')).items[0];
    const before = (await owner.ok('GET', `/api/admin/accounts/${target.id}`)).wallet.balance;
    await owner.ok('POST', '/api/admin/events/run-adhoc', { scope: 'platform', type: 'scripted_transaction', params: { amount: -100, description: 'Fine' }, accountIds: [target.id] });
    assert.equal((await owner.ok('GET', `/api/admin/accounts/${target.id}`)).wallet.balance, before - 100);
    assert.equal((await owner.post('/api/admin/events/run-adhoc', { scope: 'game', type: 'coin_rain' })).status, 400, 'game events need a session');
  });
});

describe('scenario presets', () => {
  test('every seeded preset applies cleanly', async () => {
    const { presets, kinds } = await owner.ok('GET', '/api/admin/presets');
    for (const k of kinds) assert.ok(presets.some((p) => p.kind === k), `preset for ${k}`);
    for (const p of presets) {
      const acc = await owner.ok('POST', '/api/admin/accounts', { username: `Preset${p.id}x` });
      const r = await owner.ok('POST', `/api/admin/presets/${p.id}/apply`, { accountId: acc.account.id });
      const real = r.report.skipped.filter((s) => !s.extra);
      assert.deepEqual(real, [], `${p.name} applied without skips`);
      const view = await owner.ok('GET', `/api/admin/accounts/${acc.account.id}`);
      if (p.data.balance !== undefined) assert.equal(view.wallet.balance, p.data.balance, `${p.name} balance`);
      if (p.kind === 'verified') assert.equal(view.card.verified, true);
      if (p.kind === 'collector') assert.ok(view.badges.some((b) => b.key === 'collector'));
      if (p.kind === 'larp_session') {
        assert.ok(r.report.session?.id);
        const s = await owner.ok('GET', `/api/game/sessions/${r.report.session.id}`);
        assert.equal(s.status, 'active');
        assert.ok(s.participants.filter((x) => x.isBot).length >= 3);
        await owner.ok('POST', `/api/admin/game/sessions/${s.id}/control`, { action: 'end' });
      }
    }
  });

  test('snapshot an account, export, import, duplicate, edit and re-apply', async () => {
    const src = (await owner.ok('GET', '/api/admin/accounts?q=EchoFrost')).items[0];
    const snap = await owner.ok('POST', `/api/admin/presets/from-account/${src.id}`, { name: 'Echo snapshot', kind: 'collector' });
    assert.ok(snap.data.inventory.skus.length > 5);
    const exported = await owner.ok('GET', `/api/admin/presets/${snap.id}/export`);
    assert.equal(exported.format, 'larpverse-preset');
    const imported = await owner.ok('POST', '/api/admin/presets/import', exported);
    assert.equal(imported.name, 'Echo snapshot');
    assert.equal((await owner.post('/api/admin/presets/import', { hello: 1 })).status, 400);
    const dup = await owner.ok('POST', `/api/admin/presets/${imported.id}/duplicate`);
    await owner.ok('PATCH', `/api/admin/presets/${dup.id}`, { name: 'Echo v2', data: { ...dup.data, balance: 999 } });
    assert.equal((await owner.patch(`/api/admin/presets/${dup.id}`, { data: { balance: -5 } })).status, 400);
    const blank = await owner.ok('POST', '/api/admin/accounts', { username: 'CloneTarget' });
    await owner.ok('POST', `/api/admin/presets/${dup.id}/apply`, { accountId: blank.account.id, switchTo: true });
    const me = await owner.ok('GET', '/api/me');
    assert.equal(me.account.id, blank.account.id, 'switched into the account');
    assert.equal(me.wallet.balance, 999);
    const srcView = await owner.ok('GET', `/api/admin/accounts/${src.id}`);
    assert.equal(me.account.avatar.items.length, srcView.card.avatar.items.length);
    await owner.ok('POST', '/api/me/switch', { accountId: me.accounts.find((a) => a.username === 'owner').id });
    await owner.ok('DELETE', `/api/admin/presets/${dup.id}`);
  });
});

describe('two-step verification', () => {
  test('setup, enable, login requires code, elevate requires code, disable', async () => {
    const c = env.client();
    await c.register('mfa_user', 'Password123');
    const setup = await c.ok('POST', '/api/security/mfa/setup');
    assert.match(setup.otpauthUrl, /^otpauth:\/\/totp\//);
    assert.equal((await c.post('/api/security/mfa/enable', { code: '000000' })).status, 400);
    await c.ok('POST', '/api/security/mfa/enable', { code: totp(setup.secret) });
    const step1 = await env.client().ok('POST', '/api/auth/login', { username: 'mfa_user', password: 'Password123' });
    assert.equal(step1.mfaRequired, true);
    assert.equal(step1.token, undefined);
    const bad = await env.client().post('/api/auth/login/mfa', { mfaToken: step1.mfaToken, code: '123456' });
    assert.equal(bad.status, 401);
    const good = await env.client().ok('POST', '/api/auth/login/mfa', { mfaToken: step1.mfaToken, code: totp(setup.secret) });
    assert.ok(good.token);
    assert.equal(good.me.user.mfaEnabled, true);
    await c.ok('POST', '/api/security/mfa/disable', { password: 'Password123', code: totp(setup.secret) });
    assert.ok((await env.client().ok('POST', '/api/auth/login', { username: 'mfa_user', password: 'Password123' })).token);
  });
});

describe('audit log', () => {
  test('admin operations are recorded with actor and details', async () => {
    const log = await owner.ok('GET', '/api/admin/audit?limit=200');
    const actions = new Set(log.items.map((l) => l.action));
    for (const a of ['account.create', 'account.update', 'account.switch', 'currency.set', 'badge.assign', 'inventory.grant', 'preset.apply', 'event.run', 'game.session_create', 'item.create', 'config.update', 'staff.create']) {
      assert.ok(actions.has(a), `audit has ${a}`);
    }
    assert.ok(log.items.every((l) => l.user));
  });
});

describe('platform hardening', () => {
  test('rate limiting on sign-in', async () => {
    const strict = await boot({ rateLimits: { api: { limit: 1000, windowMs: 60_000 }, auth: { limit: 5, windowMs: 60_000 }, write: { limit: 1000, windowMs: 60_000 } }, seedDemo: false });
    try {
      const c = strict.client();
      const codes = [];
      for (let i = 0; i < 7; i++) codes.push((await c.post('/api/auth/login', { username: 'nobody', password: 'whatever1' })).status);
      assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
      assert.equal(codes[6], 429);
    } finally {
      await strict.close();
    }
  });

  test('malformed and oversized requests are rejected; security headers present', async () => {
    const c = env.client();
    const r = await fetch(`${env.base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
    assert.equal(r.status, 400);
    const big = await fetch(`${env.base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'x'.repeat(400000) }) });
    assert.equal(big.status, 413);
    const h = await fetch(`${env.base}/api/health`);
    assert.equal(h.headers.get('x-frame-options'), 'DENY');
    assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await c.get('/api/nope')).status, 404);
    assert.equal((await fetch(`${env.base}/files/..%2F..%2Fetc%2Fpasswd`)).status, 404);
  });
});
