/**
 * BloxyBox design tokens. Every colour, size and radius in the app comes from here.
 * Dark-first palette tuned for OLED/LCD phones in portrait.
 */

export const palette = {
  ink950: '#07080E',
  ink900: '#0B0C14',
  ink850: '#10121D',
  ink800: '#141625',
  ink750: '#1A1D2F',
  ink700: '#212539',
  ink600: '#2B3049',
  ink500: '#3A4062',
  ink400: '#6C7194',
  ink300: '#A3A8C3',
  ink200: '#C9CCDD',
  ink100: '#F4F5FB',

  violet500: '#7C5CFF',
  violet400: '#957BFF',
  violet300: '#B6A4FF',
  violet900: '#241A55',

  gold500: '#FFC23D',
  gold600: '#E39A12',
  gold300: '#FFE08A',

  mint500: '#3DDC97',
  rose500: '#FF5470',
  sky500: '#4CC9FF',
  amber500: '#FFB23F',
} as const;

export const colors = {
  background: palette.ink900,
  backgroundDeep: palette.ink950,
  surface: palette.ink800,
  surfaceRaised: palette.ink750,
  surfaceHigh: palette.ink700,
  border: palette.ink600,
  borderStrong: palette.ink500,

  text: palette.ink100,
  textSecondary: palette.ink300,
  textMuted: palette.ink400,
  textOnPrimary: '#FFFFFF',
  textOnGold: '#2A1A00',

  primary: palette.violet500,
  primaryPressed: '#6747F0',
  primarySoft: 'rgba(124, 92, 255, 0.16)',
  primaryBorder: 'rgba(124, 92, 255, 0.45)',

  coin: palette.gold500,
  coinDeep: palette.gold600,
  coinSoft: 'rgba(255, 194, 61, 0.14)',

  success: palette.mint500,
  successSoft: 'rgba(61, 220, 151, 0.14)',
  danger: palette.rose500,
  dangerSoft: 'rgba(255, 84, 112, 0.14)',
  warning: palette.amber500,
  warningSoft: 'rgba(255, 178, 63, 0.14)',
  info: palette.sky500,
  infoSoft: 'rgba(76, 201, 255, 0.14)',

  overlay: 'rgba(5, 6, 12, 0.72)',
  transparent: 'transparent',
} as const;

export const rarityColors = {
  common: '#A3A8C3',
  uncommon: '#3DDC97',
  rare: '#4C9BFF',
  epic: '#B07CFF',
  legendary: '#FFB23F',
} as const;

export type Rarity = keyof typeof rarityColors;

export const rarityOrder: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** Profile accent options. Keys match the `profiles.accent` check constraint. */
export const accentColors = {
  violet: '#7C5CFF',
  cyan: '#22D3EE',
  lime: '#A3E635',
  amber: '#FBBF24',
  rose: '#FB7185',
  sky: '#60A5FA',
} as const;

export type Accent = keyof typeof accentColors;
export const accentKeys = Object.keys(accentColors) as Accent[];

/** Avatar skin palette. Must match the `avatars.skin_color` check constraint. */
export const skinColors = [
  '#F5D0B0',
  '#E8B48C',
  '#C98E62',
  '#9A6440',
  '#6B4429',
  '#FFD86B',
  '#8FE3C4',
  '#9DB8FF',
  '#D7A8FF',
  '#FF9DB0',
] as const;

export const headShapes = ['cube', 'round', 'tall'] as const;
export type HeadShape = (typeof headShapes)[number];

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontFamily = 'Outfit';

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Minimum comfortable touch target (Material guidance). */
export const minTouch = 48;
