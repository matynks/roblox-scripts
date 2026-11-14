import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BoxCoinIcon } from '@/components/brand/Brand';
import { formatCompact, formatNumber, formatSigned } from '@/lib/format';
import { colors, spacing, type TypographyVariant } from '@/theme/tokens';

import { AppText } from './AppText';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<Size, { icon: number; variant: TypographyVariant }> = {
  sm: { icon: 14, variant: 'caption' },
  md: { icon: 18, variant: 'bodyStrong' },
  lg: { icon: 24, variant: 'title' },
  xl: { icon: 34, variant: 'display' },
};

export const CoinAmount = memo(function CoinAmount({
  amount,
  size = 'md',
  compact = false,
  signed = false,
  color = colors.text,
}: {
  amount: number;
  size?: Size;
  compact?: boolean;
  signed?: boolean;
  color?: string;
}) {
  const s = SIZE[size];
  const text = signed ? formatSigned(amount) : compact ? formatCompact(amount) : formatNumber(amount);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${signed && amount > 0 ? 'plus ' : ''}${formatNumber(amount)} BoxCoins`}
    >
      <BoxCoinIcon size={s.icon} />
      <AppText variant={s.variant} color={color} tabular>
        {text}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
});
