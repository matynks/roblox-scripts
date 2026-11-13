// POC timeline. ALL times are NARRATION seconds (0 = first sample of the
// approved MP3), measured in docs/02_AUDIO_TIMING_MAP.md. The POC window is
// [START, END). The audio mixer (tools/mix_audio.py) reads cues.json, written
// from the same numbers, so picture and sound cannot drift apart.
import words from "../../data/narration_words.json";

export const START = 13.7;
export const END = 43.2;
export const FPS = 30;
export const DURATION_FRAMES = Math.round((END - START) * FPS); // 885

export const CUE = {
  bell1: 14.78,
  bell2: 15.12,
  leoSense: 16.05, // 360° ring flicker behind Leo's head
  stepStart: 16.3,
  cyclistPass: 16.95,
  flourish: 17.8,
  danceEnd: 18.28,
  cut1: 18.95,
  miaStare: 19.19,
  miaHow: 20.63,
  miaAsk: 21.59,
  leoTurn: 21.7,
  leoShrug: 22.45,
  gullAppear: 23.4,
  miaNotice: 23.95,
  leoLift: 25.5,
  gullSnap: 25.92,
  miaDuck: 25.9,
  gullLand: 26.75,
  gullGlare: 26.95,
  leoBite: 27.25,
  gullHmph: 28.22,
  gullTakeoff: 28.48,
  pushIn: 28.85,
  xfade: 29.12,
  diagramIn: 29.35,
  fovOpen: 29.95,
  fov200: 31.45,
  ahead: 32.3,
  sides: 33.5,
  behind: 35.2,
  nothing: 36.5,
  you: 37.42,
  sweep360: 38.22,
  sweepDone: 39.35,
  circle: 39.74,
  noBlind: 41.02,
  shatter: 41.38,
  noBack: 42.22,
  fadeOut: 42.95,
} as const;

type Word = { word: string; start: number; end: number };
const W: Word[] = (words as { words: Word[] }).words;

/** Mouth openness 0..1 for a character voicing narration words in [t0, t1]. */
export const lipSync = (T: number, t0: number, t1: number) => {
  for (const w of W) {
    if (w.start < t0 || w.start > t1) continue;
    if (T >= w.start - 0.02 && T <= w.end + 0.03) {
      const x = (T - w.start) / Math.max(0.12, w.end - w.start);
      const syll = Math.max(1, Math.round((w.end - w.start) / 0.16));
      return 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * syll * Math.min(1, x)));
    }
  }
  return 0;
};

/** Integrate a speed profile v(T) from START to T (world px). */
export const integrate = (v: (T: number) => number, from: number, T: number, dt = 1 / 240) => {
  let x = 0;
  for (let s = from; s < T; s += dt) x += v(Math.min(s + dt / 2, T)) * Math.min(dt, T - s);
  return x;
};
