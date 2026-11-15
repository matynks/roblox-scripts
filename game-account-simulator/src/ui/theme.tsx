import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import type { Rarity } from '@/content/types';
import { usePrefs } from '@/state/prefs';

const dark = {
  scheme: 'dark' as 'dark' | 'light',
  bg: '#070A14',
  bgElevated: '#0C1120',
  surface: '#111829',
  surfaceAlt: '#172036',
  surfacePressed: '#1D2842',
  border: '#212C47',
  borderStrong: '#2E3B5E',
  text: '#F3F5FF',
  textMuted: '#A2ACC7',
  textFaint: '#67728F',
  primary: '#7C5CFF',
  primaryPressed: '#6646F0',
  primarySoft: 'rgba(124,92,255,0.16)',
  onPrimary: '#FFFFFF',
  accent: '#22D3EE',
  accentSoft: 'rgba(34,211,238,0.14)',
  gold: '#FFC53D',
  goldSoft: 'rgba(255,197,61,0.15)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.15)',
  danger: '#F43F5E',
  dangerSoft: 'rgba(244,63,94,0.15)',
  warning: '#F59E0B',
  overlay: 'rgba(2,4,12,0.72)',
  tabBar: 'rgba(10,14,27,0.96)',
  shadow: '#000000',
  skeleton: '#1A2339',
  skeletonHighlight: '#24304C',
};

const light: typeof dark = {
  scheme: 'light',
  bg: '#F2F4FA',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF0F8',
  surfacePressed: '#E2E7F3',
  border: '#DEE3EF',
  borderStrong: '#C7CFE2',
  text: '#0B1222',
  textMuted: '#4C5875',
  textFaint: '#8490AC',
  primary: '#6A48F5',
  primaryPressed: '#5634E6',
  primarySoft: 'rgba(106,72,245,0.12)',
  onPrimary: '#FFFFFF',
  accent: '#0891B2',
  accentSoft: 'rgba(8,145,178,0.12)',
  gold: '#C98A00',
  goldSoft: 'rgba(217,154,0,0.14)',
  success: '#16A34A',
  successSoft: 'rgba(22,163,74,0.12)',
  danger: '#E11D48',
  dangerSoft: 'rgba(225,29,72,0.10)',
  warning: '#D97706',
  overlay: 'rgba(11,18,34,0.45)',
  tabBar: 'rgba(255,255,255,0.97)',
  shadow: '#1B2440',
  skeleton: '#E4E8F2',
  skeletonHighlight: '#F1F3F9',
};

export type ThemeColors = typeof dark;

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9AA4B8',
  uncommon: '#34D399',
  rare: '#38BDF8',
  epic: '#A78BFA',
  legendary: '#FBBF24',
  mythic: '#F472B6',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export const BRAND_GRADIENT = ['#7C5CFF', '#22D3EE'] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const fonts = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Nunito_600SemiBold',
  bodyRegular: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
};

const ThemeContext = createContext<ThemeColors>(dark);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = usePrefs((s) => s.theme);
  const scheme = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  const value = useMemo(() => (scheme === 'light' ? light : dark), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
