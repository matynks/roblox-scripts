import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { balanceOf, closeDb, idem, makeDeveloper, newPlayer, type Player, rpc, sql } from './helpers';

after(closeDb);

let dev: Player;
let owner: Player;
let player: Player;

before(async () => {
  dev = await newPlayer();
  owner = await newPlayer();
  player = await newPlayer();
  await makeDeveloper(dev.id, 'developer');
  await makeDeveloper(owner.id, 'owner');
});

const ADMIN_CALLS: [string, Record<string, unknown>][] = [
  ['admin_search_accounts', { p_query: '' }],
  ['admin_get_account', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
  ['admin_adjust_balance', { p_user_id: '00000000-0000-0000-0000-000000000000', p_delta: 1000, p_reason: 'hack', p_idempotency_key: 'abcdefgh1' }],
  ['admin_set_balance', { p_user_id: '00000000-0000-0000-0000-000000000000', p_balance: 99, p_reason: 'hack', p_idempotency_key: 'abcdefgh2' }],
  ['admin_grant_item', { p_user_id: '00000000-0000-0000-0000-000000000000', p_item_id: 'hat-golden-crown', p_reason: 'hack' }],
  ['admin_revoke_item', { p_inventory_item_id: '00000000-0000-0000-0000-000000000000', p_reason: 'hack' }],
  ['admin_list_audit_logs', {}],
  ['admin_system_status', {}],
  ['admin_run_diagnostics', {}],
  ['admin_set_developer_role', { p_user_id: '00000000-0000-0000-0000-000000000000', p_role: 'owner', p_reason: 'hack' }],
  ['admin_resolve_report', { p_report_id: '00000000-0000-0000-0000-000000000000', p_status: 'dismissed', p_reason: '' }],
];

describe('Modify Menu authorization', () => {
  it('refuses every admin RPC for ordinary players, before validating input', async () => {
    for (const [fn, args] of ADMIN_CALLS) {
      const r = await rpc(player.client, fn, args);
      assert.equal(r.code, 'FORBIDDEN', `${fn} must be forbidden (got ${r.code})`);
    }
    assert.equal(await balanceOf(player.id), 800);
  });

  it('reports developer access to the client only for real developers', async () => {
    assert.equal((await rpc(player.client, 'get_my_access')).data.is_developer, false);
    const access = await rpc(dev.client, 'get_my_access');
    assert.deepEqual(access.data, { is_developer: true, role: 'developer' });
  });

  it('cannot be bypassed with a forged JWT claim in user metadata', async () => {
    await player.client.auth.updateUser({ data: { role: 'owner', is_developer: true } });
    assert.equal((await rpc(player.client, 'admin_system_status')).code, 'FORBIDDEN');
  });
});

describe('Modify Menu operations', () => {
  it('searches and inspects accounts (and audits the inspection)', async () => {
    const s = await rpc(dev.client, 'admin_search_accounts', { p_query: player.username, p_filter: 'all' });
    assert.equal(s.code, null);
    assert.equal(s.data.accounts[0].username, player.username);
    assert.match(s.data.accounts[0].email, /\*\*\*@/);
    const npcs = await rpc(dev.client, 'admin_search_accounts', { p_query: '', p_filter: 'npc', p_limit: 5 });
    assert.equal(npcs.data.total, 36);
    const acct = await rpc(dev.client, 'admin_get_account', { p_user_id: player.id });
    assert.equal(acct.code, null);
    assert.equal(acct.data.wallet.balance, 800);
    const inv = await rpc(dev.client, 'admin_list_inventory', { p_user_id: player.id });
    assert.equal(inv.data.length, 12);
    const tx = await rpc(dev.client, 'admin_list_transactions', { p_user_id: player.id });
    assert.equal(tx.data.length, 2);
    const logs = await rpc(dev.client, 'admin_list_audit_logs', { p_target_user: player.id });
    assert.ok(logs.data.some((l: any) => l.action === 'view_account' && l.actor_username === dev.username));
  });

  it('adjusts and sets balances through the ledger, with reasons and audit', async () => {
    assert.equal((await rpc(dev.client, 'admin_adjust_balance', { p_user_id: player.id, p_delta: 500, p_reason: '', p_idempotency_key: idem() })).code, 'REASON_REQUIRED');
    const key = idem();
    const add = await rpc(dev.client, 'admin_adjust_balance', { p_user_id: player.id, p_delta: 500, p_reason: 'QA test credit', p_idempotency_key: key });
    assert.equal(add.code, null, add.hint ?? '');
    assert.equal(add.data.balance, 1300);
    const replay = await rpc(dev.client, 'admin_adjust_balance', { p_user_id: player.id, p_delta: 500, p_reason: 'QA test credit', p_idempotency_key: key });
    assert.equal(replay.data.duplicate, true, 'retry with the same key does not credit twice');
    assert.equal(await balanceOf(player.id), 1300);
    assert.equal((await rpc(dev.client, 'admin_adjust_balance', { p_user_id: player.id, p_delta: -999999, p_reason: 'too much', p_idempotency_key: idem() })).code, 'INSUFFICIENT_FUNDS');
    const set = await rpc(dev.client, 'admin_set_balance', { p_user_id: player.id, p_balance: 25000, p_reason: 'QA set balance', p_idempotency_key: idem() });
    assert.equal(set.data.balance, 25000);
    const [tx] = await sql(`select actor_id, kind, metadata from public.currency_transactions where user_id = $1 order by created_at desc limit 1`, [player.id]);
    assert.equal(tx.actor_id, dev.id);
    assert.equal(tx.kind, 'admin_adjustment');
    const audit = await sql(`select action, reason, before, after from public.audit_logs where target_user_id = $1 and action in ('adjust_balance','set_balance') order by id`, [player.id]);
    assert.deepEqual(audit.map((x) => x.action), ['adjust_balance', 'set_balance']);
    assert.equal(audit[1].before.balance, 1300);
    assert.equal(audit[1].after.balance, 25000);
    const note = await player.client.from('notifications').select('title').eq('kind', 'admin');
    assert.ok(note.data!.length >= 2, 'player is told about adjustments');
  });

  it('edits profiles and statistics consistently', async () => {
    const newName = ('Q' + player.username).slice(0, 20);
    const r = await rpc(dev.client, 'admin_update_profile', { p_user_id: player.id, p_username: newName, p_display_name: 'QA Renamed', p_bio: 'edited', p_reason: 'QA profile edit' });
    assert.equal(r.code, null, r.hint ?? '');
    assert.equal(r.data.username, newName);
    player.username = newName;
    const bad = await rpc(dev.client, 'admin_update_profile', { p_user_id: player.id, p_username: 'bad name!', p_display_name: null, p_bio: null, p_reason: 'QA invalid' });
    assert.equal(bad.code, 'INVALID_PROFILE');
    const st = await rpc(dev.client, 'admin_set_stats', { p_user_id: player.id, p_level: 12, p_xp: null, p_reputation: 250, p_reason: 'QA stats' });
    assert.equal(st.data.level, 12);
    assert.equal(st.data.xp, 50 * 12 * 11);
    const fl = await rpc(dev.client, 'admin_add_npc_followers', { p_user_id: player.id, p_count: 12, p_reason: 'QA followers' });
    assert.equal(fl.data.added, 12);
    const rows = await sql(`select count(*)::int as n from public.follows f join public.profiles p on p.id = f.follower_id where f.followee_id = $1 and p.is_npc`, [player.id]);
    assert.equal(rows[0].n, 12, 'followers are real rows, not a typed-in number');
    const flags = await rpc(dev.client, 'admin_set_account_flags', { p_user_id: player.id, p_is_test_account: true, p_account_status: null, p_reason: 'QA flag' });
    assert.equal(flags.data.is_test_account, true);
  });

  it('grants and revokes items, sets and passes', async () => {
    const g = await rpc(dev.client, 'admin_grant_item', { p_user_id: player.id, p_item_id: 'hat-golden-crown', p_reason: 'QA grant' });
    assert.equal(g.code, null, g.hint ?? '');
    assert.equal((await rpc(dev.client, 'admin_grant_item', { p_user_id: player.id, p_item_id: 'hat-golden-crown', p_reason: 'QA grant' })).code, 'ALREADY_OWNED');
    const me = (await rpc(player.client, 'get_me')).data.avatar;
    await rpc(player.client, 'save_avatar', { p_config: { ...me, equipped: { ...me.equipped, hat: 'hat-golden-crown' } } });
    const rev = await rpc(dev.client, 'admin_revoke_item', { p_inventory_item_id: g.data.inventory_item_id, p_reason: 'QA revoke' });
    assert.equal(rev.code, null);
    const [av] = await sql('select equipped from public.avatars where user_id = $1', [player.id]);
    assert.equal(av.equipped.hat, undefined, 'revoked item is unequipped');
    const lim = await rpc(dev.client, 'admin_grant_item', { p_user_id: player.id, p_item_id: 'ltd-frost-crown', p_reason: 'QA limited' });
    assert.ok(lim.data.serial_number > 0);
    const set = await rpc(dev.client, 'admin_grant_set', { p_user_id: player.id, p_set_key: 'pirate', p_reason: 'QA set' });
    assert.equal(set.data.granted, 5);
    const claim = await sql(`select 1 from public.collection_claims where user_id = $1 and set_key = 'pirate'`, [player.id]);
    assert.equal(claim.length, 1, 'set completion recorded');
    const pass = await rpc(dev.client, 'admin_grant_pass', { p_user_id: player.id, p_pass_id: 'sky-stack-steady', p_reason: 'QA pass' });
    assert.equal(pass.code, null);
    assert.equal((await rpc(dev.client, 'admin_revoke_pass', { p_user_id: player.id, p_pass_id: 'sky-stack-steady', p_reason: 'QA pass' })).code, null);
  });

  it('protects owners from non-owner developers; owners manage roles', async () => {
    assert.equal((await rpc(dev.client, 'admin_adjust_balance', { p_user_id: owner.id, p_delta: 10, p_reason: 'nope', p_idempotency_key: idem() })).code, 'FORBIDDEN');
    assert.equal((await rpc(dev.client, 'admin_set_developer_role', { p_user_id: player.id, p_role: 'developer', p_reason: 'promote' })).code, 'FORBIDDEN');
    const promote = await rpc(owner.client, 'admin_set_developer_role', { p_user_id: player.id, p_role: 'developer', p_reason: 'QA promote' });
    assert.equal(promote.data.role, 'developer');
    assert.equal((await rpc(player.client, 'get_my_access')).data.is_developer, true);
    await rpc(owner.client, 'admin_set_developer_role', { p_user_id: player.id, p_role: null, p_reason: 'QA demote' });
    assert.equal((await rpc(player.client, 'admin_system_status')).code, 'FORBIDDEN');
    assert.equal((await rpc(owner.client, 'admin_set_developer_role', { p_user_id: owner.id, p_role: null, p_reason: 'self' })).code, 'INVALID_TARGET');
    const [npc] = await sql('select id from public.profiles where is_npc limit 1');
    assert.equal((await rpc(owner.client, 'admin_set_developer_role', { p_user_id: npc.id, p_role: 'developer', p_reason: 'npc' })).code, 'INVALID_TARGET');
  });

  it('shows system status and passes every integrity diagnostic', async () => {
    const st = await rpc(dev.client, 'admin_system_status');
    assert.equal(st.code, null);
    assert.equal(st.data.content.games, 14);
    assert.equal(st.data.accounts.npcs, 36);
    const d = await rpc(dev.client, 'admin_run_diagnostics');
    assert.equal(d.code, null);
    const failed = d.data.checks.filter((c: any) => c.status === 'fail');
    assert.deepEqual(failed, [], JSON.stringify(failed));
    const r = await rpc(dev.client, 'admin_list_reports', { p_status: 'open' });
    assert.ok(Array.isArray(r.data));
    const tx = await rpc(dev.client, 'admin_list_transactions', { p_user_id: null, p_limit: 10 });
    assert.equal(tx.data.length, 10);
  });
});
