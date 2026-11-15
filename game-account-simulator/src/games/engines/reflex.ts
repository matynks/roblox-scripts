import { type GameEvent, num, type Perks, type Rng } from './common';

/**
 * Block Smash — targets pop up on a grid; tap them before they vanish.
 * Normal +10 (+combo bonus up to +10), golden +30, bombs −20 and break the combo.
 */

export type ReflexKind = 'target' | 'golden' | 'bomb';

export interface ReflexTarget {
  id: number;
  cell: number;
  kind: ReflexKind;
  age: number;
  life: number;
}

export interface ReflexState {
  grid: number;
  targets: ReflexTarget[];
  timeLeft: number;
  duration: number;
  spawnTimer: number;
  spawnEvery: number;
  lifetime: number;
  goldenChance: number;
  bombChance: number;
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  misses: number;
  over: boolean;
  nextId: number;
  time: number;
  pops: { cell: number; kind: ReflexKind | 'miss'; age: number; points: number }[];
}

export function initReflex(config: Record<string, any>, perks: Perks): ReflexState {
  const duration = num(config.duration, 30) + num(perks.time_bonus, 0);
  return {
    grid: Math.max(3, Math.min(5, num(config.grid, 4))),
    targets: [],
    timeLeft: duration,
    duration,
    spawnTimer: 0.4,
    spawnEvery: num(config.spawnEvery, 0.55),
    lifetime: num(config.lifetime, 1.25),
    goldenChance: num(config.goldenChance, 0.1),
    bombChance: num(config.bombChance, 0.14),
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,
    misses: 0,
    over: false,
    nextId: 1,
    time: 0,
    pops: [],
  };
}

export function stepReflex(s: ReflexState, dt: number, rng: Rng): { state: ReflexState; events: GameEvent[] } {
  if (s.over) return { state: { ...s, pops: s.pops.map((p) => ({ ...p, age: p.age + dt })).filter((p) => p.age < 0.6) }, events: [] };
  const d = Math.min(dt, 0.05);
  const events: GameEvent[] = [];
  const timeLeft = Math.max(0, s.timeLeft - d);
  const progress = 1 - timeLeft / s.duration;
  let { spawnTimer, nextId, combo } = s;
  let targets = s.targets.map((t) => ({ ...t, age: t.age + d }));
  // Expired normal targets break the combo; expired bombs are harmless.
  const expired = targets.filter((t) => t.age >= t.life);
  if (expired.some((t) => t.kind !== 'bomb')) combo = 0;
  targets = targets.filter((t) => t.age < t.life);

  spawnTimer -= d;
  const cells = s.grid * s.grid;
  while (spawnTimer <= 0) {
    spawnTimer += s.spawnEvery * (1 - progress * 0.35);
    const used = new Set(targets.map((t) => t.cell));
    const free = Array.from({ length: cells }, (_, i) => i).filter((i) => !used.has(i));
    if (!free.length) break;
    const roll = rng();
    const kind: ReflexKind = roll < s.bombChance ? 'bomb' : roll < s.bombChance + s.goldenChance ? 'golden' : 'target';
    targets.push({ id: nextId++, cell: free[Math.floor(rng() * free.length)], kind, age: 0, life: s.lifetime * (kind === 'golden' ? 0.75 : 1) * (1 - progress * 0.25) });
  }
  const over = timeLeft <= 0;
  if (over) events.push('gameover');
  return {
    state: { ...s, timeLeft, spawnTimer, nextId, combo, targets: over ? [] : targets, over, time: s.time + d, pops: s.pops.map((p) => ({ ...p, age: p.age + d })).filter((p) => p.age < 0.6) },
    events,
  };
}

export function tapReflex(s: ReflexState, cell: number): { state: ReflexState; events: GameEvent[] } {
  if (s.over) return { state: s, events: [] };
  const target = s.targets.find((t) => t.cell === cell);
  if (!target) {
    return { state: { ...s, combo: 0, misses: s.misses + 1, pops: [...s.pops, { cell, kind: 'miss', age: 0, points: 0 }] }, events: ['miss'] };
  }
  const targets = s.targets.filter((t) => t.id !== target.id);
  if (target.kind === 'bomb') {
    return { state: { ...s, targets, score: Math.max(0, s.score - 20), combo: 0, misses: s.misses + 1, pops: [...s.pops, { cell, kind: 'bomb', age: 0, points: -20 }] }, events: ['bomb'] };
  }
  const combo = s.combo + 1;
  const points = target.kind === 'golden' ? 30 : 10 + Math.min(combo - 1, 10);
  return {
    state: { ...s, targets, score: s.score + points, combo, bestCombo: Math.max(s.bestCombo, combo), hits: s.hits + 1, pops: [...s.pops, { cell, kind: target.kind, age: 0, points }] },
    events: target.kind === 'golden' ? ['golden'] : combo % 5 === 0 ? ['hit', 'combo'] : ['hit'],
  };
}
