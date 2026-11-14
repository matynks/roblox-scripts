import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExperienceArt, PassCard } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Badge, withAlpha } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { SectionHeader } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/StateViews';
import { CATEGORY_LABELS, useExperience, useLeaderboard, useMyProgress } from '@/features/discover/api';
import { isGameImplemented } from '@/games/registry';
import { useGamePasses, usePassOwnership } from '@/features/passes/api';
import { formatCompact, formatNumber } from '@/lib/format';
import { useUserId } from '@/stores/session';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const userId = useUserId();
  const experience = useExperience(slug ?? '');
  const passes = useGamePasses();
  const ownership = usePassOwnership();
  const progress = useMyProgress();
  const exp = experience.data;
  const leaderboard = useLeaderboard(exp?.status === 'playable' ? exp.slug : '');

  const experiencePasses = useMemo(
    () => (passes.data ?? []).filter((p) => p.experience_id === exp?.id),
    [passes.data, exp?.id],
  );
  const myProgress = progress.data?.find((p) => p.experience_id === exp?.id);

  if (experience.isPending) return <Screen back title=""><LoadingState /></Screen>;
  if (experience.isError && !exp) {
    return (
      <Screen back title="Experience">
        <ErrorState error={experience.error} onRetry={() => experience.refetch()} />
      </Screen>
    );
  }
  if (!exp) {
    return (
      <Screen back title="Experience">
        <EmptyState icon="help-circle-outline" title="Experience not found" actionLabel="Back to Discover" onAction={() => router.replace('/discover')} />
      </Screen>
    );
  }

  const playable = exp.status === 'playable' && isGameImplemented(exp.slug);
  const accent = exp.accent_color;

  return (
    <Screen
      back
      title={exp.title}
      bottomInset
      footer={
        playable ? (
          <Button
            label="Play"
            icon="play"
            size="lg"
            fullWidth
            onPress={() => router.push({ pathname: '/play/[slug]', params: { slug: exp.slug } })}
            testID="play-button"
          />
        ) : (
          <View style={styles.devFooter}>
            <Ionicons name="construct-outline" size={18} color={colors.textSecondary} />
            <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
              In development. This experience is not playable yet.
            </AppText>
          </View>
        )
      }
    >
      <View style={[styles.hero, { backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.35) }]}>
        <ExperienceArt slug={exp.slug} accent={accent} size={150} />
      </View>

      <View style={styles.titleBlock}>
        <View style={styles.badges}>
          <Badge label={CATEGORY_LABELS[exp.category]} color={accent} />
          {exp.status === 'playable' ? (
            <Badge label="Playable" color={colors.success} />
          ) : (
            <Badge label="In development" color={colors.textSecondary} />
          )}
        </View>
        <AppText variant="title">{exp.title}</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {exp.description}
        </AppText>
      </View>

      {exp.status === 'playable' ? (
        <>
          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Plays
              </AppText>
              <AppText variant="heading">{formatCompact(exp.play_count)}</AppText>
            </Card>
            <Card style={styles.statCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Your best
              </AppText>
              <AppText variant="heading">
                {myProgress ? `${formatNumber(myProgress.best_score)}` : '—'}
              </AppText>
            </Card>
            <Card style={styles.statCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Wins
              </AppText>
              <AppText variant="heading">{myProgress ? formatNumber(myProgress.wins) : '—'}</AppText>
            </Card>
          </View>

          <Card>
            <AppText variant="subheading">How to play</AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.mt}>
              {exp.how_to_play}
            </AppText>
            <View style={styles.rewardRow}>
              <AppText variant="caption" color={colors.textSecondary}>
                Up to
              </AppText>
              <CoinAmount amount={exp.max_reward_per_run} size="sm" />
              <AppText variant="caption" color={colors.textSecondary}>
                per run · win bonus {exp.win_bonus} · daily limit {formatNumber(exp.daily_reward_cap)}
              </AppText>
            </View>
          </Card>

          <SectionHeader title="Game Passes" actionLabel="Manage" onAction={() => router.push('/passes')} />
          {passes.isPending ? (
            <Skeleton height={72} radius={radii.lg} />
          ) : experiencePasses.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              No passes for this experience yet.
            </AppText>
          ) : (
            <View style={styles.list}>
              {experiencePasses.map((pass) => {
                const owned = ownership.data?.get(pass.id);
                return (
                  <PassCard
                    key={pass.id}
                    pass={pass}
                    owned={!!owned}
                    enabled={owned?.enabled}
                    onPress={() => router.push({ pathname: '/pass/[id]', params: { id: pass.id } })}
                  />
                );
              })}
            </View>
          )}

          <SectionHeader title="Leaderboard" />
          <Card padded={false}>
            {leaderboard.isPending ? (
              <View style={styles.boardPad}>
                <Skeleton height={20} />
              </View>
            ) : leaderboard.isError ? (
              <ErrorState error={leaderboard.error} onRetry={() => leaderboard.refetch()} />
            ) : (leaderboard.data ?? []).length === 0 ? (
              <View style={styles.boardPad}>
                <AppText variant="caption" color={colors.textSecondary}>
                  No scores yet. Be the first!
                </AppText>
              </View>
            ) : (
              (leaderboard.data ?? []).slice(0, 10).map((entry) => (
                <View
                  key={entry.user_id}
                  style={[styles.boardRow, entry.user_id === userId ? { backgroundColor: colors.primarySoft } : null]}
                >
                  <AppText variant="bodyStrong" color={entry.rank <= 3 ? colors.coin : colors.textSecondary} style={styles.rank}>
                    #{entry.rank}
                  </AppText>
                  <AppText
                    variant="body"
                    numberOfLines={1}
                    style={styles.flex}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: entry.user_id } })}
                  >
                    {entry.display_name}
                  </AppText>
                  <AppText variant="bodyStrong" tabular>
                    {formatNumber(entry.best_score)}
                  </AppText>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <Card>
          <AppText variant="subheading">Coming later</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.mt}>
            {exp.title} is being built. It will appear under Popular once it is playable.
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt: { marginTop: spacing.sm },
  hero: {
    height: 200,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, gap: spacing.xs },
  rewardRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  list: { gap: spacing.sm },
  boardPad: { padding: spacing.lg },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rank: { width: 40 },
  devFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
});
