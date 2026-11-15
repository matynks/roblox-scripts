import { useWindowDimensions, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { useAnalytics, useMe } from '@/hooks/queries';
import { OrbAmount, compact } from '@/ui/Orb';
import { Card, ProgressBar, Row, StatTile } from '@/ui/primitives';
import { Header, Screen, SectionHeader } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { formatDuration, TXN_LABEL } from '@/utils/format';

function WeekChart({ data, width }: { data: { day: string; earned: number; spent: number }[]; width: number }) {
  const t = useTheme();
  const h = 140;
  const max = Math.max(1, ...data.flatMap((d) => [d.earned, d.spent]));
  const slot = width / data.length;
  const bw = Math.min(14, slot / 3);
  return (
    <Svg width={width} height={h + 20} accessibilityLabel="Orbs earned and spent over the last 7 days">
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        const he = (d.earned / max) * h;
        const hs = (d.spent / max) * h;
        return (
          <G key={d.day}>
            <Rect x={x - bw - 1} y={h - he} width={bw} height={Math.max(he, 1)} rx={4} fill={t.success} />
            <Rect x={x + 1} y={h - hs} width={bw} height={Math.max(hs, 1)} rx={4} fill={t.danger} opacity={0.85} />
            <SvgText x={x} y={h + 15} fontSize={10} fill={t.textFaint} textAnchor="middle">
              {new Date(`${d.day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow' })}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function Analytics() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const q = useAnalytics();
  const me = useMe();
  if (q.isLoading) return <Screen header={<Header title="Account analytics" />}><LoadingList rows={4} height={120} /></Screen>;
  if (q.error || !q.data) return <Screen header={<Header title="Account analytics" />}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const a = q.data;
  const earned = Object.entries(a.earned_by_kind).sort((x, y) => y[1] - x[1]);
  const spent = Object.entries(a.spent_by_kind).sort((x, y) => y[1] - x[1]);
  const totalEarned = earned.reduce((s, [, v]) => s + v, 0) || 1;
  const totalSpent = spent.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Screen header={<Header title="Account analytics" subtitle="Your simulated economy at a glance" />} refreshing={q.isRefetching} onRefresh={() => q.refetch()} testID="analytics-screen">
      <Row gap={space.sm}>
        <StatTile label="Balance" value={compact(me.data?.wallet.balance ?? 0)} icon="wallet" color={t.gold} />
        <StatTile label="Member" value={`${a.member_days}d`} icon="calendar" />
        <StatTile label="Play time" value={formatDuration(a.play_time_ms)} icon="time" />
      </Row>
      <Row gap={space.sm}>
        <StatTile label="Games" value={compact(a.total_plays)} icon="game-controller" color={t.success} />
        <StatTile label="Items" value={compact(a.items_owned)} icon="cube" />
        <StatTile label="Value" value={compact(a.collection_value)} icon="diamond" color="#F472B6" />
      </Row>
      <Card style={{ gap: space.md }}>
        <Row justify="space-between">
          <Text variant="heading">Last 7 days</Text>
          <Row gap={12}>
            <Row gap={4}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.success }} /><Text variant="small" tone="muted">Earned</Text></Row>
            <Row gap={4}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.danger }} /><Text variant="small" tone="muted">Spent</Text></Row>
          </Row>
        </Row>
        <WeekChart data={a.last_7_days} width={Math.min(width, 700) - space.lg * 4} />
      </Card>
      <Card style={{ gap: space.sm }}>
        <Text variant="heading">Highlights</Text>
        <Text variant="body" tone="muted">
          Favorite genre: <Text variant="bodyStrong">{a.favorite_genre ?? 'play a game to find out'}</Text>
        </Text>
        <Text variant="body" tone="muted">
          Achievements: <Text variant="bodyStrong">{a.achievements_unlocked}/{a.achievements_total}</Text>
        </Text>
        <ProgressBar value={a.achievements_unlocked / Math.max(a.achievements_total, 1)} color={t.gold} />
      </Card>
      <SectionHeader title="Where your Orbs come from" />
      <Card style={{ gap: space.md }}>
        {earned.length ? earned.map(([k, v]) => (
          <View key={k} style={{ gap: 4 }}>
            <Row justify="space-between">
              <Text variant="caption">{TXN_LABEL[k] ?? k}</Text>
              <OrbAmount amount={v} variant="small" size={13} />
            </Row>
            <ProgressBar value={v / totalEarned} color={t.success} height={6} />
          </View>
        )) : <Text variant="caption" tone="faint">Nothing earned yet.</Text>}
      </Card>
      <SectionHeader title="Where your Orbs go" />
      <Card style={{ gap: space.md }}>
        {spent.length ? spent.map(([k, v]) => (
          <View key={k} style={{ gap: 4 }}>
            <Row justify="space-between">
              <Text variant="caption">{TXN_LABEL[k] ?? k}</Text>
              <OrbAmount amount={v} variant="small" size={13} />
            </Row>
            <ProgressBar value={v / totalSpent} color={t.danger} height={6} />
          </View>
        )) : <Text variant="caption" tone="faint">Nothing spent yet.</Text>}
      </Card>
    </Screen>
  );
}
