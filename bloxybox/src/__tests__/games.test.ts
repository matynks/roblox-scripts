import { readFileSync } from 'fs';
import { join } from 'path';

import { createStack, placeBlock, spawnMover, speedFor, STACK, stepMover, topBlock } from '@/games/box-stack/logic';
import { dashScore, DASH, detectCollisions, generateTrack, lowerBound, speedAt, visibleWindow, type Entity } from '@/games/lane-dash/logic';
import { createRng } from '@/games/rng';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('Box Stack rules', () => {
  it('starts with a centred base, wider with the Wide Base perk', () => {
    const normal = createStack([]);
    const wide = createStack(['wide_start']);
    expect(topBlock(normal).width).toBe(STACK.baseWidth);
    expect(topBlock(wide).width).toBe(STACK.wideBaseWidth);
    expect(topBlock(normal).x + topBlock(normal).width / 2).toBeCloseTo(STACK.worldWidth / 2);
  });

  it('perfect drops keep the width and count perfects', () => {
    const state = createStack([]);
    const base = topBlock(state);
    const { state: next, result } = placeBlock(state, base.x + 0.5, base.width);
    expect(result.kind).toBe('perfect');
    expect(next.floors).toBe(1);
    expect(next.perfects).toBe(1);
    expect(topBlock(next).width).toBe(base.width); // already at start width, cannot grow
  });

  it('a perfect drop regrows a trimmed tower, up to the starting width', () => {
    let state = createStack([]);
    const base = topBlock(state);
    state = placeBlock(state, base.x + 10, base.width).state; // trim to 50
    expect(topBlock(state).width).toBeCloseTo(50);
    const top = topBlock(state);
    state = placeBlock(state, top.x, top.width).state;
    expect(topBlock(state).width).toBeCloseTo(53);
  });

  it('overhangs are trimmed and returned as debris', () => {
    const state = createStack([]);
    const base = topBlock(state);
    const { state: next, result } = placeBlock(state, base.x + 15, base.width);
    expect(result.kind).toBe('trim');
    if (result.kind !== 'trim') throw new Error('expected trim');
    expect(result.placed.width).toBeCloseTo(base.width - 15);
    expect(result.debris.width).toBeCloseTo(15);
    expect(result.placed.x).toBeCloseTo(base.x + 15);
    expect(next.streak).toBe(0);
  });

  it('missing the tower entirely loses the game', () => {
    const state = createStack([]);
    const base = topBlock(state);
    const { state: next, result } = placeBlock(state, base.x + base.width + 1, base.width);
    expect(result.kind).toBe('miss');
    expect(next.status).toBe('lost');
    expect(next.floors).toBe(0);
    // Further drops after losing change nothing.
    expect(placeBlock(next, base.x, base.width).state).toBe(next);
  });

  it(`reaching ${STACK.targetFloors} floors wins`, () => {
    let state = createStack([]);
    for (let i = 0; i < STACK.targetFloors; i += 1) {
      const top = topBlock(state);
      state = placeBlock(state, top.x, top.width).state;
    }
    expect(state.status).toBe('won');
    expect(state.floors).toBe(STACK.targetFloors);
  });

  it('spawns new boxes at the far edge and bounces them inside the play area', () => {
    const state = createStack([]);
    const mover = spawnMover(state);
    expect(mover.x === 0 || mover.x === STACK.worldWidth - mover.width).toBe(true);
    let x = mover.x;
    let dir: number = mover.dir;
    for (let i = 0; i < 500; i += 1) {
      const r = stepMover(x, dir, mover.width, 90, 0.05);
      x = r.x;
      dir = r.dir;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(STACK.worldWidth - mover.width + 1e-9);
    }
  });

  it('speeds up per floor, capped, and Steady Hands slows it', () => {
    expect(speedFor(0, false)).toBe(STACK.baseSpeed);
    expect(speedFor(1000, false)).toBe(STACK.maxSpeed);
    expect(speedFor(10, true)).toBeCloseTo(speedFor(10, false) * STACK.slowFactor);
  });

  it('a frame-perfect 30-floor tower still fits the server limits for box-stack', () => {
    // Every drop needs the box to travel from its far-edge spawn back over the tower.
    let state = createStack([]);
    let seconds = 0;
    while (state.status === 'playing') {
      const mover = spawnMover(state);
      const top = topBlock(state);
      seconds += Math.abs(mover.x - top.x) / speedFor(state.floors, false);
      state = placeBlock(state, top.x, top.width).state;
    }
    const maxPointsPerSecond = 4; // experiences.max_points_per_second
    const minWinSeconds = 8; // experiences.min_win_seconds
    expect(state.status).toBe('won');
    expect(seconds).toBeGreaterThanOrEqual(minWinSeconds);
    expect(state.floors).toBeLessThanOrEqual(Math.ceil(maxPointsPerSecond * seconds) + 2);
  });
});

