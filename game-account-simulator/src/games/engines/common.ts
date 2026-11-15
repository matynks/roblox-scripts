export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Perks {
  orb_multiplier?: number;
  xp_multiplier?: number;
  extra_life?: number;
  time_bonus?: number;
  hint?: number;
  precision?: number;
}

/** Events emitted by a step/input so the renderer can play haptics and effects. */
export type GameEvent = 'hit' | 'collect' | 'perfect' | 'place' | 'miss' | 'bomb' | 'match' | 'mismatch' | 'gameover' | 'combo' | 'golden';

export const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
