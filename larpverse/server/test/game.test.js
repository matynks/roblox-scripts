import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { boot, sleep } from './helpers.js';

let env;
let meta;
let flagship;
const role = (key) => meta.roles.find((r) => r.key === key);
const scenario = (key) => meta.scenarios.find((s) => s.key === key);

before(async () => {
  env = await boot();
  const c = env.client();
  meta = await c.ok('GET', '/api/game/meta');
  flagship = (await c.ok('GET', '/api/experiences?sort=featured')).items.find((x) => x.engine === 'larp');
});
after(async () => { await env.close(); });

describe('characters', () => {
  test('create, list, edit, delete characters with appearance', async () => {
    const c = env.client();
    await c.register('char_maker', 'Password123');
    const ch = await c.ok('POST', '/api/game/characters', { name: 'Detective Rae', bio: 'Solves mysteries', useAvatar: false, look: { shirt: '#112233', pants: '#445566' }, favoriteRoleId: role('police').id });
    assert.equal(ch.name, 'Detective Rae');
    assert.equal(ch.look.shirt, '#112233');
    assert.equal(ch.stats.level, 1);
    const edited = await c.ok('PATCH', `/api/game/characters/${ch.id}`, { name: 'Inspector Rae', useAvatar: true });
    assert.equal(edited.name, 'Inspector Rae');
    assert.equal(edited.appearance.useAvatar, true);
    assert.equal((await c.ok('GET', '/api/game/characters')).characters.length, 1);
    await c.ok('DELETE', `/api/game/characters/${ch.id}`);
    assert.equal((await c.ok('GET', '/api/game/characters')).characters.length, 0);
    const other = env.client();
    await other.register('char_thief', 'Password123');
    const mine = await c.ok('POST', '/api/game/characters', { name: 'Mine' });
    assert.equal((await other.patch(`/api/game/characters/${mine.id}`, { name: 'Stolen' })).status, 404);
  });
});

