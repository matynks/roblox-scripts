// Small, dependency-free animation helpers. All timing in SECONDS (film time),
// converted from frames once per component via useTime().
import { useCurrentFrame, useVideoConfig } from "remotion";

export const useTime = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const deg = (d: number) => (d * Math.PI) / 180;

export type EaseFn = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
} satisfies Record<string, EaseFn>;

/** Tween between a and b over [t0,t1] with easing. */
export const tween = (t: number, t0: number, t1: number, a: number, b: number, e: EaseFn = ease.inOut) =>
  lerp(a, b, e(invLerp(t0, t1, t)));

/**
 * Keyframe track: [[time, value], ...] (times ascending). Segments use the
 * easing given per key (applied on the segment that STARTS at that key).
 */
export type Key = [number, number] | [number, number, EaseFn];
export const track = (t: number, keys: Key[], defEase: EaseFn = ease.inOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0, e] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, (e ?? defEase)(invLerp(t0, t1, t)));
  }
  return keys[keys.length - 1][1];
};

/** Damped spring response to a unit step at t0 (0 → 1, overshoots). */
export const springStep = (t: number, t0: number, freq = 2.2, damping = 0.45) => {
  if (t <= t0) return 0;
  const x = t - t0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-damping * w * x) * Math.cos(w * Math.sqrt(1 - damping * damping) * x);
};

/** Decaying oscillation triggered at t0 (for wobbles / secondary motion). */
export const wobble = (t: number, t0: number, amp = 1, freq = 3, decay = 4) => {
  if (t < t0) return 0;
  const x = t - t0;
  return amp * Math.exp(-decay * x) * Math.sin(2 * Math.PI * freq * x);
};

/** Deterministic pseudo random in [0,1) from an integer/float seed. */
export const rand = (seed: number) => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

/** Smooth 1D value noise in [-1,1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = rand(i + seed * 101.3) * 2 - 1;
  const b = rand(i + 1 + seed * 101.3) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u);
};

/** Mix two hex colors. */
export const mixColor = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(t)));
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, "0")}`;
};

/** Visible on [t0,t1] with fades. Returns opacity. */
export const window01 = (t: number, t0: number, t1: number, fadeIn = 0.3, fadeOut = 0.3) =>
  Math.min(invLerp(t0, t0 + fadeIn, t), 1 - invLerp(t1 - fadeOut, t1, t));
