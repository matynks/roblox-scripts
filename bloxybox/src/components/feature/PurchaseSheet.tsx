import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { Sheet } from '@/components/ui/Overlays';
import { colors, spacing } from '@/theme/tokens';

/** Confirmation before any BoxCoins are spent. The server re-validates everything. */
export function PurchaseSheet({
  visible,
  title,
  subtitle,
  price,
  balance,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  price: number;
  balance: number | undefined;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const known = typeof balance === 'number';
  const shortfall = known ? price - balance : 0;
  return (
    <Sheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View style={styles.header}>
        <AppText variant="heading">Confirm purchase</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {title} · {subtitle}
        </AppText>
      </View>
      <View style={styles.rows}>
        <View style={styles.row}>
          <AppText variant="body" color={colors.textSecondary}>
            Price
          </AppText>
          <CoinAmount amount={price} />
        </View>
        <View style={styles.row}>
          <AppText variant="body" color={colors.textSecondary}>
            Your balance
          </AppText>
          {known ? <CoinAmount amount={balance} /> : <AppText variant="body">—</AppText>}
        </View>
        {known ? (
          <View style={styles.row}>
            <AppText variant="body" color={colors.textSecondary}>
              After purchase
            </AppText>
            <CoinAmount amount={Math.max(0, balance - price)} color={shortfall > 0 ? colors.danger : colors.text} />
          </View>
        ) : null}
      </View>
      {shortfall > 0 ? (
        <AppText variant="caption" color={colors.danger}>
          You need {shortfall} more BoxCoins. Play experiences or claim your daily reward to earn more.
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} disabled={busy} style={styles.flex} />
        <Button
          label="Buy"
          variant="coin"
          onPress={onConfirm}
          loading={busy}
          disabled={shortfall > 0}
          style={styles.flex}
          testID="confirm-purchase"
        />
      </View>
      <AppText variant="micro" color={colors.textMuted} align="center">
        BoxCoins are simulated and have no real-world value. No real money is ever charged.
      </AppText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.md },
});