describe('LARP sessions', () => {
  let host;
  let guest;
  let session;
  let hostStream;
  let guestStream;

  before(async () => {
    host = env.client();
    guest = env.client();
    await host.register('host_hana', 'Password123');
    await guest.register('guest_gio', 'Password123');
  });
  after(() => { hostStream?.close(); guestStream?.close(); });

  test('host creates a session in the lobby with a scenario and joins as host', async () => {
    session = await host.ok('POST', '/api/game/sessions', { experienceId: flagship.id, scenarioId: scenario('city_life').id, name: 'Test City', roleId: role('shopkeeper').id });
    assert.equal(session.status, 'lobby');
    assert.equal(session.players, 1);
    assert.ok(session.accessCode, 'host sees the join code');
    const detail = await host.ok('GET', `/api/game/sessions/${session.id}`);
    assert.equal(detail.isHost, true);
    assert.equal(detail.participants[0].role.key, 'shopkeeper');
    const list = await guest.ok('GET', `/api/game/sessions?experienceId=${flagship.id}`);
    assert.ok(list.sessions.some((s) => s.id === session.id));
    assert.equal(list.sessions.find((s) => s.id === session.id).accessCode, undefined, 'code hidden from non-hosts');
  });

  test('guest joins; role limits and host-only roles are enforced', async () => {
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/join`, { roleId: role('director').id })).status, 403);
    const j = await guest.ok('POST', `/api/game/sessions/${session.id}/join`, { roleId: role('mayor').id });
    assert.equal(j.players, 2);
    const third = env.client();
    await third.register('third_tao', 'Password123');
    const full = await third.post(`/api/game/sessions/${session.id}/join`, { roleId: role('mayor').id });
    assert.equal(full.body.error.code, 'role_full');
    await third.ok('POST', `/api/game/sessions/${session.id}/join`, {});
    const d = await host.ok('GET', `/api/game/sessions/${session.id}`);
    assert.equal(d.participants.find((p) => p.username === 'third_tao').role.key, 'citizen', 'default role');
    await third.ok('POST', `/api/game/sessions/${session.id}/leave`);
    assert.ok(env.client(), 'characters are auto-created on first join');
    assert.equal((await guest.ok('GET', '/api/game/characters')).characters.length, 1);
  });

  test('only the host can control the session; actions wait for start', async () => {
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/control`, { action: 'start' })).status, 403);
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/kick`, { accountId: host.me.account.id })).status, 403);
    const early = await guest.post(`/api/game/sessions/${session.id}/action`, { type: 'work' });
    assert.equal(early.body.error.code, 'not_active');
    const s = await host.ok('POST', `/api/game/sessions/${session.id}/control`, { action: 'start' });
    assert.equal(s.status, 'active');
  });

  test('stream delivers init with world, roles, players and objectives; ticks follow', async () => {
    hostStream = await host.stream(`/api/game/sessions/${session.id}/stream`);
    guestStream = await guest.stream(`/api/game/sessions/${session.id}/stream`);
    const init = await hostStream.waitFor((m) => m.type === 'init');
    assert.equal(init.status, 'active');
    assert.ok(init.world.zones.length >= 10 && init.world.walls.length > 20);
    assert.equal(init.players.length, 2);
    assert.ok(init.self.objectives.length >= 4);
    assert.ok(init.pickups.length > 0);
    assert.equal(init.session.accessCode !== undefined, true);
    await hostStream.waitFor((m) => m.type === 'tick');
    const presence = await env.client().ok('GET', `/api/accounts/${host.me.account.id}/summary`);
    assert.equal(presence.presence.status, 'in_experience');
    const exp = await env.client().ok('GET', `/api/experiences/${flagship.id}`);
    assert.ok(exp.livePlaying >= 2);
  });

  test('server-authoritative movement through a building door, then work and buy at the market', async () => {
    const id = host.me.account.id;
    const tick0 = await hostStream.waitFor((m) => m.type === 'tick' && m.p.some((p) => p[0] === id));
    const start = tick0.p.find((p) => p[0] === id);
    await host.ok('POST', `/api/game/sessions/${session.id}/input`, { x: 0, y: -1 });
    await sleep(800);
    await host.ok('POST', `/api/game/sessions/${session.id}/input`, { x: 0, y: 0 });
    await sleep(150);
    const tick1 = hostStream.messages.filter((m) => m.type === 'tick').at(-1);
    const now = tick1.p.find((p) => p[0] === id);
    assert.ok(now[2] < start[2] - 100, `moved north into the market (${start[2]} → ${now[2]})`);
    const work = await host.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'work' });
    assert.equal(work.earned, role('shopkeeper').salary);
    assert.equal(work.self.stats.shifts, 1);
    const cool = await host.post(`/api/game/sessions/${session.id}/action`, { type: 'work' });
    assert.equal(cool.body.error.code, 'cooldown');
    const soda = meta.gameItems.find((i) => i.key === 'soda');
    const buy = await host.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'buy', itemId: soda.id });
    assert.equal(buy.price, soda.price);
    assert.ok(buy.self.inventory.some((i) => i.id === soda.id));
    const use = await host.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'use', itemId: soda.id });
    assert.equal(use.used, 'soda');
    const coffee = meta.gameItems.find((i) => i.key === 'coffee');
    assert.equal((await host.post(`/api/game/sessions/${session.id}/action`, { type: 'buy', itemId: coffee.id })).body.error.code, 'wrong_place');
  });

  test('role permissions: only police cite, only medics heal; mayor announcements reach everyone', async () => {
    const cite = await guest.post(`/api/game/sessions/${session.id}/action`, { type: 'cite', targetId: host.me.account.id });
    assert.equal(cite.status, 403);
    const heal = await guest.post(`/api/game/sessions/${session.id}/action`, { type: 'heal', targetId: host.me.account.id });
    assert.equal(heal.status, 403);
    await guest.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'announce', text: 'Free coffee today' });
    const banner = await hostStream.waitFor((m) => m.type === 'banner' && /Free coffee/.test(m.banner.text));
    assert.match(banner.banner.text, /Mayor/);
  });

  test('chat counts toward objectives and emotes require ownership', async () => {
    const r = await guest.ok('POST', `/api/game/sessions/${session.id}/chat`, { text: 'Hello city!' });
    assert.equal(r.message.text, 'Hello city!');
    const msg = await hostStream.waitFor((m) => m.type === 'chat' && m.message.text === 'Hello city!');
    assert.equal(msg.message.name, 'guest_gio');
    const self = await guestStream.waitFor((m) => m.type === 'self' && m.self.stats.chats === 1);
    assert.ok(self.self.objectives.find((o) => o.type === 'chat').progress === 1);
    await guest.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'emote', emote: 'wave' });
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/action`, { type: 'emote', emote: 'victory' })).status, 403);
  });

  test('host triggers scripted events: spark shower spawns pickups, sale changes prices', async () => {
    const r = await host.ok('POST', `/api/game/sessions/${session.id}/event`, { type: 'coin_rain', params: { count: 7 } });
    assert.equal(r.spawned, 7);
    const pk = await guestStream.waitFor((m) => m.type === 'pickups' && m.add?.length === 7);
    assert.ok(pk.add.every((p) => p.type === 'spark'));
    await host.ok('POST', `/api/game/sessions/${session.id}/event`, { type: 'market_sale', params: { multiplier: 0.5, durationSeconds: 30 } });
    await sleep(2600);
    const sandwich = meta.gameItems.find((i) => i.key === 'sandwich');
    const buy = await host.ok('POST', `/api/game/sessions/${session.id}/action`, { type: 'buy', itemId: sandwich.id });
    assert.equal(buy.price, Math.round(sandwich.price * 0.5));
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/event`, { type: 'blackout' })).status, 403, 'guests cannot trigger events');
    const storedEvent = (await env.client().loginOwner().then((o) => o.ok('GET', '/api/admin/events'))).events.find((e) => e.type === 'breaking_news');
    const byId = await host.ok('POST', `/api/game/sessions/${session.id}/event`, { eventId: storedEvent.id });
    assert.equal(byId.type, 'breaking_news');
  });

  test('host assigns roles, pauses, resets and kicks; kicked players cannot rejoin', async () => {
    await host.ok('POST', `/api/game/sessions/${session.id}/assign-role`, { accountId: guest.me.account.id, roleId: role('reporter').id });
    const d = await host.ok('GET', `/api/game/sessions/${session.id}`);
    assert.equal(d.participants.find((p) => p.username === 'guest_gio').role.key, 'reporter');
    assert.equal((await host.ok('POST', `/api/game/sessions/${session.id}/control`, { action: 'pause' })).status, 'paused');
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/action`, { type: 'work' })).body.error.code, 'not_active');
    await host.ok('POST', `/api/game/sessions/${session.id}/control`, { action: 'resume' });
    await host.ok('POST', `/api/game/sessions/${session.id}/control`, { action: 'reset' });
    const reset = await guestStream.waitFor((m) => m.type === 'reset');
    assert.ok(reset.pickups.length > 0);
    const intruder = env.client();
    await intruder.register('intruder', 'Password123');
    await intruder.ok('POST', `/api/game/sessions/${session.id}/join`, {});
    await host.ok('POST', `/api/game/sessions/${session.id}/kick`, { accountId: intruder.me.account.id });
    const back = await intruder.post(`/api/game/sessions/${session.id}/join`, {});
    assert.equal(back.body.error.code, 'kicked');
  });

  test('ending the session writes a summary, persists characters and closes streams', async () => {
    const res = await host.ok('POST', `/api/game/sessions/${session.id}/control`, { action: 'end' });
    assert.equal(res.status, 'ended');
    assert.ok(res.summary.participants.length >= 2);
    const ended = await guestStream.waitFor((m) => m.type === 'ended');
    assert.ok(ended.summary.durationMs > 0);
    const chars = await host.ok('GET', '/api/game/characters');
    assert.ok(chars.characters[0].stats.xp > 0, 'character XP persisted');
    assert.equal(chars.characters[0].stats.sessions, 1);
    const hist = await host.ok('GET', '/api/game/history');
    assert.equal(hist.items[0].id, session.id);
    assert.equal(hist.items[0].status, 'ended');
    assert.equal((await guest.post(`/api/game/sessions/${session.id}/join`, {})).status, 404);
  });
});

