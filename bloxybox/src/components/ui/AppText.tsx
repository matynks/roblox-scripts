import { memo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fontFamily, typography, type TypographyVariant } from '@/theme/tokens';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
  uppercase?: boolean;
};

export const AppText = memo(function AppText({
  variant = 'body',
  color = colors.text,
  align,
  tabular,
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const type = typography[variant];
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        styles.base,
        type,
        { color },
        align ? { textAlign: align } : null,
        tabular ? styles.tabular : null,
        uppercase ? styles.uppercase : null,
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    fontFamily,
    includeFontPadding: false,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  uppercase: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
