import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { balanceOf, closeDb, idem, newPlayer, rpc, sql } from './helpers';

after(closeDb);

describe('marketplace purchases', () => {
  it('buys an item atomically and records it everywhere', async () => {
    const p = await newPlayer();
    const r = await rpc(p.client, 'purchase_item', { p_item_id: 'hat-red-cap', p_expected_price: 80, p_idempotency_key: idem() });
    assert.equal(r.code, null, r.hint ?? '');
    assert.equal(r.data.status, 'ok');
    // 800 - 80 + 100 (First Haul achievement)
    assert.equal(await balanceOf(p.id), 820);
    assert.equal(r.data.balance, 820);
    assert.ok(r.data.unlocked.some((u: any) => u.key === 'first_purchase'));
    const own = await p.client.from('inventory_items').select('item_id, price_paid').eq('user_id', p.id).eq('item_id', 'hat-red-cap');
    assert.equal(own.data!.length, 1);
    assert.equal(own.data![0].price_paid, 80);
    const ledger = await sql(`select amount, balance_after from public.currency_transactions where user_id = $1 and kind = 'purchase'`, [p.id]);
    assert.deepEqual(ledger.map((x) => [Number(x.amount), Number(x.balance_after)]), [[-80, 720]]);
  });

  it('never double-charges a retried purchase (same idempotency key)', async () => {
    const p = await newPlayer();
    const key = idem();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => rpc(p.client, 'purchase_item', { p_item_id: 'hat-cozy-beanie', p_expected_price: 90, p_idempotency_key: key })),
    );
    const statuses = results.map((x) => x.data?.status ?? x.code).sort();
    assert.deepEqual(statuses, ['duplicate', 'duplicate', 'duplicate', 'duplicate', 'ok']);
    const charges = await sql(`select count(*)::int as n from public.currency_transactions where user_id = $1 and kind = 'purchase'`, [p.id]);
    assert.equal(charges[0].n, 1);
    const copies = await sql(`select count(*)::int as n from public.inventory_items where user_id = $1 and item_id = 'hat-cozy-beanie'`, [p.id]);
    assert.equal(copies[0].n, 1);
  });

  it('rejects invalid purchases with precise reasons', async () => {
    const p = await newPlayer();
    const buy = (id: string, price: number | null) => rpc(p.client, 'purchase_item', { p_item_id: id, p_expected_price: price, p_idempotency_key: idem() });
    assert.equal((await buy('hat-golden-crown', 6000)).code, 'INSUFFICIENT_FUNDS');
    assert.match((await buy('hat-golden-crown', 6000)).hint!, /need 5,200 more Orbs/);
    assert.equal((await buy('hat-red-cap', 1)).code, 'PRICE_CHANGED');
    assert.equal((await buy('shirt-basic-blue', 0)).code, 'NOT_FOR_SALE');
    assert.equal((await buy('does-not-exist', 10)).code, 'ITEM_NOT_FOUND');
    assert.equal((await buy('ltd-celestial-cape', 18000)).code, 'SOLD_OUT');
    const offSeason = await sql(`select id from public.catalog_items where season_key is not null and season_key <> private.current_season() limit 1`);
    const [{ price }] = await sql('select price from public.catalog_items where id = $1', [offSeason[0].id]);
    assert.equal((await buy(offSeason[0].id, price)).code, 'OFF_SEASON');
    assert.equal((await buy('hat-red-cap', 80)).code, null);
    assert.equal((await buy('hat-red-cap', 80)).code, 'ALREADY_OWNED');
    const bad = await rpc(p.client, 'purchase_item', { p_item_id: 'hat-red-cap', p_expected_price: 80, p_idempotency_key: 'x' });
    assert.equal(bad.code, 'INVALID_REQUEST');
    assert.equal(await balanceOf(p.id), 820, 'only the one valid purchase was charged');
  });

  it('sells limited items with unique serial numbers and stock tracking', async () => {
    const p = await newPlayer();
    await sql(`update public.wallets set balance = 50000 where user_id = $1`, [p.id]);
    // keep the ledger consistent for the diagnostics test
    await sql(`insert into public.currency_transactions (user_id, amount, balance_after, kind, description) values ($1, 49200, 50000, 'admin_adjustment', 'test setup')`, [p.id]);
    const [before] = await sql(`select stock_remaining, stock_total from public.catalog_items where id = 'ltd-prism-visor'`);
    const r1 = await rpc(p.client, 'purchase_item', { p_item_id: 'ltd-prism-visor', p_expected_price: 8000, p_idempotency_key: idem() });
    const r2 = await rpc(p.client, 'purchase_item', { p_item_id: 'ltd-prism-visor', p_expected_price: 8000, p_idempotency_key: idem() });
    assert.equal(r1.code, null, r1.hint ?? '');
    assert.equal(r2.code, null, r2.hint ?? '');
    assert.notEqual(r1.data.serial_number, r2.data.serial_number);
    assert.equal(r2.data.serial_number, before.stock_total - before.stock_remaining + 2);
    const [afterRow] = await sql(`select stock_remaining from public.catalog_items where id = 'ltd-prism-visor'`);
    assert.equal(afterRow.stock_remaining, before.stock_remaining - 2);
    assert.ok(r1.data.unlocked.some((u: any) => u.key === 'limited_owner'));
    await rpc(p.client, 'purchase_item', { p_item_id: 'ltd-prism-visor', p_expected_price: 8000, p_idempotency_key: idem() });
    const r4 = await rpc(p.client, 'purchase_item', { p_item_id: 'ltd-prism-visor', p_expected_price: 8000, p_idempotency_key: idem() });
    assert.equal(r4.code, 'COPY_LIMIT');
  });

  it('records price history and favorites', async () => {
    const p = await newPlayer();
    await rpc(p.client, 'purchase_item', { p_item_id: 'face-big-grin', p_expected_price: 50, p_idempotency_key: idem() });
    const pts = await p.client.from('item_price_points').select('volume').eq('item_id', 'face-big-grin');
    assert.ok(pts.data!.length >= 1);
    const f1 = await rpc(p.client, 'toggle_item_favorite', { p_item_id: 'face-big-grin' });
    assert.equal(f1.data.favorited, true);
    const f2 = await rpc(p.client, 'toggle_item_favorite', { p_item_id: 'face-big-grin' });
    assert.equal(f2.data.favorited, false);
  });
});

