/**
 * Lane Dash: pure game rules. Distances are in metres along the track.
 * Functions marked 'worklet' also run on the UI thread inside the frame callback.
 */
import { createRng, randomInt } from '../rng';

export const DASH = {
  lanes: 3,
  finish: 2000,
  startSpeed: 13,
  maxSpeed: 32,
  rampDistance: 1800,
  firstRow: 45,
  barrierHalfLength: 1.1,
  coinHalfLength: 1.0,
  coinPoints: 5,
  metresPerPoint: 10,
} as const;

export type EntityKind = 'barrier' | 'coin';
export type Entity = { id: number; kind: EntityKind; lane: number; d: number };

export function speedAt(distance: number): number {
  'worklet';
  const t = Math.min(1, Math.max(0, distance) / DASH.rampDistance);
  return DASH.startSpeed + (DASH.maxSpeed - DASH.startSpeed) * t;
}

export function dashScore(distance: number, coins: number): number {
  return Math.floor(Math.min(distance, DASH.finish) / DASH.metresPerPoint) + coins * DASH.coinPoints;
}

function rowSpacing(d: number, jitter: number): number {
  const t = Math.min(1, d / DASH.rampDistance);
  return 34 - 16 * t + jitter;
}

/**
 * Builds the whole track up to the finish line, deterministically from a seed.
 * Guarantees: every row leaves at least one free lane, and when rows are close
 * together a free lane is always reachable with a single lane change.
 */
export function generateTrack(seed: number): Entity[] {
  const rng = createRng(seed);
  const entities: Entity[] = [];
  let id = 1;
  let d: number = DASH.firstRow;
  let prevFree: number[] = [0, 1, 2];
  let prevD = 0;

  while (d < DASH.finish - 20) {
    const t = Math.min(1, d / DASH.rampDistance);
    const twoBarriers = d > 250 && rng() < 0.2 + 0.4 * t;
    let blocked: number[];
    if (twoBarriers) {
      const free = randomInt(rng, 0, 2);
      blocked = [0, 1, 2].filter((lane) => lane !== free);
    } else {
      blocked = [randomInt(rng, 0, 2)];
    }

    let free = [0, 1, 2].filter((lane) => !blocked.includes(lane));
    const close = d - prevD < 24;
    const reachable = free.some((f) => prevFree.some((p) => Math.abs(f - p) <= 1));
    if (close && !reachable) {
      // Keep the middle lane open: it is one move away from every lane.
      blocked = blocked.filter((lane) => lane !== 1);
      free = [0, 1, 2].filter((lane) => !blocked.includes(lane));
    }

    for (const lane of blocked) {
      entities.push({ id: id++, kind: 'barrier', lane, d });
    }

    // A short line of coins leading into one of this row's free lanes.
    if (rng() < 0.7) {
      const lane = free[randomInt(rng, 0, free.length - 1)]!;
      const count = randomInt(rng, 3, 5);
      const start = Math.max(prevD + 4, d - 4 - count * 3);
      for (let i = 0; i < count; i += 1) {
        const cd = start + i * 3;
        if (cd < d - 2) entities.push({ id: id++, kind: 'coin', lane, d: cd });
      }
    }

    prevFree = free;
    prevD = d;
    d += rowSpacing(d, rng() * 6);
  }

  return entities.sort((a, b) => a.d - b.d || a.id - b.id);
}

/** Index of the first entity with d >= target (entities sorted by d). */
export function lowerBound(entities: readonly Entity[], target: number): number {
  'worklet';
  let lo = 0;
  let hi = entities.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (entities[mid]!.d < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function visibleWindow(entities: readonly Entity[], distance: number, behind: number, ahead: number): Entity[] {
  const start = lowerBound(entities, distance - behind);
  const end = lowerBound(entities, distance + ahead);
  return entities.slice(start, end);
}

export type CollisionResult = { hitId: number; coinIds: number[] };

/**
 * Swept collision test between the previous and current distance (so long frames
 * can't tunnel through a barrier). laneX is the player's visual lane position (0..2).
 */
export function detectCollisions(
  entities: readonly Entity[],
  prevDistance: number,
  distance: number,
  laneX: number,
  magnet: boolean,
  consumed: readonly number[],
): CollisionResult {
  'worklet';
  const coinIds: number[] = [];
  let hitId = -1;
  const from = Math.min(prevDistance, distance) - DASH.barrierHalfLength;
  const to = Math.max(prevDistance, distance) + DASH.barrierHalfLength;
  for (let i = lowerBound(entities, from); i < entities.length; i += 1) {
    const e = entities[i]!;
    if (e.d > to) break;
    if (consumed.includes(e.id)) continue;
    const laneGap = Math.abs(e.lane - laneX);
    if (e.kind === 'barrier') {
      if (laneGap < 0.55 && hitId === -1) hitId = e.id;
    } else if (laneGap < (magnet ? 1.6 : 0.6)) {
      coinIds.push(e.id);
    }
  }
  return { hitId, coinIds };
}
