import { GAMES } from '@/content/games';

import { makeRng } from './common';
import { flipGlyph, initGlyph, stepGlyph } from './glyphMatch';
import { initRush, moveRush, PLAYER_Y, stepRush } from './orbRush';
import { initReflex, stepReflex, tapReflex } from './reflex';
import { dropStack, initStack, MIN_DROP_INTERVAL, stepStack } from './stacker';

const cfg = (id: string) => GAMES.find((g) => g.id === id)!;

describe('Orb Rush', () => {
  it('collects orbs, loses lives on blocks, and ends at zero lives', () => {
    let s = initRush(cfg('orb-rush').config, {});
    s = { ...s, entities: [{ id: 1, lane: s.lane, y: PLAYER_Y, kind: 'orb' }], spawnTimer: 99 };
    let r = stepRush(s, 0.016, makeRng(1));
    expect(r.events).toContain('collect');
    expect(r.state.orbs).toBe(1);
    s = { ...r.state, entities: [{ id: 2, lane: r.state.lane, y: PLAYER_Y, kind: 'block' }] };
    r = stepRush(s, 0.016, makeRng(1));
    expect(r.events).toContain('hit');
    expect(r.state.lives).toBe(2);
    s = { ...r.state, lives: 1, invulnerable: 0, entities: [{ id: 3, lane: r.state.lane, y: PLAYER_Y, kind: 'block' }] };
    r = stepRush(s, 0.016, makeRng(1));
    expect(r.state.over).toBe(true);
  });

  it('extra life perk adds a heart and lanes are clamped', () => {
    const s = initRush(cfg('orb-rush').config, { extra_life: 1 });
    expect(s.lives).toBe(4);
    expect(moveRush(moveRush(moveRush(s, -1), -1), -1).lane).toBe(0);
  });

  it('a perfect bot stays well inside the anti-cheat score rate', () => {
    for (const id of ['orb-rush', 'lava-lanes', 'neon-highway', 'frost-dash']) {
      const g = cfg(id);
      const rng = makeRng(7);
      let s = initRush(g.config, { extra_life: 99 });
      for (let i = 0; i < 60 * 240; i++) {
        // cheat-free "god mode": always stand under the nearest orb
        const orb = s.entities.filter((e) => e.kind === 'orb').sort((a, b) => b.y - a.y)[0];
        if (orb && orb.lane !== s.lane) s = moveRush(s, orb.lane > s.lane ? 1 : -1);
        s = stepRush({ ...s, invulnerable: 99 }, 1 / 60, rng).state;
      }
      const rate = s.score / s.time;
      expect(rate).toBeLessThan(g.maxScorePerSecond);
    }
  });
});

describe('Sky Stack', () => {
  it('slices overhangs, rewards perfect drops and ends on a miss', () => {
    let s = initStack(cfg('sky-stack').config, {});
    const base = s.layers[0];
    // perfect: align exactly
    s = { ...s, moving: { ...s.moving, x: base.x }, sinceDrop: 1 };
    let r = dropStack(s);
    expect(r.events).toContain('perfect');
    expect(r.state.score).toBe(2);
    expect(r.state.layers[1].w).toBeCloseTo(base.w);
    // offset by 0.1: width shrinks
    s = { ...r.state, moving: { ...r.state.moving, x: base.x + 0.1 }, sinceDrop: 1 };
    r = dropStack(s);
    expect(r.events).toContain('place');
    expect(r.state.layers[2].w).toBeCloseTo(base.w - 0.1);
    expect(r.state.shards.length).toBe(1);
    // completely off: game over
    s = { ...r.state, moving: { x: 0.95, w: 0.05 }, layers: [...r.state.layers.slice(0, -1), { x: 0, w: 0.2 }], sinceDrop: 1 };
    r = dropStack(s);
    expect(r.state.over).toBe(true);
  });

  it('ignores drops faster than the minimum interval (anti-spam)', () => {
    const s = { ...initStack(cfg('sky-stack').config, {}), sinceDrop: MIN_DROP_INTERVAL / 2 };
    expect(dropStack(s).state).toBe(s);
    const moved = stepStack(s, 0.2);
    expect(moved.moving.x).not.toBe(s.moving.x);
  });

  it('precision perk widens the perfect window', () => {
    expect(initStack(cfg('sky-stack').config, { precision: 2 }).tolerance).toBeCloseTo(initStack(cfg('sky-stack').config, {}).tolerance * 2);
  });

  it('max possible score rate is within the server bound', () => {
    const g = cfg('sky-stack');
    // 2 points per drop at the minimum interval
    expect(2 / MIN_DROP_INTERVAL).toBeLessThanOrEqual(g.maxScorePerSecond);
  });
});

