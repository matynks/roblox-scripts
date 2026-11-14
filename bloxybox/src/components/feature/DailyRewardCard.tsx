import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useIsOnline } from '@/components/ui/Overlays';
import { Skeleton } from '@/components/ui/StateViews';
import { useClaimDailyReward, useDailyRewardStatus } from '@/features/wallet/api';
import { formatCountdown } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { toast } from '@/stores/toast';
import { colors, spacing } from '@/theme/tokens';

const DAYS = 7;

export function DailyRewardCard() {
  const status = useDailyRewardStatus();
  const claim = useClaimDailyReward();
  const online = useIsOnline();
  const [now, setNow] = useState(() => Date.now());

  const available = status.data?.available ?? false;
  useEffect(() => {
    if (available || !status.data) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [available, status.data]);

  if (status.isPending) {
    return (
      <Card>
        <Skeleton height={18} width="50%" />
        <Skeleton height={44} style={{ marginTop: spacing.md }} />
      </Card>
    );
  }

  if (status.isError || !status.data) {
    return (
      <Card>
        <AppText variant="bodyStrong">Daily reward</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {toAppError(status.error).message}
        </AppText>
        <Button label="Retry" variant="secondary" size="sm" onPress={() => status.refetch()} style={styles.retry} />
      </Card>
    );
  }

  const data = status.data;
  // Before claiming, show the days already completed in the streak the next claim continues.
  const currentStreak = available ? data.next_streak - 1 : data.streak;
  const filled = Math.min(Math.max(currentStreak, 0), DAYS);
  const msLeft = new Date(data.next_claim_at).getTime() - now;

  const onClaim = () => {
    claim.mutate(undefined, {
      onSuccess: (result) => {
        haptics.success();
        toast.coin(`+${result.amount} BoxCoins`, `Day ${result.streak} streak. See you tomorrow!`);
      },
      onError: (e) => {
        haptics.error();
        toast.error('Reward not claimed', toAppError(e).message);
      },
    });
  };

  return (
    <Card tone={available ? 'coin' : 'default'}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={20} color={available ? colors.coin : colors.textSecondary} />
        <AppText variant="subheading" style={styles.flex}>
          Daily reward
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {currentStreak > 0 ? `${currentStreak}-day streak` : 'Start a streak'}
        </AppText>
      </View>
      <View style={styles.days} accessibilityLabel={`Streak ${data.streak} of ${DAYS} days`}>
        {Array.from({ length: DAYS }, (_, i) => (
          <View
            key={i}
            style={[styles.day, { backgroundColor: i < filled ? colors.coin : colors.surfaceHigh }]}
          />
        ))}
      </View>
      {available ? (
        <Button
          label={`Claim ${data.next_amount} BoxCoins`}
          variant="coin"
          icon="gift"
          loading={claim.isPending}
          disabled={!online}
          onPress={onClaim}
          fullWidth
          testID="claim-daily"
        />
      ) : (
        <AppText variant="caption" color={colors.textSecondary}>
          Claimed today. Next reward of {data.next_amount} BoxCoins in {formatCountdown(msLeft)}.
        </AppText>
      )}
      {available && !online ? (
        <AppText variant="caption" color={colors.warning} style={styles.offline}>
          Connect to the internet to claim.
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  days: { flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.md },
  day: { flex: 1, height: 8, borderRadius: 4 },
  retry: { alignSelf: 'flex-start', marginTop: spacing.md },
  offline: { marginTop: spacing.sm },
});