describe('daily rewards and quests', () => {
  it('claims once per day and builds a streak', async () => {
    const p = await newPlayer();
    const c1 = await rpc(p.client, 'claim_daily_reward');
    assert.equal(c1.code, null);
    assert.equal(c1.data.reward, 50);
    assert.equal(c1.data.streak, 1);
    const c2 = await rpc(p.client, 'claim_daily_reward');
    assert.equal(c2.code, 'ALREADY_CLAIMED');
    // simulate yesterday's claim: streak continues
    await sql(`update public.daily_streaks set last_claim_date = private.today() - 1, current_streak = 6 where user_id = $1`, [p.id]);
    const c3 = await rpc(p.client, 'claim_daily_reward');
    assert.equal(c3.data.streak, 7);
    assert.equal(c3.data.reward, 400);
    assert.ok(c3.data.unlocked.some((u: any) => u.key === 'streak_7'));
    // a missed day resets the streak
    await sql(`update public.daily_streaks set last_claim_date = private.today() - 3 where user_id = $1`, [p.id]);
    const c4 = await rpc(p.client, 'claim_daily_reward');
    assert.equal(c4.data.streak, 1);
  });

  it('tracks and pays out daily quests', async () => {
    const p = await newPlayer();
    const q = await rpc(p.client, 'get_daily_quests');
    assert.equal(q.data.quests.length, 3);
    const quest = q.data.quests[0];
    const early = await rpc(p.client, 'claim_quest', { p_quest_key: quest.key });
    assert.equal(early.code, 'QUEST_INCOMPLETE');
    await sql(`insert into public.quest_progress (user_id, quest_day, quest_key, progress) values ($1, private.today(), $2, $3)`, [p.id, quest.key, quest.target]);
    const before = await balanceOf(p.id);
    const ok = await rpc(p.client, 'claim_quest', { p_quest_key: quest.key });
    assert.equal(ok.code, null);
    assert.ok((await balanceOf(p.id)) >= before + quest.reward_orbs);
    assert.equal((await rpc(p.client, 'claim_quest', { p_quest_key: quest.key })).code, 'ALREADY_CLAIMED');
    const inactive = await sql(`select key from public.quests where not (key = any (private.active_quest_keys(private.today()))) limit 1`);
    assert.equal((await rpc(p.client, 'claim_quest', { p_quest_key: inactive[0].key })).code, 'QUEST_NOT_ACTIVE');
  });
});

