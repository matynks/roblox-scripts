import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { ProfileSummary } from '@/api/types';
import { StatTile } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Badge, SimBadge, withAlpha } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Controls';
import { AvatarView } from '@/features/avatar/AvatarView';
import { formatCompact, formatDate, formatNumber } from '@/lib/format';
import { usePreferences } from '@/stores/preferences';
import { accentColors, colors, radii, spacing } from '@/theme/tokens';

export function ProfileView({ profile, actions }: { profile: ProfileSummary; actions?: React.ReactNode }) {
  const showBreakdown = usePreferences((s) => s.showSimulatedBreakdown);
  const accent = accentColors[profile.accent] ?? colors.primary;
  const { stats, social } = profile;
  const levelSpan = Math.max(1, stats.xp_next_level - stats.xp_level_start);
  const levelProgress = (stats.xp - stats.xp_level_start) / levelSpan;
  const openConnections = (kind: 'followers' | 'following' | 'friends') =>
    router.push({ pathname: '/connections/[id]', params: { id: profile.id, kind } });

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { backgroundColor: withAlpha(accent, 0.18), borderColor: withAlpha(accent, 0.4) }]}>
        <View style={[styles.avatarRing, { borderColor: accent }]}>
          <AvatarView appearance={profile.avatar} size={120} accessibilityLabel={`${profile.display_name}'s avatar`} />
        </View>
      </View>

      <View style={styles.identity}>
        <AppText variant="title" align="center" numberOfLines={1}>
          {profile.display_name}
        </AppText>
        <View style={styles.handleRow}>
          <AppText variant="body" color={colors.textSecondary}>
            @{profile.username}
          </AppText>
          <Badge label={`Level ${stats.level}`} color={accent} />
          {profile.relationship.follows_you && !profile.relationship.is_self ? (
            <Badge label={profile.relationship.is_following ? 'Friend' : 'Follows you'} color={colors.success} />
          ) : null}
        </View>
        {profile.bio ? (
          <AppText variant="body" color={colors.text} align="center">
            {profile.bio}
          </AppText>
        ) : null}
      </View>

      {actions}

      <View style={styles.statsRow}>
        <StatTile label="Followers" value={formatCompact(social.followers_total)} simulated={social.followers_simulated > 0} onPress={() => openConnections('followers')} />
        <StatTile label="Following" value={formatCompact(social.following)} onPress={() => openConnections('following')} />
        <StatTile label="Friends" value={formatCompact(social.friends)} onPress={() => openConnections('friends')} />
      </View>
      {showBreakdown && social.followers_simulated > 0 ? (
        <View style={styles.breakdown}>
          <SimBadge />
          <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
            {formatNumber(social.followers_real)} player follower{social.followers_real === 1 ? '' : 's'} +{' '}
            {formatNumber(social.followers_simulated)} simulated followers (BloxyBox simulation data)
          </AppText>
        </View>
      ) : null}

      <Card>
        <View style={styles.levelHeader}>
          <AppText variant="subheading" style={styles.flex}>
            Level {stats.level}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {formatNumber(stats.xp - stats.xp_level_start)} / {formatNumber(levelSpan)} XP
          </AppText>
        </View>
        <View style={styles.mtSm}>
          <ProgressBar progress={levelProgress} color={accent} />
        </View>
        <AppText variant="caption" color={colors.textMuted} style={styles.mtSm}>
          Earn XP by playing. Each new level brings simulated followers.
        </AppText>
      </Card>

      <View style={styles.grid}>
        <StatTile label="Games played" value={formatCompact(stats.games_played)} />
        <StatTile label="Profile visits" value={formatCompact(stats.profile_visits)} simulated />
      </View>
      <View style={styles.grid}>
        <StatTile label="Items owned" value={formatCompact(stats.items_owned)} />
        <StatTile label="Day streak" value={formatCompact(stats.daily_streak)} />
      </View>
      <AppText variant="caption" color={colors.textMuted} align="center">
        Joined {formatDate(profile.created_at)} · All social stats are BloxyBox simulation data
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  flex: { flex: 1 },
  mtSm: { marginTop: spacing.sm },
  banner: {
    height: 170,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarRing: {
    marginBottom: -34,
    width: 150,
    height: 170,
    borderRadius: radii.xl,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identity: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  breakdown: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.sm },
  levelHeader: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', gap: spacing.sm },
});
