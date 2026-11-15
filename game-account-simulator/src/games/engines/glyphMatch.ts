import { type GameEvent, num, type Perks, type Rng } from './common';

/**
 * Glyph Match — a timed memory game. Flip two cards; matching pairs stay up.
 * Score: +100 per pair, +50 per consecutive match (combo), and when the board
 * is cleared +10 for every second left on the clock.
 */

export const THEMES: Record<string, string[]> = {
  glyphs: ['flame', 'water', 'leaf', 'planet', 'moon', 'sunny', 'flash', 'snow', 'diamond', 'star'],
  ocean: ['fish', 'boat', 'water', 'sunny', 'cloudy', 'umbrella', 'compass', 'flower', 'planet', 'star'],
  runes: ['flash', 'flame', 'skull', 'eye', 'key', 'moon', 'planet', 'diamond', 'shield', 'star'],
  pets: ['paw', 'fish', 'bug', 'leaf', 'heart', 'ice-cream', 'balloon', 'gift', 'star', 'flower'],
};

export interface GlyphCard {
  id: number;
  symbol: string;
  state: 'hidden' | 'up' | 'matched';
}

export interface GlyphState {
  cols: number;
  rows: number;
  cards: GlyphCard[];
  open: number[]; // indexes currently face-up and unmatched
  resolveIn: number; // >0 while a mismatched pair is shown
  timeLeft: number;
  limit: number;
  peek: number; // seconds of the hint perk remaining
  score: number;
  combo: number;
  bestCombo: number;
  moves: number;
  matches: number;
  over: boolean;
  won: boolean;
  time: number;
}

export function initGlyph(config: Record<string, any>, perks: Perks, rng: Rng): GlyphState {
  const cols = Math.max(2, Math.min(5, num(config.cols, 4)));
  const rows = Math.max(2, Math.min(5, num(config.rows, 4)));
  const pairs = Math.floor((cols * rows) / 2);
  const pool = THEMES[String(config.theme)] ?? THEMES.glyphs;
  const symbols = pool.slice(0, pairs);
  const deck = [...symbols, ...symbols];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const limit = num(config.timeLimit, 90) + num(perks.time_bonus, 0);
  return {
    cols,
    rows,
    cards: deck.map((symbol, id) => ({ id, symbol, state: 'hidden' })),
    open: [],
    resolveIn: 0,
    timeLeft: limit,
    limit,
    peek: num(perks.hint, 0),
    score: 0,
    combo: 0,
    bestCombo: 0,
    moves: 0,
    matches: 0,
    over: false,
    won: false,
    time: 0,
  };
}

export function stepGlyph(s: GlyphState, dt: number): { state: GlyphState; events: GameEvent[] } {
  if (s.over) return { state: s, events: [] };
  const d = Math.min(dt, 0.05);
  if (s.peek > 0) return { state: { ...s, peek: Math.max(0, s.peek - d) }, events: [] };
  let next: GlyphState = { ...s, timeLeft: Math.max(0, s.timeLeft - d), time: s.time + d };
  if (s.resolveIn > 0) {
    const r = s.resolveIn - d;
    if (r <= 0) {
      next = { ...next, resolveIn: 0, open: [], cards: next.cards.map((c, i) => (s.open.includes(i) ? { ...c, state: 'hidden' } : c)) };
    } else next = { ...next, resolveIn: r };
  }
  if (next.timeLeft <= 0) return { state: { ...next, over: true }, events: ['gameover'] };
  return { state: next, events: [] };
}

export function flipGlyph(s: GlyphState, index: number): { state: GlyphState; events: GameEvent[] } {
  if (s.over || s.peek > 0 || s.resolveIn > 0) return { state: s, events: [] };
  const card = s.cards[index];
  if (!card || card.state !== 'hidden') return { state: s, events: [] };
  const cards = s.cards.map((c, i) => (i === index ? { ...c, state: 'up' as const } : c));
  const open = [...s.open, index];
  if (open.length < 2) return { state: { ...s, cards, open }, events: [] };
  const [a, b] = open;
  const moves = s.moves + 1;
  if (cards[a].symbol === cards[b].symbol) {
    const combo = s.combo + 1;
    const matched = cards.map((c, i) => (i === a || i === b ? { ...c, state: 'matched' as const } : c));
    const matches = s.matches + 1;
    let score = s.score + 100 + (combo - 1) * 50;
    const won = matched.every((c) => c.state === 'matched');
    if (won) score += Math.floor(s.timeLeft) * 10;
    return {
      state: { ...s, cards: matched, open: [], moves, matches, combo, bestCombo: Math.max(s.bestCombo, combo), score, won, over: won },
      events: won ? ['match', 'gameover'] : combo >= 3 ? ['match', 'combo'] : ['match'],
    };
  }
  return { state: { ...s, cards, open, moves, combo: 0, resolveIn: 0.75 }, events: ['mismatch'] };
}