describe('session privacy, codes, invites and objectives completion', () => {
  test('private sessions need the code; join-code works; invites notify', async () => {
    const host = env.client();
    await host.register('private_host', 'Password123');
    const s = await host.ok('POST', '/api/game/sessions', { experienceId: flagship.id, privacy: 'private', scenarioId: scenario('sandbox').id });
    const other = env.client();
    await other.register('code_user', 'Password123');
    assert.ok(!(await other.ok('GET', '/api/game/sessions')).sessions.some((x) => x.id === s.id), 'private session hidden');
    assert.equal((await other.post(`/api/game/sessions/${s.id}/join`, {})).body.error.code, 'code_required');
    await other.ok('POST', '/api/game/join-code', { code: s.accessCode.toLowerCase() });
    const friend = env.client();
    await friend.register('invitee', 'Password123');
    await host.ok('POST', `/api/game/sessions/${s.id}/invite`, { accountId: friend.me.account.id });
    const n = (await friend.ok('GET', '/api/notifications')).items.find((x) => x.type === 'game_invite');
    assert.equal(n.data.sessionId, s.id);
    await friend.ok('POST', `/api/game/sessions/${s.id}/join`, { accessCode: n.data.accessCode });
  });

  test('completing every objective pays a fictional Sparks reward once', async () => {
    const owner = env.client();
    await owner.loginOwner();
    const scen = await owner.ok('POST', '/api/admin/game/scenarios', {
      key: 'quick_test', name: 'Quick Test', config: { roles: ['citizen', 'performer'], startingCash: 10, objectives: [{ type: 'chat', target: 1, label: 'Say hi' }], completionReward: 40, autoEvents: [] },
    });
    const p = env.client();
    await p.register('achiever', 'Password123');
    const s = await p.ok('POST', '/api/game/sessions', { experienceId: flagship.id, scenarioId: scen.id });
    await p.ok('POST', `/api/game/sessions/${s.id}/control`, { action: 'start' });
    const before = (await p.ok('GET', '/api/wallet')).balance;
    await p.ok('POST', `/api/game/sessions/${s.id}/chat`, { text: 'hi' });
    await sleep(100);
    const after1 = (await p.ok('GET', '/api/wallet')).balance;
    assert.equal(after1, before + 40);
    await sleep(800);
    await p.ok('POST', `/api/game/sessions/${s.id}/chat`, { text: 'hi again' });
    assert.equal((await p.ok('GET', '/api/wallet')).balance, after1, 'reward paid once');
    const tx = await p.ok('GET', '/api/wallet/transactions?type=game_reward');
    assert.equal(tx.items.length, 1);
  });

  test('hosts cannot mint platform rewards through events', async () => {
    const h = env.client();
    await h.register('greedy_host', 'Password123');
    const s = await h.ok('POST', '/api/game/sessions', { experienceId: flagship.id, scenarioId: scenario('sandbox').id });
    await h.ok('POST', `/api/game/sessions/${s.id}/control`, { action: 'start' });
    const before = (await h.ok('GET', '/api/wallet')).balance;
    const r = await h.ok('POST', `/api/game/sessions/${s.id}/event`, { type: 'award_ceremony', params: { rewardSparks: 1000000, badgeKey: 'roleplay_verified', rewardItemSku: 'collectible-golden-crown-of-larpverse' } });
    assert.deepEqual(r.winner.rewards, []);
    const owner = env.client();
    await owner.loginOwner();
    const stored = (await owner.ok('GET', '/api/admin/events')).events.find((e) => e.type === 'award_ceremony');
    const r2 = await h.ok('POST', `/api/game/sessions/${s.id}/event`, { eventId: stored.id, params: { rewardSparks: 999999 } });
    assert.deepEqual(r2.winner.rewards, []);
    assert.equal((await h.ok('GET', '/api/wallet')).balance, before);
    const prof = await h.ok('GET', `/api/accounts/${h.me.account.id}/profile`);
    assert.equal(prof.verified, false);
    const bonus = await h.ok('POST', `/api/game/sessions/${s.id}/event`, { type: 'cash_bonus', params: { amount: 999999 } });
    assert.equal(bonus.type, 'cash_bonus');
    const stream = await h.stream(`/api/game/sessions/${s.id}/stream`);
    const init = await stream.waitFor((m) => m.type === 'init');
    assert.ok(init.self.cash <= 1000 + 500, 'in-game bonus capped for hosts');
    stream.close();
  });

  test('performers earn tips on stage and roleplay extras wander the city', async () => {
    const owner = env.client();
    await owner.loginOwner();
    const p = env.client();
    await p.register('singer', 'Password123');
    const s = await p.ok('POST', '/api/game/sessions', { experienceId: flagship.id, scenarioId: scenario('star_awards').id, roleId: role('performer').id });
    await p.ok('POST', `/api/game/sessions/${s.id}/control`, { action: 'start' });
    const perf = await p.ok('POST', `/api/game/sessions/${s.id}/action`, { type: 'perform' });
    assert.ok(perf.tips >= role('performer').salary);
    const extras = (await owner.ok('GET', '/api/admin/accounts?fictional=1&limit=3')).items;
    for (const x of extras) await owner.ok('POST', `/api/admin/game/sessions/${s.id}/participants`, { accountId: x.id });
    const d = await p.ok('GET', `/api/game/sessions/${s.id}`);
    assert.equal(d.participants.filter((x) => x.isBot).length, 3);
    const stream = await p.stream(`/api/game/sessions/${s.id}/stream`);
    const t0 = await stream.waitFor((m) => m.type === 'tick');
    await sleep(2500);
    const t1 = stream.messages.filter((m) => m.type === 'tick').at(-1);
    const moved = extras.some((x) => {
      const a = t0.p.find((q) => q[0] === x.id);
      const b = t1.p.find((q) => q[0] === x.id);
      return a && b && (a[1] !== b[1] || a[2] !== b[2]);
    });
    assert.ok(moved, 'at least one extra moved on its own');
    stream.close();
  });
});
