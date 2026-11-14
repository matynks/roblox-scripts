import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { haptics } from '@/lib/haptics';
import { colors, radii } from '@/theme/tokens';

import type { GameProps } from '../types';
import {
  createStack,
  floorColor,
  placeBlock,
  spawnMover,
  speedFor,
  stackScore,
  STACK,
  stepMover,
  type StackState,
} from './logic';

type Debris = { id: number; x: number; width: number; level: number; dir: number };

function DebrisPiece({ piece, unit, blockH, onDone }: { piece: Debris; unit: number; blockH: number; onDone: (id: number) => void }) {
  const fall = useSharedValue(0);
  useEffect(() => {
    fall.set(withTiming(1, { duration: 700, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(() => onDone(piece.id), 720);
    return () => clearTimeout(timer);
  }, [fall, onDone, piece.id]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - fall.get() * 0.9,
    transform: [
      { translateY: fall.get() * 420 },
      { translateX: fall.get() * 40 * piece.dir },
      { rotate: `${fall.get() * 50 * piece.dir}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.block,
        {
          left: piece.x * unit,
          width: Math.max(2, piece.width * unit),
          bottom: piece.level * blockH,
          height: blockH,
          backgroundColor: floorColor(piece.level),
        },
        style,
      ]}
    />
  );
}

export function BoxStackGame({ perks, paused, reduceMotion, onScore, onFinish }: GameProps) {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [state, setState] = useState<StackState>(() => createStack(perks));
  const [debris, setDebris] = useState<Debris[]>([]);
  const [perfectCount, setPerfectCount] = useState(0);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const finished = useRef(false);
  const slow = perks.includes('slow_motion');

  const initialMover = useMemo(() => spawnMover(state), []); // eslint-disable-line react-hooks/exhaustive-deps
  const moverX = useSharedValue(initialMover.x);
  const moverDir = useSharedValue<number>(initialMover.dir);
  const moverW = useSharedValue(initialMover.width);
  const speed = useSharedValue(speedFor(0, slow));
  const running = useSharedValue(false);
  const camera = useSharedValue(0);
  const shake = useSharedValue(0);

  const unit = area.width / STACK.worldWidth;
  const blockH = Math.max(22, Math.min(34, area.width * 0.075));

  useEffect(() => {
    pausedRef.current = paused;
    running.set(!paused && state.status === 'playing' && area.width > 0);
  }, [paused, state.status, area.width, running]);

  // Keep the active floor about a third of the way down the play area.
  useEffect(() => {
    if (!area.height) return;
    const target = Math.max(0, (state.blocks.length + 1) * blockH - area.height * 0.62);
    camera.set(withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [state.blocks.length, blockH, area.height, camera]);

  useFrameCallback((frame) => {
    'worklet';
    if (!running.get()) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const next = stepMover(moverX.get(), moverDir.get(), moverW.get(), speed.get(), dt);
    moverX.set(next.x);
    moverDir.set(next.dir);
  });

  const finish = useCallback(
    (final: StackState) => {
      if (finished.current) return;
      finished.current = true;
      const won = final.status === 'won';
      onFinish({
        score: stackScore(final),
        outcome: won ? 'win' : 'loss',
        summary: won
          ? `Tower complete: ${final.floors} floors with ${final.perfects} perfect drops`
          : `Missed on floor ${final.floors + 1} · ${final.perfects} perfect drops`,
      });
    },
    [onFinish],
  );

  const place = useCallback(
    (x: number, width: number) => {
      const current = stateRef.current;
      if (current.status !== 'playing') return;
      const { state: next, result } = placeBlock(current, x, width);
      stateRef.current = next;
      setState(next);

      if (result.kind !== 'perfect') {
        setDebris((list) => [
          ...list.slice(-4),
          {
            id: Date.now() + Math.random(),
            x: result.debris.x,
            width: result.debris.width,
            level: current.blocks.length,
            dir: result.debris.x > (current.blocks[current.blocks.length - 1]?.x ?? 0) ? 1 : -1,
          },
        ]);
      }

      if (result.kind === 'perfect') {
        haptics.medium();
        setPerfectCount(next.streak);
      } else if (result.kind === 'trim') {
        haptics.light();
        setPerfectCount(0);
      } else {
        haptics.error();
        if (!reduceMotion) {
          shake.set(withSequence(withTiming(8, { duration: 50 }), withTiming(-8, { duration: 60 }), withTiming(0, { duration: 60 })));
        }
      }

      onScore(stackScore(next));

      if (next.status === 'playing') {
        const mover = spawnMover(next);
        moverX.set(mover.x);
        moverDir.set(mover.dir);
        moverW.set(mover.width);
        speed.set(speedFor(next.floors, slow));
        running.set(!pausedRef.current);
      } else {
        // Let the last drop/fall play out before showing results.
        setTimeout(() => finish(next), next.status === 'lost' ? 650 : 400);
      }
    },
    [finish, moverDir, moverW, moverX, onScore, reduceMotion, running, shake, slow, speed],
  );

  // The callback runs on the UI thread when the player touches the screen, never
  // during render; `place` reads refs only when invoked from that touch.
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(60_000)
        // eslint-disable-next-line react-hooks/refs
        .onBegin(() => {
          'worklet';
          if (!running.get()) return;
          running.set(false);
          scheduleOnRN(place, moverX.get(), moverW.get());
        }),
    [moverW, moverX, place, running],
  );

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: camera.get() }, { translateX: shake.get() }],
  }));
  const moverStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: moverX.get() * unit }],
    width: moverW.get() * unit,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  // Only render floors that can be on screen.
  const maxVisible = area.height ? Math.ceil(area.height / blockH) + 3 : 0;
  const visible = state.blocks.slice(Math.max(0, state.blocks.length - maxVisible));
  const removeDebris = useCallback((id: number) => setDebris((list) => list.filter((d) => d.id !== id)), []);

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.area} onLayout={onLayout} accessible accessibilityLabel="Box Stack play area. Tap to drop the box.">
        <View style={styles.backdrop}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 15}%` }]} />
          ))}
        </View>
        {area.width > 0 ? (
          <Animated.View style={[styles.world, worldStyle]}>
            {visible.map((block) => (
              <View
                key={block.id}
                style={[
                  styles.block,
                  {
                    left: block.x * unit,
                    width: block.width * unit,
                    bottom: block.id * blockH,
                    height: blockH,
                    backgroundColor: block.id === 0 ? colors.surfaceHigh : floorColor(block.id),
                  },
                  block.perfect ? styles.perfectBlock : null,
                ]}
              />
            ))}
            {state.status === 'playing' ? (
              <Animated.View
                style={[
                  styles.block,
                  styles.mover,
                  { left: 0, bottom: state.blocks.length * blockH, height: blockH, backgroundColor: floorColor(state.blocks.length) },
                  moverStyle,
                ]}
              />
            ) : null}
            {debris.map((piece) => (
              <DebrisPiece key={piece.id} piece={piece} unit={unit} blockH={blockH} onDone={removeDebris} />
            ))}
          </Animated.View>
        ) : null}
        {perfectCount > 0 ? (
          <Animated.View key={`perfect-${state.floors}`} entering={FadeIn.duration(120)} exiting={FadeOut.duration(300)} style={styles.perfect} pointerEvents="none">
            <AppText variant="heading" color={colors.coin}>
              Perfect{perfectCount > 1 ? ` ×${perfectCount}` : ''}
            </AppText>
          </Animated.View>
        ) : null}
        {state.floors === 0 && state.status === 'playing' ? (
          <View style={styles.hint} pointerEvents="none">
            <AppText variant="caption" color={colors.textSecondary}>
              Tap anywhere to drop the box
            </AppText>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, overflow: 'hidden', backgroundColor: colors.backgroundDeep },
  backdrop: { ...StyleSheet.absoluteFill },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceHigh },
  world: { position: 'absolute', left: 0, right: 0, bottom: 24, top: 0 },
  block: {
    position: 'absolute',
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  mover: { borderColor: 'rgba(255,255,255,0.55)' },
  perfectBlock: { borderColor: colors.coin, borderWidth: 2 },
  perfect: { position: 'absolute', top: '18%', alignSelf: 'center' },
  hint: { position: 'absolute', bottom: 120, alignSelf: 'center' },
});