describe('Lane Dash rules', () => {
  it('generates the same track for the same seed', () => {
    expect(generateTrack(7)).toEqual(generateTrack(7));
    expect(generateTrack(7)).not.toEqual(generateTrack(8));
  });

  it('every row leaves a free lane and close rows stay reachable', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const track = generateTrack(seed);
      const rows = new Map<number, number[]>();
      for (const e of track) {
        if (e.kind === 'barrier') rows.set(e.d, [...(rows.get(e.d) ?? []), e.lane]);
      }
      const ordered = [...rows.entries()].sort((a, b) => a[0] - b[0]);
      let prevFree = [0, 1, 2];
      let prevD = 0;
      for (const [d, blocked] of ordered) {
        expect(blocked.length).toBeLessThan(3);
        const free = [0, 1, 2].filter((l) => !blocked.includes(l));
        if (d - prevD < 24) {
          expect(free.some((f) => prevFree.some((p) => Math.abs(f - p) <= 1))).toBe(true);
        }
        prevFree = free;
        prevD = d;
      }
      expect(ordered[ordered.length - 1]![0]).toBeLessThan(DASH.finish);
    }
  });

  it('never places a coin on top of a barrier', () => {
    const track = generateTrack(2024);
    const barriers = track.filter((e) => e.kind === 'barrier');
    for (const coin of track.filter((e) => e.kind === 'coin')) {
      expect(barriers.some((b) => b.lane === coin.lane && Math.abs(b.d - coin.d) < DASH.barrierHalfLength + DASH.coinHalfLength)).toBe(false);
    }
  });

  it('speed ramps from start to max', () => {
    expect(speedAt(0)).toBe(DASH.startSpeed);
    expect(speedAt(DASH.rampDistance)).toBe(DASH.maxSpeed);
    expect(speedAt(DASH.finish)).toBe(DASH.maxSpeed);
  });

  it('detects barrier hits in the player lane, including across long frames', () => {
    const entities: Entity[] = [
      { id: 1, kind: 'barrier', lane: 1, d: 100 },
      { id: 2, kind: 'coin', lane: 0, d: 100.5 },
    ];
    expect(detectCollisions(entities, 98, 99.5, 1, false, []).hitId).toBe(1);
    expect(detectCollisions(entities, 95, 105, 1, false, []).hitId).toBe(1); // swept
    expect(detectCollisions(entities, 98, 99.5, 0, false, []).hitId).toBe(-1);
    expect(detectCollisions(entities, 98, 99.5, 1, false, [1]).hitId).toBe(-1); // shield consumed it
  });

  it('collects coins in the lane, and in neighbouring lanes with Coin Magnet', () => {
    const entities: Entity[] = [{ id: 5, kind: 'coin', lane: 0, d: 50 }];
    expect(detectCollisions(entities, 49, 50, 0, false, []).coinIds).toEqual([5]);
    expect(detectCollisions(entities, 49, 50, 1, false, []).coinIds).toEqual([]);
    expect(detectCollisions(entities, 49, 50, 1, true, []).coinIds).toEqual([5]);
    expect(detectCollisions(entities, 49, 50, 0, false, [5]).coinIds).toEqual([]);
  });

  it('scores distance plus coins and finds visible windows', () => {
    expect(dashScore(2000, 10)).toBe(200 + 50);
    expect(dashScore(5000, 0)).toBe(200); // capped at the finish line
    const track = generateTrack(3);
    const window = visibleWindow(track, 300, 10, 50);
    expect(window.every((e) => e.d >= 290 && e.d < 350)).toBe(true);
    expect(lowerBound(track, -1)).toBe(0);
    expect(lowerBound(track, 1e9)).toBe(track.length);
  });

  it('a perfect run stays inside the server limits for lane-dash', () => {
    // Fastest possible finish time given the speed ramp.
    let d = 0;
    let t = 0;
    while (d < DASH.finish) {
      d += speedAt(d) * 0.01;
      t += 0.01;
    }
    const track = generateTrack(11);
    const maxScore = dashScore(DASH.finish, track.filter((e) => e.kind === 'coin').length);
    expect(t).toBeGreaterThan(60); // experiences.min_win_seconds
    expect(maxScore / t).toBeLessThan(20); // experiences.max_points_per_second
  });
});

describe('catalog consistency', () => {
  const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261114000700_catalog.sql'), 'utf8');

  it('every catalog item has artwork for its slot', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { KNOWN_ASSETS } = require('@/features/avatar/parts') as typeof import('@/features/avatar/parts');
    const rows = [...sql.matchAll(/\('([a-z0-9-]+)',\s*'[^']*',\s*'[^']*',\s*'(hat|face|top|bottom|accessory|back)',\s*'(\w+)',\s*'(\w+)'/g)];
    expect(rows.length).toBeGreaterThan(25);
    for (const [, slug, slot, , asset] of rows) {
      const known = KNOWN_ASSETS[slot as keyof typeof KNOWN_ASSETS] as readonly string[];
      expect({ slug, ok: known.includes(asset!) }).toEqual({ slug, ok: true });
    }
  });

  it('every playable experience has a game implementation', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isGameImplemented } = require('@/games/registry') as typeof import('@/games/registry');
    const playable = [...sql.matchAll(/\('([a-z0-9-]+)', '[^']+', '[^']+',\s*'[^']*',\s*'[^']*',\s*'\w+', 'playable'/g)].map((m) => m[1]!);
    expect(playable.sort()).toEqual(['box-stack', 'lane-dash']);
    for (const slug of playable) expect(isGameImplemented(slug)).toBe(true);
  });
});
