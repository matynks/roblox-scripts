import { type GameEvent, num, type Perks } from './common';

/**
 * Sky Stack — tap to drop a sliding block on the tower. Overhangs are sliced
 * off; a near-perfect drop keeps the full width and scores a bonus.
 * Score: +1 per block, +1 per perfect drop.
 */

export interface StackLayer {
  x: number; // left edge, 0..1 of the play width
  w: number;
  perfect?: boolean;
}

export interface Shard {
  x: number;
  w: number;
  y: number; // layer index
  vy: number;
  age: number;
}

export interface StackState {
  layers: StackLayer[];
  moving: StackLayer;
  dir: 1 | -1;
  speed: number;
  baseSpeed: number;
  speedup: number;
  tolerance: number;
  score: number;
  perfectStreak: number;
  perfects: number;
  sinceDrop: number;
  shards: Shard[];
  over: boolean;
  time: number;
}

/** A drop is only accepted once the block has moved for this long (prevents spam-tapping). */
export const MIN_DROP_INTERVAL = 0.25;

export function initStack(config: Record<string, any>, perks: Perks): StackState {
  const w = Math.max(0.3, Math.min(0.8, num(config.startWidth, 0.6)));
  const base = { x: (1 - w) / 2, w };
  return {
    layers: [base],
    moving: { x: 0, w },
    dir: 1,
    speed: num(config.speed, 0.9),
    baseSpeed: num(config.speed, 0.9),
    speedup: num(config.speedup, 0.035),
    tolerance: num(config.perfectTolerance, 0.018) * num(perks.precision, 1),
    score: 0,
    perfectStreak: 0,
    perfects: 0,
    sinceDrop: 0,
    shards: [],
    over: false,
    time: 0,
  };
}

export function stepStack(s: StackState, dt: number): StackState {
  if (s.over) return { ...s, shards: s.shards.map((sh) => ({ ...sh, age: sh.age + dt, vy: sh.vy + 3 * dt })).filter((sh) => sh.age < 1.5) };
  const d = Math.min(dt, 0.05);
  let x = s.moving.x + s.dir * s.speed * d;
  let dir = s.dir;
  if (x <= 0) {
    x = 0;
    dir = 1;
  } else if (x + s.moving.w >= 1) {
    x = 1 - s.moving.w;
    dir = -1;
  }
  return {
    ...s,
    moving: { ...s.moving, x },
    dir,
    sinceDrop: s.sinceDrop + d,
    time: s.time + d,
    shards: s.shards.map((sh) => ({ ...sh, age: sh.age + d, vy: sh.vy + 3 * d })).filter((sh) => sh.age < 1.5),
  };
}

export function dropStack(s: StackState): { state: StackState; events: GameEvent[] } {
  if (s.over || s.sinceDrop < MIN_DROP_INTERVAL) return { state: s, events: [] };
  const prev = s.layers[s.layers.length - 1];
  const m = s.moving;
  const level = s.layers.length;
  if (Math.abs(m.x - prev.x) <= s.tolerance) {
    const layer = { x: prev.x, w: prev.w, perfect: true };
    const streak = s.perfectStreak + 1;
    return {
      state: next(s, layer, s.score + 2, streak, s.perfects + 1, []),
      events: streak >= 3 ? ['perfect', 'combo'] : ['perfect'],
    };
  }
  const left = Math.max(m.x, prev.x);
  const right = Math.min(m.x + m.w, prev.x + prev.w);
  const overlap = right - left;
  if (overlap <= 0.005) {
    return { state: { ...s, over: true, shards: [...s.shards, { x: m.x, w: m.w, y: level, vy: 0, age: 0 }] }, events: ['miss', 'gameover'] };
  }
  const cut = m.x < prev.x ? { x: m.x, w: prev.x - m.x } : { x: prev.x + prev.w, w: m.x + m.w - (prev.x + prev.w) };
  const layer = { x: left, w: overlap };
  return { state: next(s, layer, s.score + 1, 0, s.perfects, [{ ...cut, y: level, vy: 0, age: 0 }]), events: ['place'] };
}

function next(s: StackState, layer: StackLayer, score: number, perfectStreak: number, perfects: number, shards: Shard[]): StackState {
  const level = s.layers.length;
  const fromLeft = level % 2 === 0;
  return {
    ...s,
    layers: [...s.layers, layer],
    moving: { x: fromLeft ? 0 : 1 - layer.w, w: layer.w },
    dir: fromLeft ? 1 : -1,
    speed: s.baseSpeed * (1 + s.speedup * level),
    score,
    perfectStreak,
    perfects,
    sinceDrop: 0,
    shards: [...s.shards, ...shards],
  };
}
