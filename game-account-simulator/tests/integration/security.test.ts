import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { balanceOf, closeDb, newPlayer, type Player, rpc, sql } from './helpers';

after(closeDb);

let a: Player;
let b: Player;
before(async () => {
  a = await newPlayer();
  b = await newPlayer();
});

describe('row level security', () => {
  it('hides other players\' wallets, ledgers, notifications, sessions and streaks', async () => {
    for (const table of ['wallets', 'currency_transactions', 'notifications', 'daily_streaks', 'user_settings', 'quest_progress', 'game_sessions']) {
      const col = 'user_id';
      const res = await a.client.from(table).select(col).eq(col, b.id);
      assert.equal(res.error, null, `${table} select works`);
      assert.equal(res.data!.length, 0, `${table}: cannot see another player's rows`);
    }
    const own = await a.client.from('wallets').select('balance').eq('user_id', a.id).single();
    assert.equal(own.data!.balance, 800, 'can see own wallet');
  });

  it('forbids every direct write to economy tables', async () => {
    const attempts = [
      a.client.from('wallets').update({ balance: 999999 }).eq('user_id', a.id),
      a.client.from('wallets').insert({ user_id: a.id, balance: 5 }),
      a.client.from('currency_transactions').insert({ user_id: a.id, amount: 5000, balance_after: 5800, kind: 'refund', description: 'x' }),
      a.client.from('inventory_items').insert({ user_id: a.id, item_id: 'hat-golden-crown', acquired_via: 'purchase' }),
      a.client.from('game_pass_ownership').insert({ user_id: a.id, pass_id: 'orb-rush-double-orbs' }),
      a.client.from('profiles').update({ level: 100, xp: 999999 }).eq('id', a.id),
      a.client.from('player_game_stats').insert({ user_id: a.id, game_id: 'orb-rush', best_score: 999999 }),
      a.client.from('catalog_items').update({ price: 0 }).eq('id', 'hat-golden-crown'),
      a.client.from('user_achievements').insert({ user_id: a.id, achievement_key: 'gamer_100' }),
      a.client.from('follows').insert({ follower_id: b.id, followee_id: a.id }),
      a.client.from('friendships').insert({ user_id: a.id, friend_id: b.id }),
    ];
    for (const res of await Promise.all(attempts)) {
      assert.ok(res.error, `write must be rejected: ${JSON.stringify(res.error)}`);
    }
    assert.equal(await balanceOf(a.id), 800, 'balance untouched');
    const [p] = await sql('select level from public.profiles where id = $1', [a.id]);
    assert.equal(p.level, 1);
  });

  it('allows only the narrow self-service writes', async () => {
    const upd = await a.client.from('user_settings').update({ inventory_visibility: 'friends' }).eq('user_id', a.id).select();
    assert.equal(upd.error, null);
    assert.equal(upd.data![0].inventory_visibility, 'friends');
    const other = await a.client.from('user_settings').update({ inventory_visibility: 'nobody' }).eq('user_id', b.id).select();
    assert.equal(other.data?.length ?? 0, 0, 'cannot change another player\'s settings');
    const [bs] = await sql('select inventory_visibility from public.user_settings where user_id = $1', [b.id]);
    assert.equal(bs.inventory_visibility, 'everyone');
  });

  it('keeps developer roles, audit logs, reports and rate limits unreachable', async () => {
    for (const table of ['developer_roles', 'audit_logs', 'reports', 'rate_limit_buckets']) {
      const res = await a.client.from(table).select('*').limit(1);
      assert.ok(res.error || res.data!.length === 0, `${table} must be unreadable`);
    }
    const ins = await a.client.from('developer_roles').insert({ user_id: a.id, role: 'owner' });
    assert.ok(ins.error, 'cannot self-grant developer role');
    const access = await rpc(a.client, 'get_my_access');
    assert.equal(access.data.is_developer, false);
  });

  it('does not expose internal functions or presence timestamps', async () => {
    const res = await a.client.rpc('apply_currency' as any, { p_user: a.id, p_amount: 100000 });
    assert.ok(res.error, 'private.apply_currency is not callable');
    const schemaRes = await a.client.schema('private' as any).rpc('apply_currency', { p_user: a.id, p_amount: 100000 } as any);
    assert.ok(schemaRes.error, 'private schema not exposed');
    const presence = await a.client.from('profiles').select('last_seen_at').eq('id', b.id);
    assert.ok(presence.error, 'last_seen_at column is not readable');
    assert.equal(await balanceOf(a.id), 800);
  });

  it('enforces inventory privacy settings', async () => {
    const visible = await a.client.from('inventory_items').select('id').eq('user_id', b.id);
    assert.ok(visible.data!.length > 0, 'public inventory visible');
    await b.client.from('user_settings').update({ inventory_visibility: 'nobody' }).eq('user_id', b.id);
    const hidden = await a.client.from('inventory_items').select('id').eq('user_id', b.id);
    assert.equal(hidden.data!.length, 0, 'private inventory hidden');
    const prof = await rpc(a.client, 'get_profile', { p_username: b.username });
    assert.equal(prof.data.visibility.inventory, false);
    assert.equal(prof.data.showcase, null);
    const self = await b.client.from('inventory_items').select('id').eq('user_id', b.id);
    assert.ok(self.data!.length > 0, 'owner always sees own inventory');
  });
});

describe('rate limiting', () => {
  it('throttles abusive report spam', async () => {
    const reporter = await newPlayer();
    const target = await newPlayer();
    let limited = false;
    for (let i = 0; i < 12; i++) {
      const r = await rpc(reporter.client, 'report_user', { p_target: target.id, p_reason: 'spam', p_details: 'test' });
      if (r.code === 'RATE_LIMITED') {
        limited = true;
        assert.ok(i >= 10, 'first 10 reports allowed');
        break;
      }
      assert.equal(r.code, null);
    }
    assert.ok(limited, 'rate limit reached');
  });
});
