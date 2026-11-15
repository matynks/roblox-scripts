import { type GameEvent, num, type Perks, type Rng } from './common';

/**
 * Orb Rush — a three-lane dodger. Blocks and orbs fall toward the player;
 * swipe or tap left/right to change lanes. Speed ramps up over time.
 * Score: 10 points/second scaled by speed + 25 per orb.
 */

export interface RushEntity {
  id: number;
  lane: number;
  y: number; // 0 = top, 1 = bottom
  kind: 'block' | 'orb';
}

export interface RushState {
  lanes: number;
  lane: number; // target lane
  playerX: number; // animated lane position
  entities: RushEntity[];
  speed: number;
  startSpeed: number;
  accel: number;
  maxSpeed: number;
  spawnEvery: number;
  orbChance: number;
  spawnTimer: number;
  lives: number;
  maxLives: number;
  invulnerable: number;
  score: number;
  distance: number;
  orbs: number;
  time: number;
  over: boolean;
  nextId: number;
}

export const PLAYER_Y = 0.84;
const HIT_TOP = PLAYER_Y - 0.06;
const HIT_BOTTOM = PLAYER_Y + 0.05;

export function initRush(config: Record<string, any>, perks: Perks): RushState {
  const lives = num(config.lives, 3) + num(perks.extra_life, 0);
  const lanes = Math.max(3, Math.min(5, num(config.lanes, 3)));
  return {
    lanes,
    lane: Math.floor(lanes / 2),
    playerX: Math.floor(lanes / 2),
    entities: [],
    speed: num(config.startSpeed, 0.5),
    startSpeed: num(config.startSpeed, 0.5),
    accel: num(config.accel, 0.012),
    maxSpeed: num(config.maxSpeed, 1.6),
    spawnEvery: num(config.spawnEvery, 0.85),
    orbChance: num(config.orbChance, 0.45),
    spawnTimer: 0.6,
    lives,
    maxLives: lives,
    invulnerable: 0,
    score: 0,
    distance: 0,
    orbs: 0,
    time: 0,
    over: false,
    nextId: 1,
  };
}

export function moveRush(s: RushState, dir: -1 | 1): RushState {
  if (s.over) return s;
  return { ...s, lane: Math.max(0, Math.min(s.lanes - 1, s.lane + dir)) };
}

export function stepRush(s: RushState, dt: number, rng: Rng): { state: RushState; events: GameEvent[] } {
  if (s.over) return { state: s, events: [] };
  const events: GameEvent[] = [];
  const d = Math.min(dt, 0.05);
  let { speed, spawnTimer, lives, invulnerable, score, orbs, nextId } = s;
  speed = Math.min(s.maxSpeed, speed + s.accel * d);
  const ratio = speed / s.startSpeed;
  score += 10 * ratio * d;
  invulnerable = Math.max(0, invulnerable - d);

  let entities = s.entities.map((e) => ({ ...e, y: e.y + speed * d })).filter((e) => e.y < 1.1);

  spawnTimer -= d;
  if (spawnTimer <= 0) {
    spawnTimer += s.spawnEvery / Math.max(1, ratio * 0.85);
    const free = Array.from({ length: s.lanes }, (_, i) => i);
    const blocks = rng() < 0.35 ? 2 : 1;
    for (let b = 0; b < Math.min(blocks, s.lanes - 1); b++) {
      const idx = Math.floor(rng() * free.length);
      entities.push({ id: nextId++, lane: free[idx], y: -0.08, kind: 'block' });
      free.splice(idx, 1);
    }
    if (rng() < s.orbChance && free.length) {
      entities.push({ id: nextId++, lane: free[Math.floor(rng() * free.length)], y: -0.12, kind: 'orb' });
    }
  }

  const remaining: RushEntity[] = [];
  for (const e of entities) {
    const inZone = e.lane === s.lane && e.y >= HIT_TOP && e.y <= HIT_BOTTOM;
    if (inZone && e.kind === 'orb') {
      orbs++;
      score += 25;
      events.push('collect');
      continue;
    }
    if (inZone && e.kind === 'block' && invulnerable <= 0) {
      lives--;
      invulnerable = 1.1;
      events.push('hit');
      continue;
    }
    remaining.push(e);
  }
  entities = remaining;

  const playerX = s.playerX + (s.lane - s.playerX) * Math.min(1, d * 16);
  const over = lives <= 0;
  if (over) events.push('gameover');
  return {
    state: { ...s, speed, spawnTimer, lives, invulnerable, score, orbs, entities, playerX, nextId, over, time: s.time + d, distance: s.distance + speed * d },
    events,
  };
}
