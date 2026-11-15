import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { backdateSession, balanceOf, closeDb, idem, newPlayer, rpc, sql } from './helpers';

after(closeDb);

async function play(p: Awaited<ReturnType<typeof newPlayer>>, gameId: string, score: number, seconds: number) {
  const s = await rpc(p.client, 'start_game_session', { p_game_id: gameId });
  assert.equal(s.code, null, s.hint ?? '');
  await backdateSession(s.data.session_id, seconds);
  const r = await rpc(p.client, 'submit_game_score', { p_session_id: s.data.session_id, p_score: score, p_duration_ms: seconds * 1000, p_stats: {} });
  return { session: s.data, result: r };
}

describe('game sessions and rewards', () => {
  it('rewards a plausible run and records stats, visits, quests and achievements', async () => {
    const p = await newPlayer();
    const [g0] = await sql(`select visits from public.games where id = 'orb-rush'`);
    const before = await balanceOf(p.id);
    const { result } = await play(p, 'orb-rush', 1500, 60);
    assert.equal(result.code, null, result.hint ?? '');
    assert.equal(result.data.status, 'ok');
    assert.equal(result.data.orbs, 75, '1500 / 20 score per orb');
    assert.equal(result.data.is_new_best, true);
    assert.ok(result.data.unlocked.some((u: any) => u.key === 'first_game'));
    assert.ok((await balanceOf(p.id)) >= before + 75);
    const [stats] = await sql(`select plays, best_score from public.player_game_stats where user_id = $1 and game_id = 'orb-rush'`, [p.id]);
    assert.deepEqual([stats.plays, Number(stats.best_score)], [1, 1500]);
    const [g1] = await sql(`select visits from public.games where id = 'orb-rush'`);
    assert.equal(Number(g1.visits), Number(g0.visits) + 1);
    const board = await rpc(p.client, 'get_leaderboard', { p_game_id: 'orb-rush', p_limit: 100 });
    assert.ok(board.data.me.rank >= 1);
    assert.ok(board.data.entries.length > 0);
  });

  it('rejects implausible scores without paying out', async () => {
    const p = await newPlayer();
    const before = await balanceOf(p.id);
    const { result } = await play(p, 'orb-rush', 900000, 10);
    assert.equal(result.data.status, 'rejected');
    assert.equal(result.data.reason, 'IMPLAUSIBLE_SCORE');
    assert.equal(await balanceOf(p.id), before);
    const stats = await sql(`select * from public.player_game_stats where user_id = $1`, [p.id]);
    assert.equal(stats.length, 0, 'rejected runs do not reach stats or leaderboards');
  });

  it('pays nothing for instant submissions and is idempotent on resubmit', async () => {
    const p = await newPlayer();
    const s = await rpc(p.client, 'start_game_session', { p_game_id: 'sky-stack' });
    const r1 = await rpc(p.client, 'submit_game_score', { p_session_id: s.data.session_id, p_score: 5, p_duration_ms: 500 });
    assert.equal(r1.data.status, 'ok');
    assert.equal(r1.data.orbs, 0, 'runs under 3 seconds earn nothing');
    const r2 = await rpc(p.client, 'submit_game_score', { p_session_id: s.data.session_id, p_score: 40, p_duration_ms: 500 });
    assert.equal(r2.data.status, 'duplicate');
    const other = await newPlayer();
    const r3 = await rpc(other.client, 'submit_game_score', { p_session_id: s.data.session_id, p_score: 40, p_duration_ms: 500 });
    assert.equal(r3.code, 'SESSION_NOT_FOUND', 'cannot submit to someone else\'s session');
  });

  it('applies the daily Orb cap per game', async () => {
    const p = await newPlayer();
    let total = 0;
    let capped = false;
    for (let i = 0; i < 6; i++) {
      const { result } = await play(p, 'orb-rush', 3000, 120);
      total += result.data.orbs;
      capped ||= result.data.daily_cap_reached;
    }
    assert.equal(total, 600, 'daily cap of 600 Orbs for Orb Rush');
    assert.ok(capped);
  });

  it('applies game pass perks snapshotted at session start', async () => {
    const p = await newPlayer();
    const buy = await rpc(p.client, 'purchase_game_pass', { p_pass_id: 'orb-rush-double-orbs', p_expected_price: 400, p_idempotency_key: idem() });
    assert.equal(buy.code, null, buy.hint ?? '');
    assert.ok(buy.data.unlocked.some((u: any) => u.key === 'pass_holder'));
    const again = await rpc(p.client, 'purchase_game_pass', { p_pass_id: 'orb-rush-double-orbs', p_expected_price: 400, p_idempotency_key: idem() });
    assert.equal(again.code, 'ALREADY_OWNED');
    const { session, result } = await play(p, 'orb-rush', 1000, 60);
    assert.equal(session.perks.orb_multiplier, 2);
    assert.equal(result.data.orbs, 100, '50 base orbs × 2');
    const game = await rpc(p.client, 'get_game', { p_game_id: 'orb-rush' });
    assert.equal(game.data.passes.find((x: any) => x.id === 'orb-rush-double-orbs').owned, true);
  });

  it('supports rating (after playing) and favoriting', async () => {
    const p = await newPlayer();
    assert.equal((await rpc(p.client, 'rate_game', { p_game_id: 'glyph-match', p_vote: 1 })).code, 'PLAY_FIRST');
    await play(p, 'glyph-match', 1200, 40);
    const [g0] = await sql(`select likes, dislikes from public.games where id = 'glyph-match'`);
    const up = await rpc(p.client, 'rate_game', { p_game_id: 'glyph-match', p_vote: 1 });
    assert.equal(up.data.likes, g0.likes + 1);
    const down = await rpc(p.client, 'rate_game', { p_game_id: 'glyph-match', p_vote: -1 });
    assert.equal(down.data.likes, g0.likes);
    assert.equal(down.data.dislikes, g0.dislikes + 1);
    const fav = await rpc(p.client, 'toggle_game_favorite', { p_game_id: 'glyph-match' });
    assert.equal(fav.data.favorited, true);
  });

  it('serves discovery sections with live stats', async () => {
    const p = await newPlayer();
    await play(p, 'block-smash', 300, 30);
    const d = await rpc(p.client, 'get_discover');
    assert.equal(d.code, null);
    for (const k of ['featured', 'recommended', 'trending', 'popular', 'top_rated', 'new', 'continue_playing', 'genres']) {
      assert.ok(Array.isArray(d.data[k]), k);
    }
    assert.equal(d.data.popular.length, 14);
    assert.equal(d.data.continue_playing[0].id, 'block-smash');
    assert.ok(d.data.popular.every((g: any) => typeof g.playing_now === 'number' && g.playing_now >= 0));
    // recommendations favour unplayed games
    assert.notEqual(d.data.recommended[0].id, 'block-smash');
  });
});
