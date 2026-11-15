import { createHash, randomUUID } from 'node:crypto';

import { LocalBackend, type KeyValueStore } from './localBackend';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

let clock = new Date('2026-11-14T12:00:00Z');
const make = (store = memoryStore()) =>
  new LocalBackend({
    store,
    uuid: () => randomUUID(),
    sha256: async (s) => createHash('sha256').update(s).digest('hex'),
    now: () => clock,
    persistDelayMs: 0,
  });

async function registered(b = make(), username = 'Tester1') {
  await b.signUp({ email: `${username}@x.dev`, password: 'Passw0rd1', username, displayName: username });
  return b;
}

beforeEach(() => {
  clock = new Date('2026-11-14T12:00:00Z');
});

describe('offline backend: accounts', () => {
  it('creates a fully initialised account', async () => {
    const b = await registered();
    const me = await b.getMe();
    expect(me.wallet.balance).toBe(800); // 750 bonus + 50 welcome achievement
    expect(me.profile.level).toBe(1);
    expect(me.access.is_developer).toBe(false);
    expect(Object.keys(me.avatar.equipped)).toEqual(expect.arrayContaining(['hair', 'face', 'shirt', 'pants', 'shoes']));
    const inv = await b.listInventory(me.profile.id);
    expect(inv).toHaveLength(12);
  });

  it('validates sign-up and sign-in', async () => {
    const b = await registered();
    await expect(b.signUp({ email: 'other@x.dev', password: 'Passw0rd1', username: 'tester1', displayName: 'X' })).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    await expect(b.signUp({ email: 'Tester1@x.dev', password: 'Passw0rd1', username: 'Fresh1', displayName: 'X' })).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    await expect(b.signUp({ email: 'n@x.dev', password: 'short', username: 'Fresh2', displayName: 'X' })).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
    await b.signOut();
    await expect(b.getMe()).rejects.toMatchObject({ code: 'NOT_AUTHENTICATED' });
    await expect(b.signIn('tester1@x.dev', 'wrong-pass1')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await b.signIn('tester1@x.dev', 'Passw0rd1');
    expect((await b.getMe()).profile.username).toBe('Tester1');
  });

  it('persists across restarts', async () => {
    const store = memoryStore();
    const b1 = await registered(make(store));
    await b1.purchaseItem('hat-red-cap', 80, 'key-12345678');
    await (b1 as any).persistNow();
    const b2 = make(store);
    const me = await b2.getMe();
    expect(me.wallet.balance).toBe(820);
  });

  it('refuses every developer operation offline', async () => {
    const b = await registered();
    expect(await b.getAccess()).toEqual({ is_developer: false, role: null });
    await expect(b.admin.systemStatus()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(b.admin.adjustBalance('x', 1, 'r', 'k')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('offline backend: economy', () => {
  it('purchases idempotently and validates', async () => {
    const b = await registered();
    const r1 = await b.purchaseItem('hat-red-cap', 80, 'same-key-123');
    const r2 = await b.purchaseItem('hat-red-cap', 80, 'same-key-123');
    expect(r1.status).toBe('ok');
    expect(r2.status).toBe('duplicate');
    expect(r1.unlocked.map((u) => u.key)).toContain('first_purchase');
    expect((await b.getMe()).wallet.balance).toBe(820);
    await expect(b.purchaseItem('hat-red-cap', 80, 'another-key1')).rejects.toMatchObject({ code: 'ALREADY_OWNED' });
    await expect(b.purchaseItem('hat-golden-crown', 6000, 'another-key2')).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    await expect(b.purchaseItem('hat-cozy-beanie', 1, 'another-key3')).rejects.toMatchObject({ code: 'PRICE_CHANGED' });
    await expect(b.purchaseItem('ltd-celestial-cape', 18000, 'another-key4')).rejects.toMatchObject({ code: 'SOLD_OUT' });
    await expect(b.purchaseItem('sea-frost-scarf', 300, 'another-key5')).rejects.toMatchObject({ code: 'OFF_SEASON' });
    const txns = await b.listTransactions(0, 50);
    expect(txns.filter((t) => t.kind === 'purchase')).toHaveLength(1);
  });

  it('daily rewards build streaks across days', async () => {
    const b = await registered();
    expect((await b.claimDailyReward()).reward).toBe(50);
    await expect(b.claimDailyReward()).rejects.toMatchObject({ code: 'ALREADY_CLAIMED' });
    clock = new Date('2026-11-15T09:00:00Z');
    const d2 = await b.claimDailyReward();
    expect(d2.streak).toBe(2);
    expect(d2.reward).toBe(75);
    clock = new Date('2026-11-18T09:00:00Z');
    expect((await b.claimDailyReward()).streak).toBe(1);
  });

  it('only equips owned items', async () => {
    const b = await registered();
    const me = await b.getMe();
    await expect(b.saveAvatar({ ...me.avatar, equipped: { ...me.avatar.equipped, hat: 'hat-golden-crown' } })).rejects.toMatchObject({ code: 'NOT_OWNED' });
    await expect(b.saveAvatar({ ...me.avatar, equipped: { hat: me.avatar.equipped.hair } })).rejects.toMatchObject({ code: 'WRONG_SLOT' });
    const saved = await b.saveAvatar({ ...me.avatar, body_type: 'broad', skin_tone: '#c68642' });
    expect(saved.skin_tone).toBe('#C68642');
  });
});

describe('offline backend: games', () => {
  it('rewards plausible scores and rejects implausible ones', async () => {
    const b = await registered();
    const s = await b.startGameSession('orb-rush');
    clock = new Date(clock.getTime() + 60_000);
    const r = await b.submitGameScore(s.session_id, 1500, 60_000, {});
    expect(r.status).toBe('ok');
    expect(r.orbs).toBe(75);
    expect((await b.submitGameScore(s.session_id, 1500, 60_000, {})).status).toBe('duplicate');
    const s2 = await b.startGameSession('orb-rush');
    clock = new Date(clock.getTime() + 5_000);
    const bad = await b.submitGameScore(s2.session_id, 500000, 5000, {});
    expect(bad.status).toBe('rejected');
    const lb = await b.getLeaderboard('orb-rush');
    expect(lb.me?.best_score).toBe(1500);
    const d = await b.getDiscover();
    expect(d.continue_playing[0].id).toBe('orb-rush');
  });
});

describe('offline backend: social', () => {
  it('NPCs accept friend requests; blocking severs links', async () => {
    const b = await registered();
    const results = await b.searchUsers('Pixel');
    const npc = results.find((u) => u.username === 'PixelPioneer')!;
    expect(npc).toBeTruthy();
    expect((await b.sendFriendRequest(npc.id)).status).toBe('friends');
    const prof = await b.getProfile('PixelPioneer');
    expect(prof.relationship.is_friend).toBe(true);
    expect(prof.badges.length).toBeGreaterThan(0);
    await b.follow(npc.id);
    await b.block(npc.id);
    const after = await b.getProfile('PixelPioneer');
    expect(after.relationship.is_friend).toBe(false);
    expect(after.relationship.is_following).toBe(false);
    await expect(b.sendFriendRequest(npc.id)).rejects.toMatchObject({ code: 'USER_UNAVAILABLE' });
    const feed = await b.getFeed();
    expect(Array.isArray(feed)).toBe(true);
  });
});
