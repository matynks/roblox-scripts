import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useMe } from '@/hooks/queries';
import { haptic } from '@/ui/haptics';
import { OrbAmount } from '@/ui/Orb';
import { radius, useTheme } from '@/ui/theme';

/** Wallet balance pill; tapping opens the transaction history. */
export function BalanceChip({ testID = 'balance-chip' }: { testID?: string }) {
  const t = useTheme();
  const me = useMe();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Balance ${me.data?.wallet.balance ?? 0} Orbs. Open transactions`}
      onPress={() => {
        haptic.tap();
        router.push('/transactions');
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? t.surfacePressed : t.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: t.goldSoft })}
    >
      <OrbAmount amount={me.data?.wallet.balance ?? 0} variant="subheading" short showSim />
    </Pressable>
  );
}
