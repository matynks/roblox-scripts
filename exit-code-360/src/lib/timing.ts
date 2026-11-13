// Narration timing helpers. All times are narration seconds (0 = first sample).
import phrasesJson from "../data/narration_phrases.json";
import wordsJson from "../data/narration_words.json";

export type Span = { start: number; end: number; text: string };
type Word = { word: string; start: number; end: number };

export const NARRATION_SECONDS = 439.722;
export const FPS = 30;
export const FILM_FRAMES = Math.ceil(NARRATION_SECONDS * FPS); // 13,192

const PH = (phrasesJson as { phrases: (Span & { id: string })[] }).phrases;
const WD: Word[] = (wordsJson as { words: Word[] }).words;

/** Phrase by number (1-based, as in docs/02_AUDIO_TIMING_MAP.md). */
export const P = (n: number): Span => PH[n - 1];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** First word matching `text` that starts at or after `after`. */
export const W = (text: string, after = 0): Span => {
  const k = norm(text);
  const w = WD.find((x) => x.start >= after - 0.01 && norm(x.word) === k);
  if (!w) throw new Error(`word not found: ${text} after ${after}`);
  return { start: w.start, end: w.end, text: w.word };
};

/** Mouth openness 0..1 while a character voices the narration words in [t0, t1]. */
export const talk = (T: number, t0: number, t1: number) => {
  for (const w of WD) {
    if (w.start < t0 - 0.01 || w.start > t1) continue;
    if (T >= w.start - 0.02 && T <= w.end + 0.03) {
      const x = (T - w.start) / Math.max(0.12, w.end - w.start);
      const syll = Math.max(1, Math.round((w.end - w.start) / 0.16));
      return 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * syll * Math.min(1, x)));
    }
  }
  return 0;
};
