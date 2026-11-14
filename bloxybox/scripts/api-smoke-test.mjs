#!/usr/bin/env node
/**
 * End-to-end API smoke test against a LOCAL Supabase stack (never a hosted project:
 * it creates test accounts). Uses @supabase/supabase-js exactly like the app does:
 * named RPC arguments, embedded relations, RLS-filtered selects.
 *
 *   npx supabase start            # once; applies supabase/migrations
 *   npm run test:api
 *
 * Reads URL and keys from `npx supabase status -o env` unless SUPABASE_URL,
 * SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set. The service-role key is
 * the public local-development demo key and is only used to create test users.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function localEnv() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
  }
  const out = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' });
  const get = (k) => (out.match(new RegExp(`^${k}="?([^"\\n]+)"?`, 'm')) ?? [])[1];
  return { url: get('API_URL'), anon: get('ANON_KEY'), service: get('SERVICE_ROLE_KEY') };
}

const env = localEnv();
const host = new URL(env.url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to run against ${host}: this test creates accounts and must only target a local stack.`);
  process.exit(2);
}

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.url, env.service, options);
const anon = createClient(env.url, env.anon, options);
const suffix = Math.random().toString(36).slice(2, 8);

async function makePlayer(username) {
  const email = `${username}@smoke.test`;
  const password = 'Smoke-test-123';
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: username },
  });
  if (error) throw error;
  const client = createClient(env.url, env.anon, options);
  const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

console.log(`API smoke test against ${env.url}`);

// 1. The setup screen's probe (anon key only).
{
  const { data, error } = await anon.rpc('is_username_available', { p_username: `free_${suffix}` });
  check('setup probe: is_username_available via anon', error === null && data === true, error?.message);
  const denied = await anon.from('wallets').select('*');
  check('anon cannot read wallets', denied.error !== null || (denied.data ?? []).length === 0);
}

const alice = await makePlayer(`alice_${suffix}`);
const bob = await makePlayer(`bob_${suffix}`);
const db = alice.client;

// 2. Sign-up provisioning through the real auth.users trigger.
{
  const { data, error } = await db.rpc('get_profile_summary', { p_user_id: alice.id });
  check('profile provisioned by sign-up trigger', !error && data?.username === `alice_${suffix}`, error?.message);
  check('avatar has 3 starter items', data?.avatar?.equipped?.length === 3);
  const wallet = await db.from('wallets').select('*').eq('user_id', alice.id).single();
  check('wallet readable with welcome balance 500', !wallet.error && Number(wallet.data.balance) === 500, wallet.error?.message);
  const others = await db.from('wallets').select('*').eq('user_id', bob.id);
  check('RLS hides other players wallets', !others.error && others.data.length === 0);
  const forged = await db.from('wallets').update({ balance: 999999 }).eq('user_id', alice.id).select();
  check('direct balance update is refused', forged.error !== null || (forged.data ?? []).length === 0);
}

// 3. Daily reward.
{
  const status = await db.rpc('get_daily_reward_status');
  check('get_daily_reward_status', !status.error && status.data.available === true, status.error?.message);
  const claim = await db.rpc('claim_daily_reward');
  check('claim_daily_reward pays 100', !claim.error && Number(claim.data.amount) === 100, claim.error?.message);
  const again = await db.rpc('claim_daily_reward');
  check('second claim is rejected with DAILY_ALREADY_CLAIMED', again.error?.message === 'DAILY_ALREADY_CLAIMED', again.error?.message);
}

// 4. Marketplace and inventory (embedded relations, as in the app).
{
  const listings = await db.from('marketplace_listings').select('*, item:items(*)').eq('is_active', true);
  check('listings with embedded items', !listings.error && listings.data.length >= 29 && listings.data[0].item?.name, listings.error?.message);
  const cheapest = [...listings.data].sort((a, b) => a.price - b.price)[0];
  const buy = await db.rpc('purchase_item', { p_listing_id: cheapest.id });
  check(`purchase_item (${cheapest.item.name})`, !buy.error && Number(buy.data.balance) === 600 - cheapest.price, buy.error?.message);
  const dup = await db.rpc('purchase_item', { p_listing_id: cheapest.id });
  check('double purchase rejected with ALREADY_OWNED', dup.error?.message === 'ALREADY_OWNED', dup.error?.message);
  const inv = await db.from('inventory').select('*, item:items(*)').eq('user_id', alice.id);
  check('inventory with embedded items', !inv.error && inv.data.length === 4, inv.error?.message);
  const equip = await db.rpc('equip_item', { p_item_id: cheapest.item_id });
  check('equip_item', !equip.error && equip.data.equipped === true, equip.error?.message);
  const avatar = await db.rpc('update_avatar', { p_skin_color: '#9DB8FF', p_head_shape: 'round' });
  check('update_avatar', !avatar.error && avatar.data.head_shape === 'round', avatar.error?.message);
  const txs = await db.from('transactions').select('*').eq('user_id', alice.id).order('created_at', { ascending: false }).range(0, 29);
  check('transaction history (3 entries)', !txs.error && txs.data.length === 3, txs.error?.message);
}

// 5. Game Passes.
{
  const passes = await db.from('game_passes').select('*, experience:experiences(id, slug, title, accent_color)').eq('is_active', true).order('sort_order');
  check('game passes with embedded experience', !passes.error && passes.data.length >= 6 && passes.data[0].experience?.slug, passes.error?.message);
  const cheap = passes.data.find((p) => Number(p.price) <= 400);
  const buy = await db.rpc('purchase_game_pass', { p_pass_id: cheap.id });
  check(`purchase_game_pass (${cheap.name})`, !buy.error, buy.error?.message);
  const toggle = await db.rpc('set_game_pass_enabled', { p_pass_id: cheap.id, p_enabled: false });
  check('set_game_pass_enabled', !toggle.error && toggle.data.enabled === false, toggle.error?.message);
  const owned = await db.from('game_pass_ownership').select('*');
  check('pass ownership readable (own rows only)', !owned.error && owned.data.length === 1, owned.error?.message);
}

// 6. Discover and games.
{
  const exps = await db
    .from('experiences')
    .select('id, slug, title, tagline, description, how_to_play, category, status, is_featured, sort_order, accent_color, score_label, released_at, coins_per_point, win_bonus, max_reward_per_run, daily_reward_cap, win_score, play_count')
    .order('sort_order');
  check('experiences select (app column list)', !exps.error && exps.data.length === 4, exps.error?.message);
  const start = await db.rpc('start_game_session', { p_slug: 'box-stack' });
  check('start_game_session', !start.error && typeof start.data.session_id === 'string', start.error?.message);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const submit = await db.rpc('submit_game_result', {
    p_session_id: start.data.session_id,
    p_score: 3,
    p_outcome: 'loss',
    p_duration_ms: 2400,
  });
  check('submit_game_result accepted with server-computed reward', !submit.error && submit.data.accepted === true && submit.data.reward === 12, submit.error?.message ?? JSON.stringify(submit.data));
  const notPlayable = await db.rpc('start_game_session', { p_slug: 'orbit-hop' });
  check('in-development experience cannot start', notPlayable.error?.message === 'EXPERIENCE_NOT_PLAYABLE');
  const board = await db.rpc('get_leaderboard', { p_slug: 'box-stack', p_limit: 20 });
  check('get_leaderboard', !board.error && board.data.length === 1, board.error?.message);
  const progress = await db.from('game_progress').select('*').eq('user_id', alice.id);
  check('game_progress readable', !progress.error && progress.data[0]?.best_score === 3, progress.error?.message);
}

// 7. Social.
{
  const follow = await db.rpc('follow_user', { p_user_id: bob.id });
  check('follow_user', !follow.error && follow.data.following === true, follow.error?.message);
  const back = await bob.client.rpc('follow_user', { p_user_id: alice.id });
  check('mutual follow becomes a friendship', !back.error && back.data.is_friend === true, back.error?.message);
  const friends = await db.rpc('list_connections', { p_user_id: alice.id, p_kind: 'friends', p_limit: 100, p_offset: 0 });
  check('list_connections friends', !friends.error && friends.data.length === 1 && friends.data[0].avatar, friends.error?.message);
  const search = await db.rpc('search_players', { p_query: `bob_${suffix}`, p_limit: 30 });
  check('search_players', !search.error && search.data.length === 1, search.error?.message);
  const visit = await db.rpc('record_profile_visit', { p_user_id: bob.id });
  check('record_profile_visit', !visit.error && visit.data.counted === true, visit.error?.message);
  const profile = await db.rpc('update_profile', { p_display_name: 'Alice', p_bio: 'hi', p_accent: 'cyan' });
  check('update_profile', !profile.error && profile.data.display_name === 'Alice', profile.error?.message);
  const rename = await db.rpc('set_username', { p_username: `alice2_${suffix}` });
  check('set_username', !rename.error, rename.error?.message);
}

// 8. Developer tools stay locked for normal players.
{
  const who = await db.rpc('dev_whoami');
  check('dev_whoami says not a developer', !who.error && who.data.is_developer === false, who.error?.message);
  const diag = await db.rpc('dev_diagnostics');
  check('dev_diagnostics rejected with FORBIDDEN', diag.error?.message === 'FORBIDDEN', diag.error?.message);
  const grant = await db.rpc('dev_set_balance', { p_user_id: alice.id, p_balance: 1000000, p_reason: 'hack' });
  check('dev_set_balance rejected with FORBIDDEN', grant.error?.message === 'FORBIDDEN', grant.error?.message);
}

console.log(`\nAPI smoke test: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
