import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { isOnline } from '@/api';
import { Headshot } from '@/avatar/AvatarView';
import { BalanceChip } from '@/components/BalanceChip';
import { FeedItem } from '@/components/FeedItem';
import { GameRail } from '@/components/GameCard';
import { SEASONS } from '@/content/catalog';
import { useClaimDaily, useClaimQuest, useDiscover, useFeed, useMe, useQuests } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, GradientFill, IconButton, ProgressBar, Row } from '@/ui/primitives';
import { Screen, SectionHeader } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';
import { countdown } from '@/utils/format';
import { DailyRewardCard, QuestsCard, SeasonBanner } from '@/components/RewardCards';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const t = useTheme();
  const me = useMe();
  const discover = useDiscover();
  const feed = useFeed();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([me.refetch(), discover.refetch(), feed.refetch()]);
    setRefreshing(false);
  };

  if (me.isLoading) {
    return (
      <Screen tabInset>
        <LoadingList rows={5} height={110} />
      </Screen>
    );
  }
  if (me.error || !me.data) {
    return (
      <Screen tabInset>
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </Screen>
    );
  }
  const p = me.data.profile;
  const xpInto = p.xp - p.xp_for_level;
  const xpNeed = Math.max(1, p.xp_for_next - p.xp_for_level);
  const games = discover.data?.continue_playing?.length ? discover.data.continue_playing : discover.data?.recommended ?? [];

  return (
    <Screen tabInset refreshing={refreshing} onRefresh={refresh} testID="home-screen">
      <Row justify="space-between">
        <Row gap={space.md} style={{ flex: 1 }}>
          <Headshot config={me.data.avatar} size={46} ring={t.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              {greeting()},
            </Text>
            <Text variant="heading" numberOfLines={1} testID="home-name">
              {p.display_name}
            </Text>
          </View>
        </Row>
        <Row gap={8}>
          <BalanceChip />
          <IconButton icon="notifications-outline" label="Notifications" badge={me.data.counts.unread_notifications} onPress={() => router.push('/notifications')} />
        </Row>
      </Row>

      <Card style={{ gap: 8 }} padded>
        <Row justify="space-between">
          <Row gap={8}>
            <View style={{ backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text variant="small" color="#fff">
                LV {p.level}
              </Text>
            </View>
            <Text variant="caption" tone="muted">
              {xpInto.toLocaleString('en-US')} / {xpNeed.toLocaleString('en-US')} XP to level {Math.min(p.level + 1, 100)}
            </Text>
          </Row>
          <Text variant="small" tone="primary" onPress={() => router.push('/achievements')}>
            Badges
          </Text>
        </Row>
        <ProgressBar value={xpInto / xpNeed} />
      </Card>

      <DailyRewardCard />
      <SeasonBanner />
      <QuestsCard />

      <SectionHeader title={discover.data?.continue_playing?.length ? 'Continue playing' : 'Recommended for you'} action="Discover" onAction={() => router.push('/discover')} />
      {discover.isLoading ? (
        <LoadingList rows={1} height={150} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingHorizontal: space.lg }}>
          <GameRail games={games.slice(0, 8)} extra={(g) => (g.best_score ? `Best ${g.best_score.toLocaleString('en-US')}` : undefined)} />
        </ScrollView>
      )}

      <SectionHeader title="Friend activity" action="See all" onAction={() => router.push('/activity')} />
      <Card padded={false} style={{ paddingHorizontal: space.md, paddingVertical: space.xs }}>
        {feed.isLoading ? (
          <View style={{ padding: space.md }}>
            <LoadingList rows={3} height={44} />
          </View>
        ) : (feed.data ?? []).filter((e) => e.user?.id !== p.id).length === 0 ? (
          <EmptyState icon="people-outline" title="No friend activity yet" message="Add friends or follow players to see what they're up to." actionLabel="Find players" onAction={() => router.push('/search')} />
        ) : (
          (feed.data ?? [])
            .filter((e) => e.user?.id !== p.id)
            .slice(0, 6)
            .map((e) => <FeedItem key={e.id} event={e} />)
        )}
      </Card>

      <Text variant="small" tone="faint" align="center">
        Blockora is an independent simulator. Orbs, items and stats are simulated and have no real-world value.{isOnline ? '' : ' Offline mode — progress is saved on this device.'}
      </Text>
    </Screen>
  );
}
