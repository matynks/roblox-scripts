import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SEASONS } from '@/content/catalog';
import { useClaimDaily, useClaimQuest, useMe, useQuests } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, GradientFill, ProgressBar, Row } from '@/ui/primitives';
import { SectionHeader } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';
import { countdown } from '@/utils/format';

export function useTicker(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const h = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(h);
  }, [ms]);
}

export function DailyRewardCard() {
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

export function SeasonBanner() {
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

export function QuestsCard({ showAll = true }: { showAll?: boolean }) {
  const t = useTheme();
  const q = useQuests();
  const claim = useClaimQuest();
  if (q.isLoading) return <LoadingList rows={1} height={150} />;
  if (q.error) return <ErrorState compact error={q.error} onRetry={() => q.refetch()} />;
  const quests = q.data?.quests ?? [];
  return (
    <Card style={{ gap: space.md }} testID="quests-card">
      <SectionHeader title="Daily quests" action={showAll ? 'All rewards' : undefined} onAction={() => router.push('/rewards')} icon={<Icon name="flag" size={18} color={t.accent} />} />
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