describe('avatar and outfits', () => {
  it('only lets players wear items they own, in the right slot', async () => {
    const p = await newPlayer();
    const me = await rpc(p.client, 'get_me');
    const base = me.data.avatar;
    const ok = await rpc(p.client, 'save_avatar', { p_config: { ...base, skin_tone: '#8d5524', body_type: 'slim', height_scale: 1.05 } });
    assert.equal(ok.code, null);
    assert.equal(ok.data.skin_tone, '#8D5524');
    assert.equal((await rpc(p.client, 'save_avatar', { p_config: { ...base, equipped: { ...base.equipped, hat: 'hat-golden-crown' } } })).code, 'NOT_OWNED');
    assert.equal((await rpc(p.client, 'save_avatar', { p_config: { ...base, equipped: { hat: base.equipped.hair } } })).code, 'WRONG_SLOT');
    assert.equal((await rpc(p.client, 'save_avatar', { p_config: { ...base, height_scale: 3 } })).code, 'INVALID_AVATAR');
    assert.equal((await rpc(p.client, 'save_avatar', { p_config: { ...base, skin_tone: 'red' } })).code, 'INVALID_AVATAR');
  });

  it('saves, shares, wears and deletes outfits', async () => {
    const p = await newPlayer();
    const other = await newPlayer();
    await rpc(p.client, 'purchase_item', { p_item_id: 'hat-blockora-cap', p_expected_price: 100, p_idempotency_key: idem() });
    const base = (await rpc(p.client, 'get_me')).data.avatar;
    const cfg = { ...base, equipped: { ...base.equipped, hat: 'hat-blockora-cap' } };
    const saved = await rpc(p.client, 'save_outfit', { p_name: 'Cap Day', p_config: cfg, p_is_public: true });
    assert.equal(saved.code, null);
    const worn = await rpc(p.client, 'wear_outfit', { p_outfit_id: saved.data.id });
    assert.equal(worn.data.status, 'ok');
    // another player can try it on but is told which items they are missing
    const tryOn = await rpc(other.client, 'wear_outfit', { p_outfit_id: saved.data.id });
    assert.equal(tryOn.data.status, 'missing_items');
    assert.ok(tryOn.data.missing.some((m: any) => m.item_id === 'hat-blockora-cap'));
    await rpc(p.client, 'update_outfit', { p_outfit_id: saved.data.id, p_name: 'Cap Day 2', p_is_public: false });
    const hidden = await rpc(other.client, 'wear_outfit', { p_outfit_id: saved.data.id });
    assert.equal(hidden.code, 'OUTFIT_NOT_FOUND', 'private outfits are not visible to others');
    assert.equal((await rpc(other.client, 'delete_outfit', { p_outfit_id: saved.data.id })).code, 'OUTFIT_NOT_FOUND');
    assert.equal((await rpc(p.client, 'delete_outfit', { p_outfit_id: saved.data.id })).code, null);
  });
});

describe('profile editing', () => {
  it('validates display names, themes and enforces the display-name cooldown', async () => {
    const p = await newPlayer();
    const r = await rpc(p.client, 'update_profile', { p_display_name: 'Brand New', p_bio: 'Hi!', p_status_text: 'Playing', p_profile_theme: 'midnight' });
    assert.equal(r.code, null);
    assert.equal(r.data.display_name, 'Brand New');
    const again = await rpc(p.client, 'update_profile', { p_display_name: 'Another Name', p_bio: 'Hi!', p_status_text: '', p_profile_theme: 'midnight' });
    assert.equal(again.code, 'DISPLAY_NAME_COOLDOWN');
    const locked = await rpc(p.client, 'update_profile', { p_display_name: 'Brand New', p_bio: '', p_status_text: '', p_profile_theme: 'gold' });
    assert.equal(locked.code, 'THEME_LOCKED');
    const invalid = await rpc(p.client, 'update_profile', { p_display_name: '<script>', p_bio: '', p_status_text: '', p_profile_theme: 'default' });
    assert.equal(invalid.code, 'INVALID_DISPLAY_NAME');
  });

  it('charges 1,000 Orbs for a username change', async () => {
    const p = await newPlayer();
    const poor = await rpc(p.client, 'change_username', { p_new_username: p.username + 'x', p_idempotency_key: idem() });
    assert.equal(poor.code, 'INSUFFICIENT_FUNDS');
    await sql(`update public.wallets set balance = balance + 1000 where user_id = $1`, [p.id]);
    await sql(`insert into public.currency_transactions (user_id, amount, balance_after, kind, description) select $1, 1000, balance, 'admin_adjustment', 'test setup' from public.wallets where user_id = $1`, [p.id]);
    const newName = ('N' + p.username).slice(0, 20);
    const ok = await rpc(p.client, 'change_username', { p_new_username: newName, p_idempotency_key: idem() });
    assert.equal(ok.code, null, ok.hint ?? '');
    assert.equal(ok.data.username, newName);
    assert.equal(await balanceOf(p.id), 800);
  });
});
