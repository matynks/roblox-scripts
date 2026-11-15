import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fonts, type ThemeColors, useTheme } from './theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'number' | 'small';

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 23 },
  subheading: { fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  small: { fontFamily: fonts.bodyBold, fontSize: 11.5, lineHeight: 15 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  number: { fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 19, fontVariant: ['tabular-nums'] },
};

type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'accent' | 'gold' | 'success' | 'danger' | 'warning' | 'inverse';

const toneColor = (t: ThemeColors, tone: Tone) =>
  ({
    default: t.text,
    muted: t.textMuted,
    faint: t.textFaint,
    primary: t.primary,
    accent: t.accent,
    gold: t.gold,
    success: t.success,
    danger: t.danger,
    warning: t.warning,
    inverse: t.onPrimary,
  })[tone];

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: Tone;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: 'bold';
}

export function Text({ variant = 'body', tone = 'default', color, align, style, ...rest }: AppTextProps) {
  const t = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.35}
      {...rest}
      style={[VARIANTS[variant], { color: color ?? toneColor(t, tone), textAlign: align }, style]}
    />
  );
}
