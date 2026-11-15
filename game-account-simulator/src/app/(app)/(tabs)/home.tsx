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

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function useTicker(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const h = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(h);
  }, [ms]);
}

function DailyRewardCard() {
  const t = useTheme();
  const me = useMe();
  const claim = useClaimDaily();
  useTicker();
  const d = me.data?.daily;
  if (!d) return null;
  const dayIndex = d.can_claim ? (d.next_streak - 1) % 7 : (d.current_streak - 1) % 7;
  return (
    <Card testID="daily-card" style={{ gap: space.md }}>
      <Row justify="space-between">
        <Row gap={10}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: t.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="flame" size={22} color={t.gold} />
          </View>
          <View>
            <Text variant="heading">Daily reward</Text>
            <Text variant="caption" tone="muted">
              {d.current_streak > 0 ? `${d.current_streak}-day streak · best ${d.longest_streak}` : 'Start a streak today'}
            </Text>
          </View>
        </Row>
        {d.can_claim ? (
          <Button title="Claim" icon="gift" variant="gold" size="sm" loading={claim.isPending} onPress={() => claim.mutate()} testID="claim-daily" />
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="small" tone="faint">
              Next in
            </Text>
            <Text variant="subheading">{d.next_claim_at ? countdown(d.next_claim_at) : '—'}</Text>
          </View>
        )}
      </Row>
      <Row gap={6}>
        {d.cycle.map((amount, i) => {
          const done = d.can_claim ? i < dayIndex : i <= dayIndex;
          const current = d.can_claim && i === dayIndex;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: current ? t.goldSoft : done ? t.successSoft : t.surfaceAlt, borderWidth: current ? 1.5 : 0, borderColor: t.gold }}>
              <Text variant="small" tone={done ? 'success' : current ? 'gold' : 'faint'}>
                {i === 6 ? 'Day 7' : `D${i + 1}`}
              </Text>
              {done ? <Icon name="checkmark-circle" size={16} color={t.success} /> : <Text variant="small" tone={current ? 'gold' : 'muted'}>{amount}</Text>}
            </View>
          );
        })}
      </Row>
    </Card>
  );
}

function SeasonBanner() {
  const me = useMe();
  useTicker(60_000);
  const s = me.data?.season;
  if (!s) return null;
  const meta = SEASONS[s.key];
  return (
    <Animated.View entering={FadeInDown.delay(80)}>
      <GradientFill colors={[meta.colors[1], meta.colors[0]]} style={{ borderRadius: radius.lg, padding: space.lg, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <View style={{ position: 'absolute', right: 30, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(0,0,0,0.12)' }} />
        <Row justify="space-between" align="flex-start">
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="label" color="rgba(255,255,255,0.85)">
              Season event · ends in {countdown(s.ends_at)}
            </Text>
            <Text variant="title" color="#fff">
              {meta.name}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.9)">
              {meta.tagline}
            </Text>
          </View>
          <Icon name="sparkles" size={30} color="#fff" />
        </Row>
        <Button title="Shop exclusives" variant="secondary" size="sm" iconRight="arrow-forward" style={{ alignSelf: 'flex-start', marginTop: space.md }} onPress={() => router.push({ pathname: '/marketplace', params: { category: 'special' } })} testID="season-shop" />
      </GradientFill>
    </Animated.View>
  );
}

function QuestsCard() {
  const t = useTheme();
  const q = useQuests();
  const claim = useClaimQuest();
  if (q.isLoading) return <LoadingList rows={1} height={150} />;
  if (q.error) return <ErrorState compact error={q.error} onRetry={() => q.refetch()} />;
  const quests = q.data?.quests ?? [];
  return (
    <Card style={{ gap: space.md }} testID="quests-card">
      <SectionHeader title="Daily quests" action="All rewards" onAction={() => router.push('/rewards')} icon={<Icon name="flag" size={18} color={t.accent} />} />
      {quests.map((quest) => (
        <View key={quest.key} style={{ gap: 6 }}>
          <Row justify="space-between">
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {quest.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {quest.description}
              </Text>
            </View>
            {quest.claimed ? (
              <Row gap={4}>
                <Icon name="checkmark-done" size={16} color={t.success} />
                <Text variant="small" tone="success">
                  Claimed
                </Text>
              </Row>
            ) : quest.completed ? (
              <Button title="Claim" size="sm" variant="gold" loading={claim.isPending && claim.variables === quest.key} onPress={() => claim.mutate(quest.key)} testID={`claim-quest-${quest.key}`} />
            ) : (
              <OrbAmount amount={quest.reward_orbs} variant="small" size={14} />
            )}
          </Row>
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={quest.progress / quest.target} color={quest.completed ? t.success : t.accent} height={6} />
            </View>
            <Text variant="small" tone="faint">
              {quest.progress}/{quest.target}
            </Text>
          </Row>
        </View>
      ))}
    </Card>
  );
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