describe('Block Smash', () => {
  it('scores hits with combos, punishes bombs and ends when time runs out', () => {
    let s = initReflex(cfg('block-smash').config, {});
    s = { ...s, targets: [{ id: 1, cell: 0, kind: 'target', age: 0, life: 9 }, { id: 2, cell: 1, kind: 'target', age: 0, life: 9 }, { id: 3, cell: 2, kind: 'bomb', age: 0, life: 9 }, { id: 4, cell: 3, kind: 'golden', age: 0, life: 9 }] };
    s = tapReflex(s, 0).state;
    s = tapReflex(s, 1).state;
    expect(s.score).toBe(10 + 11);
    expect(s.combo).toBe(2);
    s = tapReflex(s, 3).state;
    expect(s.score).toBe(51);
    const bomb = tapReflex(s, 2);
    expect(bomb.events).toContain('bomb');
    expect(bomb.state.score).toBe(31);
    expect(bomb.state.combo).toBe(0);
    const miss = tapReflex(bomb.state, 15);
    expect(miss.events).toContain('miss');
    let t = { ...miss.state, timeLeft: 0.01 };
    t = stepReflex(t, 0.02, makeRng(3)).state;
    expect(t.over).toBe(true);
  });

  it('time bonus perk extends the round', () => {
    expect(initReflex(cfg('block-smash').config, { time_bonus: 10 }).timeLeft).toBe(40);
  });

  it('a perfect tapper stays inside the server bound', () => {
    const g = cfg('block-smash');
    const rng = makeRng(11);
    let s = initReflex(g.config, {});
    while (!s.over) {
      s = stepReflex(s, 1 / 60, rng).state;
      for (const target of s.targets.filter((x) => x.kind !== 'bomb')) s = tapReflex(s, target.cell).state;
    }
    expect(s.score / s.duration).toBeLessThan(g.maxScorePerSecond);
  });
});

describe('Glyph Match', () => {
  it('matches pairs, combos, and awards a time bonus on clear', () => {
    let s = initGlyph(cfg('glyph-match').config, {}, makeRng(5));
    expect(s.cards).toHaveLength(16);
    const bySymbol = new Map<string, number[]>();
    s.cards.forEach((c, i) => bySymbol.set(c.symbol, [...(bySymbol.get(c.symbol) ?? []), i]));
    const pairs = [...bySymbol.values()];
    // one mismatch first
    let r = flipGlyph(s, pairs[0][0]);
    r = flipGlyph(r.state, pairs[1][0]);
    expect(r.events).toContain('mismatch');
    s = stepGlyph(r.state, 0.05).state;
    for (let i = 0; i < 20; i++) s = stepGlyph(s, 0.05).state;
    expect(s.open).toHaveLength(0);
    for (const [a, b] of pairs) {
      s = flipGlyph(s, a).state;
      r = flipGlyph(s, b);
      s = r.state;
    }
    expect(s.won).toBe(true);
    expect(s.over).toBe(true);
    expect(s.matches).toBe(8);
    expect(s.score).toBeGreaterThan(800 + Math.floor(s.timeLeft) * 10);
  });

  it('hint perk shows the board before play starts', () => {
    const s = initGlyph(cfg('glyph-match').config, { hint: 2 }, makeRng(1));
    expect(s.peek).toBe(2);
    expect(flipGlyph(s, 0).state).toBe(s);
  });

  it('rune boards are 5×4 with unique pairs', () => {
    const s = initGlyph(cfg('rune-recall').config, {}, makeRng(9));
    expect(s.cards).toHaveLength(20);
    expect(new Set(s.cards.map((c) => c.symbol)).size).toBe(10);
  });
});
