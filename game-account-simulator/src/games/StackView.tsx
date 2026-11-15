import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/Text';

import { dropStack, initStack, type StackState, stepStack } from './engines/stacker';
import { type EngineViewProps, feedback, useGameLoop } from './useGameLoop';

const LAYER_H = 26;

export function StackView({ config, perks, running, onScore, onOver }: EngineViewProps) {
  const state = useRef<StackState>(initStack(config, perks));
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [flash, setFlash] = useState<{ text: string; at: number } | null>(null);
  const ended = useRef(false);
  const camera = useRef(0);

  useGameLoop(running || state.current.over, (dt) => {
    state.current = stepStack(state.current, dt);
    const target = Math.max(0, state.current.layers.length * LAYER_H - size.h * 0.55);
    camera.current += (target - camera.current) * Math.min(1, dt * 6);
    setFrame((f) => (f + 1) % 1_000_000);
  });

  const drop = () => {
    if (!running) return;
    const r = dropStack(state.current);
    if (r.state === state.current) return;
    state.current = r.state;
    feedback(r.events);
    onScore(r.state.score);
    if (r.events.includes('perfect')) setFlash({ text: r.state.perfectStreak >= 3 ? `PERFECT ×${r.state.perfectStreak}` : 'PERFECT!', at: Date.now() });
    if (r.state.over && !ended.current) {
      ended.current = true;
      onOver(r.state.score, { height: r.state.layers.length - 1, perfects: r.state.perfects, time: Math.round(r.state.time) });
    }
  };

  const s = state.current;
  const blockColor = (i: number) => (i % 2 ? config.blockAlt ?? '#F59E0B' : config.block ?? '#FDE68A');
  const yFor = (i: number) => size.h - 40 - (i + 1) * LAYER_H + camera.current;
  const showFlash = flash && Date.now() - flash.at < 700;

  return (
    <Pressable style={{ flex: 1 }} onPress={drop} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} testID="stack-area" accessibilityRole="button" accessibilityLabel="Tap to drop the block">
      <LinearGradient colors={[config.from ?? '#38BDF8', config.to ?? '#1E3A8A']} style={StyleSheet.absoluteFill} />
      {size.w > 0 ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: size.h - 40 + camera.current, height: 400, backgroundColor: 'rgba(0,0,0,0.25)' }} />
          {s.layers.map((l, i) => {
            const y = yFor(i);
            if (y < -LAYER_H || y > size.h) return null;
            return <View key={i} style={{ position: 'absolute', left: l.x * size.w, top: y, width: l.w * size.w, height: LAYER_H - 2, borderRadius: 5, backgroundColor: blockColor(i), borderBottomWidth: 4, borderColor: 'rgba(0,0,0,0.18)' }} />;
          })}
          {s.shards.map((sh, i) => (
            <View key={`sh${i}`} style={{ position: 'absolute', left: sh.x * size.w, top: yFor(sh.y) + sh.vy * sh.age * 120, width: sh.w * size.w, height: LAYER_H - 2, borderRadius: 5, backgroundColor: blockColor(sh.y), opacity: Math.max(0, 1 - sh.age / 1.2), transform: [{ rotate: `${sh.age * (i % 2 ? 40 : -40)}deg` }] }} />
          ))}
          {!s.over ? <View style={{ position: 'absolute', left: s.moving.x * size.w, top: yFor(s.layers.length), width: s.moving.w * size.w, height: LAYER_H - 2, borderRadius: 5, backgroundColor: blockColor(s.layers.length), borderBottomWidth: 4, borderColor: 'rgba(0,0,0,0.18)' }} /> : null}
        </>
      ) : null}
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <Text variant="small" color="rgba(255,255,255,0.85)">
          Height {s.layers.length - 1} · {s.perfects} perfect
        </Text>
      </View>
      {showFlash ? (
        <View style={{ position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <Text variant="title" color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8 }}>
            {flash!.text}
          </Text>
        </View>
      ) : null}
      {s.layers.length <= 2 && running ? (
        <View style={{ position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <Text variant="bodyStrong" color="rgba(255,255,255,0.9)">
            Tap anywhere to drop the block
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
