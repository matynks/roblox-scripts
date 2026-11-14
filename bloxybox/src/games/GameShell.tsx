import Ionicons from '@expo/vector-icons/Ionicons';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@/api/errors';
import type { Experience, GameResult, Perk } from '@/api/types';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { REJECTION_MESSAGES, startGameSession, submitGameResult } from '@/features/games/api';
import { getPracticeBest, recordPracticeRun } from '@/features/games/practiceStore';
import { useGamePasses, usePassOwnership } from '@/features/passes/api';
import { formatNumber } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { usePreferences } from '@/stores/preferences';
import { toast } from '@/stores/toast';
import { colors, radii, spacing } from '@/theme/tokens';

import { newSeed } from './rng';
import type { GameDefinition, GameFinish } from './types';

type Mode = 'ranked' | 'practice';
type Phase = 'intro' | 'starting' | 'countdown' | 'playing' | 'paused' | 'submitting' | 'result';

type Outcome =
  | { mode: 'ranked'; finish: GameFinish; result: GameResult | null; error: string | null }
  | { mode: 'practice'; finish: GameFinish; best: number };

export function GameShell({ game, experience }: { game: GameDefinition; experience: Experience }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const reduceMotion = usePreferences((s) => s.reduceMotion);
  const passes = useGamePasses();
  const ownership = usePassOwnership();

  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<Mode>('ranked');
  const [perks, setPerks] = useState<Perk[]>([]);
  const [runId, setRunId] = useState(0);
  const [seed, setSeed] = useState(newSeed);
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(3);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const sessionRef = useRef<string | null>(null);
  const scoreRef = useRef(0);
  const startedAt = useRef(0);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const GameComponent = game.component;

  // Perks the player owns and has enabled (used for practice mode; ranked runs use the server's list).
  const ownedPerks = useMemo(() => {
    const list = (passes.data ?? []).filter((p) => p.experience_id === experience.id && ownership.data?.get(p.id)?.enabled);
    return list.map((p) => p.perk);
  }, [passes.data, ownership.data, experience.id]);

  const beginRun = useCallback(async () => {
    setStartError(null);
    setScore(0);
    scoreRef.current = 0;
    setOutcome(null);
    setSeed(newSeed());
    setRunId((n) => n + 1);

    if (!onlineManager.isOnline()) {
      sessionRef.current = null;
      setMode('practice');
      setPerks(ownedPerks);
      setCount(3);
      setPhase('countdown');
      return;
    }

    setPhase('starting');
    try {
      const session = await startGameSession(experience.slug);
      sessionRef.current = session.session_id;
      setMode('ranked');
      setPerks(session.perks ?? []);
      setCount(3);
      setPhase('countdown');
    } catch (e) {
      const appError = toAppError(e);
      if (appError.code === 'NETWORK') {
        sessionRef.current = null;
        setMode('practice');
        setPerks(ownedPerks);
        toast.info('Practice mode', "Couldn't reach the server, so this run won't earn BoxCoins.");
        setCount(3);
        setPhase('countdown');
      } else {
        setStartError(appError.message);
        setPhase('intro');
      }
    }
  }, [experience.slug, ownedPerks]);

  // 3-2-1 countdown; the run starts when the last tick elapses.
  useEffect(() => {
    if (phase !== 'countdown') return;
    haptics.tap();
    const timer = setTimeout(() => {
      if (count <= 1) {
        startedAt.current = Date.now();
        setPhase('playing');
      } else {
        setCount(count - 1);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [phase, count]);

  // Pause when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && phaseRef.current === 'playing') setPhase('paused');
    });
    return () => sub.remove();
  }, []);

  // Android back button: pause during a run instead of leaving.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (phaseRef.current === 'playing') {
          setPhase('paused');
          return true;
        }
        if (phaseRef.current === 'paused' || phaseRef.current === 'countdown' || phaseRef.current === 'submitting' || phaseRef.current === 'starting') {
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  const submit = useCallback(
    async (finish: GameFinish) => {
      const sessionId = sessionRef.current;
      if (!sessionId) return;
      setPhase('submitting');
      try {
        const result = await submitGameResult(client, {
          sessionId,
          slug: experience.slug,
          score: finish.score,
          outcome: finish.outcome,
          durationMs: Date.now() - startedAt.current,
        });
        sessionRef.current = null;
        if (result.accepted && result.reward > 0) haptics.success();
        setOutcome({ mode: 'ranked', finish, result, error: null });
      } catch (e) {
        // The session stays open on the server until it expires, so the player can retry.
        setOutcome({ mode: 'ranked', finish, result: null, error: toAppError(e).message });
      }
      setPhase('result');
    },
    [client, experience.slug],
  );

  const onFinish = useCallback(
    async (finish: GameFinish) => {
      if (mode === 'ranked') {
        await submit(finish);
      } else {
        setPhase('submitting');
        const best = await recordPracticeRun(experience.slug, finish.score);
        setOutcome({ mode: 'practice', finish, best });
        setPhase('result');
      }
    },
    [experience.slug, mode, submit],
  );

  const onScore = useCallback((value: number) => {
    scoreRef.current = value;
    setScore(value);
  }, []);

  const quitRun = () => {
    void onFinish({ score: scoreRef.current, outcome: 'loss', summary: 'Run ended early' });
  };

  const restartRun = async () => {
    if (mode === 'ranked' && sessionRef.current) {
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      // Close the current run as a loss so its progress still counts.
      submitGameResult(client, {
        sessionId,
        slug: experience.slug,
        score: scoreRef.current,
        outcome: 'loss',
        durationMs: Date.now() - startedAt.current,
      })
        .then((r) => {
          if (r.accepted && r.reward > 0) toast.coin(`+${r.reward} BoxCoins`, 'From your previous run');
        })
        .catch(() => undefined);
    }
    await beginRun();
  };

  const [practiceBest, setPracticeBest] = useState(0);
  useEffect(() => {
    void getPracticeBest(experience.slug).then(setPracticeBest);
  }, [experience.slug, outcome]);

  const showGame = phase === 'countdown' || phase === 'playing' || phase === 'paused' || phase === 'submitting' || phase === 'result';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HUD */}
      <View style={styles.hud}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'playing' ? 'Pause' : 'Close'}
          onPress={() => {
            if (phase === 'playing') setPhase('paused');
            else if (phase === 'intro' || phase === 'result') router.back();
          }}
          style={styles.hudButton}
          hitSlop={8}
        >
          <Ionicons name={phase === 'playing' ? 'pause' : 'close'} size={22} color={colors.text} />
        </Pressable>
        <View style={styles.hudCenter}>
          <AppText variant="micro" color={colors.textSecondary} uppercase>
            {game.scoreLabel}
          </AppText>
          <AppText variant="title" tabular>
            {formatNumber(score)}
            {game.target ? (
              <AppText variant="subheading" color={colors.textMuted}>
                {' '}
                / {game.target}
              </AppText>
            ) : null}
          </AppText>
        </View>
        <View style={styles.hudRight}>
          {phase !== 'intro' ? (
            <Badge label={mode === 'ranked' ? 'Ranked' : 'Practice'} color={mode === 'ranked' ? colors.success : colors.warning} />
          ) : null}
        </View>
      </View>

      <View style={styles.stage}>
        {showGame ? (
          <GameComponent
            key={runId}
            seed={seed}
            perks={perks}
            paused={phase !== 'playing'}
            reduceMotion={reduceMotion}
            onScore={onScore}
            onFinish={onFinish}
          />
        ) : null}

        {phase === 'intro' || phase === 'starting' ? (
          <View style={styles.overlay}>
            <Card style={styles.panel}>
              <AppText variant="title" align="center">
                {experience.title}
              </AppText>
              <AppText variant="body" color={colors.textSecondary} align="center">
                {experience.how_to_play}
              </AppText>
              <Badge label={game.targetLabel} color={experience.accent_color} style={styles.center} />
              {ownedPerks.length > 0 ? (
                <View style={styles.perks}>
                  {ownedPerks.map((perk) => (
                    <AppText key={perk} variant="caption" color={colors.success} align="center">
                      ✓ {game.perkDescriptions[perk] ?? perk}
                    </AppText>
                  ))}
                </View>
              ) : null}
              {practiceBest > 0 ? (
                <AppText variant="caption" color={colors.textMuted} align="center">
                  Practice best on this device: {formatNumber(practiceBest)}
                </AppText>
              ) : null}
              {startError ? (
                <AppText variant="caption" color={colors.danger} align="center">
                  {startError}
                </AppText>
              ) : null}
              <Button label="Start" icon="play" size="lg" fullWidth loading={phase === 'starting'} onPress={beginRun} testID="start-run" />
              <AppText variant="micro" color={colors.textMuted} align="center">
                Online runs earn BoxCoins, verified by the server. Offline runs are practice only.
              </AppText>
            </Card>
          </View>
        ) : null}

        {phase === 'countdown' ? (
          <View style={styles.overlay} pointerEvents="none">
            <Animated.View key={count} entering={ZoomIn.duration(250)}>
              <AppText variant="display" style={styles.countdown}>
                {count}
              </AppText>
            </Animated.View>
          </View>
        ) : null}

        {phase === 'paused' ? (
          <View style={[styles.overlay, styles.dim]}>
            <Animated.View entering={FadeIn.duration(150)}>
              <Card style={styles.panel}>
                <AppText variant="title" align="center">
                  Paused
                </AppText>
                <Button label="Resume" icon="play" size="lg" fullWidth onPress={() => setPhase('playing')} />
                <Button label="Restart" icon="refresh" variant="secondary" fullWidth onPress={restartRun} />
                <Button label="End run" icon="flag-outline" variant="danger" fullWidth onPress={quitRun} />
              </Card>
            </Animated.View>
          </View>
        ) : null}

        {phase === 'submitting' ? (
          <View style={[styles.overlay, styles.dim]} pointerEvents="none">
            <AppText variant="subheading">{mode === 'ranked' ? 'Verifying your run…' : 'Saving…'}</AppText>
          </View>
        ) : null}

        {phase === 'result' && outcome ? (
          <View style={[styles.overlay, styles.dim]}>
            <Animated.View entering={FadeIn.duration(200)} style={styles.resultWrap}>
              <ResultCard
                outcome={outcome}
                scoreLabel={game.scoreLabel}
                onRetrySubmit={outcome.mode === 'ranked' && outcome.error ? () => submit(outcome.finish) : undefined}
              />
              <Button label="Play again" icon="refresh" size="lg" fullWidth onPress={beginRun} testID="play-again" />
              <Button label="Back" variant="secondary" fullWidth onPress={() => router.back()} />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ResultCard({
  outcome,
  scoreLabel,
  onRetrySubmit,
}: {
  outcome: Outcome;
  scoreLabel: string;
  onRetrySubmit?: () => void;
}) {
  const won = outcome.finish.outcome === 'win';
  return (
    <Card style={styles.panel} tone={won ? 'coin' : 'default'}>
      <Ionicons name={won ? 'trophy' : 'flag'} size={36} color={won ? colors.coin : colors.textSecondary} style={styles.center} />
      <AppText variant="title" align="center">
        {won ? 'You win!' : 'Game over'}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} align="center">
        {outcome.finish.summary}
      </AppText>
      <View style={styles.resultScore}>
        <AppText variant="micro" color={colors.textSecondary} uppercase>
          {scoreLabel}
        </AppText>
        <AppText variant="display" tabular>
          {formatNumber(outcome.finish.score)}
        </AppText>
      </View>

      {outcome.mode === 'practice' ? (
        <AppText variant="caption" color={colors.warning} align="center">
          Practice run: no BoxCoins earned. Best on this device: {formatNumber(outcome.best)}
        </AppText>
      ) : outcome.error ? (
        <>
          <AppText variant="caption" color={colors.danger} align="center">
            Couldn’t submit this run: {outcome.error}
          </AppText>
          {onRetrySubmit ? <Button label="Retry submit" variant="secondary" icon="cloud-upload-outline" onPress={onRetrySubmit} /> : null}
        </>
      ) : outcome.result && outcome.result.accepted ? (
        <View style={styles.rewards}>
          <View style={styles.rewardRow}>
            <AppText variant="body" color={colors.textSecondary}>
              Reward
            </AppText>
            <CoinAmount amount={outcome.result.reward} signed size="md" color={colors.success} />
          </View>
          <View style={styles.rewardRow}>
            <AppText variant="body" color={colors.textSecondary}>
              XP
            </AppText>
            <AppText variant="bodyStrong">+{formatNumber(outcome.result.xp)}</AppText>
          </View>
          {outcome.result.new_best ? <Badge label="New personal best" color={colors.coin} style={styles.center} /> : null}
          {outcome.result.level_up ? (
            <AppText variant="caption" color={colors.primary} align="center">
              Level up! You’re now level {outcome.result.level} (+{formatNumber(outcome.result.followers_gained)} simulated followers)
            </AppText>
          ) : null}
          {outcome.result.doubled ? (
            <AppText variant="caption" color={colors.success} align="center">
              Double Coins applied
            </AppText>
          ) : null}
          {outcome.result.capped ? (
            <AppText variant="caption" color={colors.warning} align="center">
              Daily reward limit reached for this experience ({formatNumber(outcome.result.daily_cap)} BoxCoins).
            </AppText>
          ) : null}
        </View>
      ) : outcome.result && !outcome.result.accepted ? (
        <AppText variant="caption" color={colors.warning} align="center">
          {REJECTION_MESSAGES[outcome.result.reason]}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundDeep },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  hudButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCenter: { flex: 1, alignItems: 'center' },
  hudRight: { width: 80, alignItems: 'flex-end' },
  stage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dim: { backgroundColor: colors.overlay },
  panel: { gap: spacing.md, alignSelf: 'stretch', width: '100%', maxWidth: 420 },
  center: { alignSelf: 'center' },
  perks: { gap: spacing.xs },
  countdown: { fontSize: 72, lineHeight: 80, color: colors.text },
  resultWrap: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, width: '100%', maxWidth: 420 },
  resultScore: { alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md },
  rewards: { gap: spacing.sm },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
