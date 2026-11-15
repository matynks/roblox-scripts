import { router } from 'expo-router';

import { DailyRewardCard, QuestsCard } from '@/components/RewardCards';
import { useAchievements, useMe, useQuests } from '@/hooks/queries';
import { levelReward } from '@/domain/rules';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, ListRow, ProgressBar, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { countdown } from '@/utils/format';

export default function Rewards() {
  const t = useTheme();
  const me = useMe();
  const quests = useQuests();
  const ach = useAchievements();
  const unlocked = (ach.data ?? []).filter((a) => a.unlocked_at).length;
  const level = me.data?.profile.level ?? 1;
  return (
    <Screen header={<Header title="Rewards" subtitle="Ways to earn Orbs every day" />} refreshing={quests.isRefetching} onRefresh={() => { quests.refetch(); me.refetch(); }} testID="rewards-screen">
      <DailyRewardCard />
      <QuestsCard showAll={false} />
      {quests.data ? (
        <Row gap={6} justify="center">
          <Icon name="time-outline" size={14} color={t.textFaint} />
          <Text variant="small" tone="faint">
            New quests in {countdown(quests.data.resets_at)}
          </Text>
        </Row>
      ) : null}
      <Card padded={false}>
        <ListRow icon="trophy" iconColor={t.gold} title="Achievements" subtitle={`${unlocked} of ${ach.data?.length ?? 0} unlocked`} onPress={() => router.push('/achievements')} />
        <ListRow icon="game-controller" iconColor={t.success} title="Play games" subtitle="Every experience pays Orbs, up to a daily cap per game" onPress={() => router.push('/discover')} />
        <ListRow icon="layers" iconColor="#F472B6" title="Complete item sets" subtitle="Collect every piece of a set for a bonus" onPress={() => router.push('/inventory')} />
      </Card>
      <Card style={{ gap: space.sm }}>
        <Row justify="space-between">
          <Text variant="heading">Next level reward</Text>
          <OrbAmount amount={levelReward(Math.min(level + 1, 100))} variant="subheading" />
        </Row>
        <ProgressBar value={me.data ? (me.data.profile.xp - me.data.profile.xp_for_level) / Math.max(1, me.data.profile.xp_for_next - me.data.profile.xp_for_level) : 0} />
        <Text variant="caption" tone="muted">
          Earn XP from games, purchases, quests and achievements. Higher levels unlock profile themes.
        </Text>
      </Card>
    </Screen>
  );
}
