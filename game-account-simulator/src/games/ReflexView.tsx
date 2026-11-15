import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

import { makeRng } from './engines/common';
import { initReflex, type ReflexState, stepReflex, tapReflex } from './engines/reflex';
import { type EngineViewProps, feedback, useGameLoop } from './useGameLoop';

export function ReflexView({ config, perks, running, seed, onScore, onOver }: EngineViewProps) {
  const rng = useMemo(() => makeRng(seed), [seed]);
  const state = useRef<ReflexState>(initReflex(config, perks));
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ended = useRef(false);

  useGameLoop(running, (dt) => {
    const r = stepReflex(state.current, dt, rng);
    state.current = r.state;
    feedback(r.events);
    if (r.state.over && !ended.current) {
      ended.current = true;
      onOver(r.state.score, { hits: r.state.hits, misses: r.state.misses, best_combo: r.state.bestCombo });
    }
    setFrame((f) => (f + 1) % 1_000_000);
  });

  const tap = (cell: number) => {
    if (!running) return;
    const r = tapReflex(state.current, cell);
    state.current = r.state;
    feedback(r.events);
    onScore(r.state.score);
  };

  const s = state.current;
  const n = s.grid;
  const board = Math.min(size.w - 24, size.h - 90);
  const cell = board / n;
  const bg = config.bg ?? '#0F172A';
  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} testID="reflex-area">
      <View style={{ width: '90%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 16, overflow: 'hidden' }} accessibilityLabel={`${Math.ceil(s.timeLeft)} seconds left`}>
        <View style={{ width: `${(s.timeLeft / s.duration) * 100}%`, height: 8, backgroundColor: s.timeLeft < 5 ? '#EF4444' : config.target ?? '#22D3EE' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 6 }}>
        <Text variant="small" color="rgba(255,255,255,0.7)">
          {Math.ceil(s.timeLeft)}s
        </Text>
        <Text variant="small" color={s.combo >= 5 ? '#FFC53D' : 'rgba(255,255,255,0.7)'}>
          Combo ×{s.combo}
        </Text>
      </View>
      {board > 0 ? (
        <View style={{ width: board, height: board, marginTop: 20, flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: n * n }, (_, i) => {
            const target = s.targets.find((t) => t.cell === i);
            const pop = s.pops.filter((p) => p.cell === i).slice(-1)[0];
            const grow = target ? Math.min(1, target.age / 0.12) * (target.age > target.life - 0.15 ? Math.max(0.2, (target.life - target.age) / 0.15) : 1) : 0;
            const color = target?.kind === 'golden' ? config.golden ?? '#FFC53D' : target?.kind === 'bomb' ? config.bomb ?? '#EF4444' : config.target ?? '#22D3EE';
            return (
              <Pressable key={i} onPressIn={() => tap(i)} testID={`cell-${i}`} accessibilityRole="button" accessibilityLabel={target ? `${target.kind} in cell ${i + 1}` : `Empty cell ${i + 1}`} style={{ width: cell, height: cell, padding: 5 }}>
                <View style={{ flex: 1, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                  {target ? (
                    <View style={{ width: `${grow * 86}%`, height: `${grow * 86}%`, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderColor: 'rgba(0,0,0,0.25)' }}>
                      {target.kind === 'bomb' ? <Icon name="skull" size={cell * 0.34} color="#fff" /> : target.kind === 'golden' ? <Icon name="star" size={cell * 0.34} color="#7A4A00" /> : <Icon name="cube" size={cell * 0.3} color="rgba(0,0,0,0.35)" />}
                    </View>
                  ) : null}
                  {pop && pop.age < 0.5 ? (
                    <Text variant="heading" color={pop.points < 0 ? '#EF4444' : pop.kind === 'golden' ? '#FFC53D' : '#fff'} style={{ position: 'absolute', top: cell * 0.2 - pop.age * 40, opacity: 1 - pop.age * 2 }}>
                      {pop.kind === 'miss' ? '✕' : pop.points > 0 ? `+${pop.points}` : pop.points}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 18 }}>
        <Legend color={config.target ?? '#22D3EE'} label="+10" />
        <Legend color={config.golden ?? '#FFC53D'} label="+30" />
        <Legend color={config.bomb ?? '#EF4444'} label="−20" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color }} />
      <Text variant="small" color="rgba(255,255,255,0.7)">
        {label}
      </Text>
    </View>
  );
}
