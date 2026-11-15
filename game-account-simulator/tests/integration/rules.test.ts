import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { QUESTS } from '../../src/content/progression';
import {
  activeQuestIndexes,
  addDays,
  computeGameReward,
  dailyRewardForStreak,
  levelForXp,
  seasonEnd,
  seasonForDate,
  xpForLevel,
} from '../../src/domain/rules';
import { closeDb, sql } from './helpers';

after(closeDb);

/** The offline backend relies on these TypeScript rules matching the SQL engine exactly. */
describe('TypeScript rules match the SQL engine', () => {
  it('levels and XP thresholds', async () => {
    const xs = [0, 1, 50, 99, 100, 101, 299, 300, 999, 1000, 12345, 99999, 494999, 495000, 10000000];
    const rows = await sql<{ x: string; l: number }>(`select x, private.level_for_xp(x) as l from unnest($1::bigint[]) x`, [xs]);
    rows.forEach((r) => assert.equal(r.l, levelForXp(Number(r.x)), `xp ${r.x}`));
    const levels = await sql<{ l: number; x: string }>(`select l, private.xp_for_level(l) as x from generate_series(1, 100) l`);
    levels.forEach((r) => assert.equal(Number(r.x), xpForLevel(r.l)));
  });

  it('daily reward cycle', async () => {
    const rows = await sql<{ s: number; r: number }>(`select s, private.daily_reward_for_streak(s) as r from generate_series(0, 60) s`);
    rows.forEach((row) => assert.equal(row.r, dailyRewardForStreak(row.s), `streak ${row.s}`));
  });

  it('seasons and season end dates', async () => {
    const days = Array.from({ length: 24 }, (_, i) => `2026-${String((i % 12) + 1).padStart(2, '0')}-${i < 12 ? '01' : '28'}`);
    const rows = await sql<{ d: string; s: string; e: string }>(
      `select d::text, private.season_for_date(d) as s, private.season_end(d)::text as e from unnest($1::date[]) d`, [days]);
    rows.forEach((r) => {
      const dt = new Date(`${r.d}T12:00:00Z`);
      assert.equal(r.s, seasonForDate(dt), r.d);
      assert.equal(r.e, seasonEnd(dt).toISOString().slice(0, 10), r.d);
    });
  });

  it('daily quest rotation', async () => {
    const sorted = [...QUESTS].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
    for (let i = 0; i < 40; i++) {
      const day = addDays('2026-11-01', i);
      const [row] = await sql<{ k: string[] }>(`select private.active_quest_keys($1::date) as k`, [day]);
      const expected = activeQuestIndexes(day, sorted.length).map((ix) => sorted[ix].key);
      assert.deepEqual([...row.k].sort(), [...expected].sort(), day);
    }
  });

  it('game reward maths (plausibility, caps, multipliers)', () => {
    const base = { scorePerOrb: 20, maxOrbsPerSession: 150, dailyOrbCap: 600, maxScorePerSecond: 140, scoreGrace: 100, xpPerPlay: 12, orbsEarnedToday: 0 };
    assert.deepEqual(computeGameReward({ ...base, score: 1500, elapsedSeconds: 60 }), { status: 'ok', orbs: 75, xp: 32, dailyCapReached: false });
    assert.equal(computeGameReward({ ...base, score: 900000, elapsedSeconds: 10 }).status, 'rejected');
    assert.equal(computeGameReward({ ...base, score: 1000, elapsedSeconds: 60, orbMultiplier: 2 }).orbs, 100);
    assert.deepEqual(computeGameReward({ ...base, score: 3000, elapsedSeconds: 120, orbsEarnedToday: 550 }), { status: 'ok', orbs: 50, xp: 32, dailyCapReached: true });
    assert.equal(computeGameReward({ ...base, score: 100, elapsedSeconds: 2 }).orbs, 0);
  });
});
