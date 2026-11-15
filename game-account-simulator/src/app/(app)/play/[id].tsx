import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import type { GameSession, ScoreResult } from '@/api/types';
import { GlyphView } from '@/games/GlyphView';
import { ReflexView } from '@/games/ReflexView';
import { RushView } from '@/games/RushView';
import { StackView } from '@/games/StackView';
import { invalidateEconomy, patchBalance, useGame } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { GameThumb } from '@/ui/GameThumb';
import { haptic } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, GradientFill, Pill, Row } from '@/ui/primitives';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { GlyphIcon } from '@/ui/Icon';
import { BRAND_GRADIENT, radius, space, useTheme } from '@/ui/theme';

type Phase = 'intro' | 'starting' | 'countdown' | 'playing' | 'paused' | 'submitting' | 'results' | 'submit_failed';

const VIEWS = { orb_rush: RushView, stacker: StackView, reflex: ReflexView, glyph_match: GlyphView } as const;

export default function Play() {
  const t = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useGame(id ?? '');
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<GameSession | null>(null);
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [seed, setSeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const playMs = useRef(0);
  const lastTick = useRef(0);
  const final = useRef<{ score: number; stats: Record<string, unknown> } | null>(null);

  // Track active play time (excludes pauses) for the stats we send.
  useEffect(() => {
    if (phase !== 'playing') return;
    lastTick.current = Date.now();
    const h = setInterval(() => {
      playMs.current += Date.now() - lastTick.current;
      lastTick.current = Date.now();
    }, 250);
    return () => clearInterval(h);
  }, [phase]);

  // Auto-pause when the app goes to the background; hardware back pauses too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && setPhase((p) => (p === 'playing' ? 'paused' : p)));
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'playing') {
        setPhase('paused');
        return true;
      }
      return false;
    });
    return () => {
      sub.remove();
      back.remove();
    };
  }, [phase]);

  const start = async () => {
    setError(null);
    setPhase('starting');
    try {
      const s = await backend.startGameSession(id!);
      setSession(s);
      setScore(0);
      setResult(null);
      final.current = null;
      playMs.current = 0;
      setRunKey((k) => k + 1);
      setSeed(Math.floor(Math.random() * 1_000_000_000) + 1);
      setCount(3);
      setPhase('countdown');
    } catch (e) {
      setError(toAppError(e).message);
      setPhase('intro');
    }
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count <= 0) {
      haptic.medium();
      setPhase('playing');
      return;
    }
    haptic.tap();
    const h = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(h);
  }, [phase, count]);

  const submit = useCallback(async () => {
    if (!session || !final.current) return;
    setPhase('submitting');
    try {
      const r = await backend.submitGameScore(session.session_id, final.current.score, playMs.current, final.current.stats);
      setResult(r);
      patchBalance(qc, r);
      invalidateEconomy(qc);
      qc.invalidateQueries({ queryKey: ['game', id] });
      qc.invalidateQueries({ queryKey: ['leaderboard', id] });
      qc.invalidateQueries({ queryKey: ['discover'] });
      toast.achievements(r.unlocked);
      if (r.is_new_best) haptic.success();
      setPhase('results');
    } catch (e) {
      // Safe to retry: the server treats the session id as idempotent.
      setError(toAppError(e).message);
      setPhase('submit_failed');
    }
  }, [session, qc, id]);

  const onOver = useCallback(
    (s: number, stats: Record<string, unknown>) => {
      final.current = { score: s, stats };
      setScore(s);
      setTimeout(() => submit(), 450);
    },
    [submit],
  );

  if (g.isLoading) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top, padding: space.lg }}><LoadingList rows={3} height={160} /></View>;
  if (g.error || !g.data) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}><ErrorState error={g.error} onRetry={() => g.refetch()} /></View>;
  const game = g.data;
  const View_ = VIEWS[game.engine];
  const perks = session?.perks ?? {};
  const activePerks = game.passes.filter((p) => p.owned);

  if (phase === 'intro' || phase === 'starting') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg, justifyContent: 'space-between' }} testID="play-intro">
        <Row justify="space-between">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={22} />
          </Pressable>
          <Text variant="heading">{game.title}</Text>
          <View style={{ width: 40 }} />
        </Row>
        <View style={{ gap: space.lg, alignItems: 'center' }}>
          <GameThumb thumbnail={game.thumbnail} width={220} height={140} radius={radius.xl} />
          <Text variant="body" tone="muted" align="center">
            {game.tagline}
          </Text>
          <Row gap={space.lg}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="small" tone="faint">
                Your best
              </Text>
              <Text variant="title">{game.my_stats?.best_score.toLocaleString('en-US') ?? '—'}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text variant="small" tone="faint">
                Orbs today
              </Text>
              <Text variant="title">
                {game.orbs_today}/{game.daily_orb_cap}
              </Text>
            </View>
          </Row>
          {activePerks.length ? (
            <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {activePerks.map((p) => (
                <Pill key={p.id} label={p.name} color={t.gold} icon="flash" />
              ))}
            </Row>
          ) : null}
          {error ? (
            <Text variant="caption" tone="danger" align="center">
              {error}
            </Text>
          ) : null}
        </View>
        <Button title="Start" icon="play" size="lg" fullWidth loading={phase === 'starting'} onPress={start} testID="start-run" />
      </View>
    );
  }

  if (phase === 'results' && result) {
    const rejected = result.status === 'rejected';
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 96, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg, justifyContent: 'space-between' }} testID="play-results">
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center', gap: space.md }}>
          {result.is_new_best ? <Pill label="NEW PERSONAL BEST" color={t.gold} icon="trophy" solid /> : <Text variant="label" tone="muted">Run complete</Text>}
          <Text variant="display" style={{ fontSize: 56, lineHeight: 64 }} testID="final-score">
            {(result.score ?? score).toLocaleString('en-US')}
          </Text>
          <Text variant="caption" tone="muted">
            Best {(result.best_score ?? score).toLocaleString('en-US')}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(250)} style={{ gap: space.md }}>
          {rejected ? (
            <Card style={{ backgroundColor: t.dangerSoft }}>
              <Text variant="bodyStrong" tone="danger">
                This score couldn't be verified
              </Text>
              <Text variant="caption" tone="muted">
                The server rejected it as implausible, so no rewards were given.
              </Text>
            </Card>
          ) : (
            <Card style={{ gap: space.md }}>
              <Row justify="space-between">
                <Text variant="bodyStrong">Orbs earned</Text>
                <OrbAmount amount={result.orbs} variant="title" signed />
              </Row>
              {result.orb_multiplier && result.orb_multiplier > 1 ? (
                <Text variant="caption" tone="gold">
                  ×{result.orb_multiplier} from your game pass
                </Text>
              ) : null}
              {result.daily_cap_reached ? (
                <Text variant="caption" tone="warning">
                  Daily Orb cap reached for this game — try another experience!
                </Text>
              ) : null}
              <Row justify="space-between">
                <Text variant="bodyStrong">XP</Text>
                <Text variant="heading" tone="primary">
                  +{result.xp}
                </Text>
              </Row>
              {result.leveled_up ? <Pill label={`Level up! You're now level ${result.level}`} color={t.success} icon="arrow-up-circle" /> : null}
            </Card>
          )}
          {(result.unlocked ?? []).map((a) => (
            <Card key={a.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <GlyphIcon glyph={a.icon} size={22} color={t.gold} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {a.name}
              </Text>
              <OrbAmount amount={a.reward_orbs} variant="caption" signed size={14} />
            </Card>
          ))}
        </Animated.View>
        <View style={{ gap: space.sm }}>
          <Button title="Play again" icon="refresh" size="lg" fullWidth onPress={start} testID="play-again" />
          <Row gap={space.sm}>
            <Button title="Leaderboard" variant="secondary" style={{ flex: 1 }} onPress={() => router.replace(`/game/${game.id}`)} />
            <Button title="Done" variant="secondary" style={{ flex: 1 }} onPress={() => router.back()} testID="play-done" />
          </Row>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }} testID="play-screen">
      <Row justify="space-between" style={{ paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable onPress={() => setPhase('paused')} disabled={phase !== 'playing'} accessibilityRole="button" accessibilityLabel="Pause" testID="pause-button" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pause" size={20} color="#fff" />
        </Pressable>
        <Text variant="heading" color="#fff">
          {game.title}
        </Text>
        <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
          <Text variant="label" color="rgba(255,255,255,0.6)">
            Score
          </Text>
          <Text variant="title" color="#fff" testID="live-score">
            {score.toLocaleString('en-US')}
          </Text>
        </View>
      </Row>
      <View style={{ flex: 1 }}>
        {session ? <View_ key={runKey} config={session.config} perks={perks} running={phase === 'playing'} seed={seed} onScore={setScore} onOver={onOver} /> : null}
        {phase === 'countdown' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <Animated.View key={count} entering={ZoomIn.springify()}>
              <Text variant="display" color="#fff" style={{ fontSize: 96, lineHeight: 110 }}>
                {count > 0 ? count : 'GO!'}
              </Text>
            </Animated.View>
          </View>
        ) : null}
        {phase === 'paused' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,6,15,0.95)', alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }} testID="pause-menu">
            <Text variant="display" color="#fff">
              Paused
            </Text>
            <Button title="Resume" icon="play" size="lg" style={{ width: 240 }} onPress={() => setPhase('playing')} testID="resume" />
            <Button title="Restart" icon="refresh" variant="secondary" style={{ width: 240 }} onPress={start} testID="restart" />
            <Button title="Quit" icon="exit-outline" variant="ghost" style={{ width: 240 }} onPress={() => router.back()} />
            <Text variant="small" color="rgba(255,255,255,0.6)" align="center">
              Quitting ends this run without rewards.
            </Text>
          </View>
        ) : null}
        {phase === 'submitting' || phase === 'submit_failed' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,6,15,0.85)', alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
            <GradientFill colors={BRAND_GRADIENT as unknown as [string, string]} style={{ paddingHorizontal: 22, paddingVertical: 8, borderRadius: 999 }}>
              <Text variant="label" color="#fff">
                Game over
              </Text>
            </GradientFill>
            <Text variant="display" color="#fff">
              {score.toLocaleString('en-US')}
            </Text>
            {phase === 'submitting' ? (
              <Text variant="caption" color="rgba(255,255,255,0.7)">
                Verifying score…
              </Text>
            ) : (
              <>
                <Text variant="caption" tone="danger" align="center">
                  {error}
                </Text>
                <Button title="Retry submit" icon="cloud-upload" onPress={submit} testID="retry-submit" />
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
