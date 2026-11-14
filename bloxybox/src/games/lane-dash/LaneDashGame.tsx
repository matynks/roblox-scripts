import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { formatNumber } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme/tokens';

import type { GameProps } from '../types';
import { dashScore, DASH, detectCollisions, generateTrack, speedAt, visibleWindow, type Entity } from './logic';

const VISIBLE_METRES = 48;
const BUCKET = 8;

const Barrier = memo(function Barrier({ left, top, width, height }: { left: number; top: number; width: number; height: number }) {
  return (
    <View style={[styles.barrier, { left, top, width, height }]}>
      <View style={styles.barrierStripe} />
    </View>
  );
});

const Coin = memo(function Coin({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <View style={[styles.coin, { left, top, width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.coinInner, { borderRadius: size / 2 }]} />
    </View>
  );
});

export function LaneDashGame({ seed, perks, paused, reduceMotion, onScore, onFinish }: GameProps) {
  const track = useMemo(() => generateTrack(seed), [seed]);
  const magnet = perks.includes('coin_magnet');
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [bucket, setBucket] = useState(0);
  const [gone, setGone] = useState<ReadonlySet<number>>(() => new Set());
  const [shieldLeft, setShieldLeft] = useState(perks.includes('extra_life') ? 1 : 0);
  const [progress, setProgress] = useState(0);

  const coinsRef = useRef(0);
  const distanceRef = useRef(0);
  const finished = useRef(false);

  const entities = useSharedValue<Entity[]>(track);
  const distance = useSharedValue(0);
  const laneTarget = useSharedValue(1);
  const laneX = useSharedValue(1);
  const consumed = useSharedValue<number[]>([]);
  const shield = useSharedValue(perks.includes('extra_life') ? 1 : 0);
  const running = useSharedValue(false);
  const lastReport = useSharedValue(0);
  const swiped = useSharedValue(false);
  const areaWidth = useSharedValue(0);
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);

  const laneWidth = area.width / DASH.lanes;
  const ppm = area.height / VISIBLE_METRES;
  const playerY = area.height * 0.8;

  useEffect(() => {
    entities.set(track);
  }, [entities, track]);

  useEffect(() => {
    running.set(!paused && !finished.current && area.width > 0);
  }, [paused, area.width, running]);

  const end = useCallback(
    (outcome: 'win' | 'loss', at: number) => {
      if (finished.current) return;
      finished.current = true;
      const score = dashScore(at, coinsRef.current);
      onScore(score);
      setTimeout(
        () =>
          onFinish({
            score,
            outcome,
            summary:
              outcome === 'win'
                ? `Finished ${formatNumber(DASH.finish)} m with ${coinsRef.current} coins`
                : `Crashed at ${Math.floor(at)} m · ${coinsRef.current} coins`,
          }),
        outcome === 'loss' ? 600 : 300,
      );
    },
    [onFinish, onScore],
  );

  const onProgress = useCallback(
    (d: number) => {
      distanceRef.current = d;
      setProgress(Math.min(1, d / DASH.finish));
      const nextBucket = Math.floor(d / BUCKET);
      setBucket((b) => (b === nextBucket ? b : nextBucket));
      onScore(dashScore(d, coinsRef.current));
    },
    [onScore],
  );

  const onCoins = useCallback(
    (ids: number[]) => {
      coinsRef.current += ids.length;
      haptics.tap();
      setGone((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      onScore(dashScore(distanceRef.current, coinsRef.current));
    },
    [onScore],
  );

  const onShield = useCallback((id: number) => {
    haptics.heavy();
    setShieldLeft(0);
    setGone((prev) => new Set(prev).add(id));
  }, []);

  const onCrash = useCallback(
    (d: number) => {
      haptics.error();
      end('loss', d);
    },
    [end],
  );

  const onFinishLine = useCallback(
    (d: number) => {
      haptics.success();
      end('win', d);
    },
    [end],
  );

  useFrameCallback((frame) => {
    'worklet';
    if (!running.get()) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const prev = distance.get();
    const next = prev + speedAt(prev) * dt;
    distance.set(next);

    const result = detectCollisions(entities.get(), prev, next, laneX.get(), magnet, consumed.get());
    if (result.coinIds.length > 0) {
      consumed.set(consumed.get().concat(result.coinIds));
      scheduleOnRN(onCoins, result.coinIds);
    }
    if (result.hitId !== -1) {
      if (shield.get() > 0) {
        shield.set(0);
        consumed.set(consumed.get().concat([result.hitId]));
        flash.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 400 })));
        scheduleOnRN(onShield, result.hitId);
      } else {
        running.set(false);
        flash.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0.35, { duration: 500 })));
        if (!reduceMotion) {
          shake.set(withSequence(withTiming(10, { duration: 50 }), withTiming(-10, { duration: 60 }), withTiming(0, { duration: 60 })));
        }
        scheduleOnRN(onCrash, next);
        return;
      }
    }
    if (next >= DASH.finish) {
      running.set(false);
      scheduleOnRN(onFinishLine, next);
      return;
    }
    if (frame.timestamp - lastReport.get() > 100) {
      lastReport.set(frame.timestamp);
      scheduleOnRN(onProgress, next);
    }
  });

  const moveLane = (direction: number) => {
    'worklet';
    const target = Math.max(0, Math.min(DASH.lanes - 1, laneTarget.get() + direction));
    if (target === laneTarget.get()) return;
    laneTarget.set(target);
    laneX.set(withTiming(target, { duration: 110 }));
  };

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(14)
      .onBegin(() => {
        'worklet';
        swiped.set(false);
      })
      .onUpdate((e) => {
        'worklet';
        if (swiped.get() || !running.get()) return;
        if (Math.abs(e.translationX) > 28 && Math.abs(e.translationX) > Math.abs(e.translationY)) {
          swiped.set(true);
          moveLane(e.translationX > 0 ? 1 : -1);
        }
      });
    const tap = Gesture.Tap().onEnd((e, success) => {
      'worklet';
      if (!success || !running.get()) return;
      moveLane(e.x < areaWidth.get() / 2 ? -1 : 1);
    });
    return Gesture.Race(pan, tap);
    // moveLane only touches shared values, which are stable.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: distance.get() * ppm }, { translateX: shake.get() }],
  }));
  const playerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: laneX.get() * laneWidth + laneWidth / 2 }, { translateX: shake.get() }],
  }));
  const dashStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ((distance.get() * ppm) % 48) - 48 }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() * 0.45 }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    areaWidth.set(width);
    setArea({ width, height });
  };

  const windowEntities = useMemo(() => {
    if (!area.height) return [];
    const at = bucket * BUCKET;
    return visibleWindow(track, at, 8, VISIBLE_METRES + BUCKET * 2).filter((e) => !gone.has(e.id));
  }, [track, bucket, gone, area.height]);

  const barrierW = laneWidth * 0.74;
  const barrierH = Math.max(18, DASH.barrierHalfLength * 2 * ppm);
  const coinSize = Math.min(26, laneWidth * 0.32);
  const playerSize = Math.min(44, laneWidth * 0.5);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.area} onLayout={onLayout} accessible accessibilityLabel="Lane Dash track. Swipe or tap left and right to change lanes.">
        {area.width > 0 ? (
          <>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {[1, 2].map((i) => (
                <Animated.View key={i} style={[styles.laneLine, { left: laneWidth * i - 1, height: area.height + 48 }, dashStyle]}>
                  {Array.from({ length: Math.ceil(area.height / 48) + 2 }, (_, j) => (
                    <View key={j} style={styles.dash} />
                  ))}
                </Animated.View>
              ))}
            </View>
            <Animated.View style={[styles.world, { top: playerY }, worldStyle]} pointerEvents="none">
              {windowEntities.map((e) =>
                e.kind === 'barrier' ? (
                  <Barrier
                    key={e.id}
                    left={e.lane * laneWidth + (laneWidth - barrierW) / 2}
                    top={-e.d * ppm - barrierH / 2}
                    width={barrierW}
                    height={barrierH}
                  />
                ) : (
                  <Coin key={e.id} left={e.lane * laneWidth + (laneWidth - coinSize) / 2} top={-e.d * ppm - coinSize / 2} size={coinSize} />
                ),
              )}
              <View style={[styles.finish, { top: -DASH.finish * ppm - 6, width: area.width }]}>
                <AppText variant="micro" color={colors.background} uppercase>
                  Finish
                </AppText>
              </View>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.player,
                { top: playerY - playerSize / 2, width: playerSize, height: playerSize, marginLeft: -playerSize / 2, borderRadius: playerSize * 0.28 },
                shieldLeft > 0 ? styles.shielded : null,
                playerStyle,
              ]}
            >
              <View style={styles.eyes}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
            <View style={styles.progressWrap} pointerEvents="none">
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <AppText variant="micro" color={colors.textSecondary}>
                {Math.floor(progress * DASH.finish)} / {DASH.finish} m{shieldLeft > 0 ? ' · Shield ready' : ''}
              </AppText>
            </View>
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, overflow: 'hidden', backgroundColor: '#070912' },
  laneLine: { position: 'absolute', top: 0, width: 2, alignItems: 'center' },
  dash: { width: 2, height: 24, marginBottom: 24, backgroundColor: 'rgba(51, 214, 255, 0.28)' },
  world: { position: 'absolute', left: 0, right: 0, height: 0 },
  barrier: {
    position: 'absolute',
    borderRadius: radii.xs,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: '#FF9AAB',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  barrierStripe: { height: 4, backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 6, borderRadius: 2 },
  coin: { position: 'absolute', backgroundColor: colors.coinDeep, padding: 3 },
  coinInner: { flex: 1, backgroundColor: colors.coin },
  finish: { position: 'absolute', left: 0, height: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  player: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#33D6FF',
    borderWidth: 2,
    borderColor: '#BDF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shielded: { borderColor: colors.coin, borderWidth: 3 },
  eyes: { flexDirection: 'row', gap: 6, marginTop: -4 },
  eye: { width: 5, height: 8, borderRadius: 3, backgroundColor: '#0B0C14' },
  flash: { backgroundColor: colors.danger },
  progressWrap: { position: 'absolute', top: spacing.sm, left: spacing.lg, right: spacing.lg, gap: 4, alignItems: 'center' },
  progressTrack: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#33D6FF' },
});
