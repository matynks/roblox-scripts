import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/Text';

import { makeRng } from './engines/common';
import { flipGlyph, type GlyphState, initGlyph, stepGlyph } from './engines/glyphMatch';
import { type EngineViewProps, feedback, useGameLoop } from './useGameLoop';

export function GlyphView({ config, perks, running, seed, onScore, onOver }: EngineViewProps) {
  const initial = useMemo(() => initGlyph(config, perks, makeRng(seed)), [config, perks, seed]);
  const state = useRef<GlyphState>(initial);
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ended = useRef(false);

  const finish = (s: GlyphState) => {
    if (s.over && !ended.current) {
      ended.current = true;
      onOver(s.score, { moves: s.moves, matches: s.matches, won: s.won, best_combo: s.bestCombo, time_left: Math.floor(s.timeLeft) });
    }
  };

  useGameLoop(running, (dt) => {
    const r = stepGlyph(state.current, dt);
    state.current = r.state;
    feedback(r.events);
    finish(r.state);
    setFrame((f) => (f + 1) % 1_000_000);
  });

  const flip = (i: number) => {
    if (!running) return;
    const r = flipGlyph(state.current, i);
    if (r.state === state.current) return;
    state.current = r.state;
    feedback(r.events);
    onScore(r.state.score);
    finish(r.state);
    setFrame((f) => (f + 1) % 1_000_000);
  };

  const s = state.current;
  const gap = 8;
  const cardW = Math.min((size.w - 24 - gap * (s.cols - 1)) / s.cols, (size.h - 110 - gap * (s.rows - 1)) / s.rows / 1.2);
  const showAll = s.peek > 0;
  return (
    <View style={{ flex: 1, backgroundColor: config.bg ?? '#1C1917', alignItems: 'center' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} testID="glyph-area">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 16 }}>
        <Text variant="bodyStrong" color={s.timeLeft < 10 ? '#EF4444' : '#fff'}>
          ⏱ {Math.ceil(s.timeLeft)}s
        </Text>
        <Text variant="bodyStrong" color="#fff">
          {s.matches}/{s.cards.length / 2} pairs
        </Text>
        <Text variant="bodyStrong" color={s.combo >= 2 ? '#FFC53D' : 'rgba(255,255,255,0.7)'}>
          Combo ×{s.combo}
        </Text>
      </View>
      {showAll ? (
        <Text variant="caption" color="#FFC53D" style={{ marginTop: 6 }}>
          Sneak peek! Memorize the board…
        </Text>
      ) : null}
      {cardW > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: cardW * s.cols + gap * (s.cols - 1), marginTop: 18 }}>
          {s.cards.map((c, i) => {
            const faceUp = showAll || c.state !== 'hidden';
            return (
              <Pressable key={c.id} onPress={() => flip(i)} testID={`card-${i}`} accessibilityRole="button" accessibilityLabel={faceUp ? `${c.symbol} card${c.state === 'matched' ? ', matched' : ''}` : `Hidden card ${i + 1}`} style={{ width: cardW, height: cardW * 1.2 }}>
                <View style={{ flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: faceUp ? config.face ?? '#FFFBEB' : config.card ?? '#F59E0B', borderBottomWidth: 5, borderColor: 'rgba(0,0,0,0.22)', opacity: c.state === 'matched' ? 0.55 : 1, transform: [{ scale: c.state === 'up' ? 1.04 : 1 }] }}>
                  {faceUp ? (
                    <Ionicons name={c.symbol as any} size={cardW * 0.48} color={config.accent ?? '#B45309'} />
                  ) : (
                    <View style={{ width: cardW * 0.42, height: cardW * 0.42, borderRadius: 8, borderWidth: 3, borderColor: 'rgba(255,255,255,0.45)', transform: [{ rotate: '45deg' }] }} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text variant="small" color="rgba(255,255,255,0.6)" style={{ marginTop: 14 }}>
        {s.moves} moves · clear the board for a time bonus
      </Text>
    </View>
  );
}
