import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAchievements } from '@/hooks/queries';
import { ChipRow } from '@/ui/Chips';
import { GlyphIcon, Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, ProgressBar, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { formatDate } from '@/utils/format';

const CATS = [
  { value: 'all', label: 'All' },
  { value: 'account', label: 'Account' },
  { value: 'collection', label: 'Collection' },
  { value: 'games', label: 'Games' },
  { value: 'social', label: 'Social' },
  { value: 'progression', label: 'Progression' },
];

export default function Achievements() {
  const t = useTheme();
  const q = useAchievements();
  const [cat, setCat] = useState('all');
  const list = useMemo(() => (q.data ?? []).filter((a) => cat === 'all' || a.category === cat).sort((a, b) => Number(!!b.unlocked_at) - Number(!!a.unlocked_at) || b.progress / b.target - a.progress / a.target), [q.data, cat]);
  const done = (q.data ?? []).filter((a) => a.unlocked_at).length;
  const total = q.data?.length ?? 0;
  return (
    <Screen header={<Header title="Achievements" subtitle={`${done} of ${total} unlocked`} />} refreshing={q.isRefetching} onRefresh={() => q.refetch()} testID="achievements-screen">
      <Card style={{ gap: space.sm }}>
        <Row justify="space-between">
          <Text variant="heading">Completion</Text>
          <Text variant="heading" tone="gold">
            {total ? Math.round((done / total) * 100) : 0}%
          </Text>
        </Row>
        <ProgressBar value={total ? done / total : 0} color={t.gold} height={10} />
      </Card>
      <ChipRow testIDPrefix="achcat" value={cat} onChange={setCat} options={CATS} />
      {q.isLoading ? <LoadingList rows={6} height={76} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : null}
      {list.map((a) => {
        const hidden = a.is_secret && !a.unlocked_at;
        const unlocked = !!a.unlocked_at;
        return (
          <Card key={a.key} style={{ gap: space.sm, opacity: unlocked ? 1 : 0.92 }} testID={`ach-${a.key}`}>
            <Row gap={space.md}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: unlocked ? t.goldSoft : t.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                {hidden ? <Icon name="help" size={24} color={t.textFaint} /> : <GlyphIcon glyph={a.icon} size={24} color={unlocked ? t.gold : t.textFaint} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{hidden ? 'Secret achievement' : a.name}</Text>
                <Text variant="caption" tone="muted">
                  {hidden ? 'Keep playing to discover it.' : a.description}
                </Text>
              </View>
              {unlocked ? <Icon name="checkmark-circle" size={24} color={t.success} /> : a.reward_orbs ? <OrbAmount amount={a.reward_orbs} variant="small" size={13} /> : null}
            </Row>
            {unlocked ? (
              <Text variant="small" tone="faint">
                Unlocked {formatDate(a.unlocked_at!)}
              </Text>
            ) : hidden ? null : (
              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={a.progress / a.target} height={6} />
                </View>
                <Text variant="small" tone="faint">
                  {Math.floor(a.progress).toLocaleString('en-US')}/{a.target.toLocaleString('en-US')}
                </Text>
              </Row>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
