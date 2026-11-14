import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';

/**
 * BloxyBox mark: an open isometric box with a glowing lid hinge.
 * Original artwork; drawn in code so it stays crisp at every size.
 */
export const LogoMark = memo(function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="BloxyBox logo">
      <Defs>
        <LinearGradient id="bbTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B6A4FF" />
          <Stop offset="1" stopColor="#7C5CFF" />
        </LinearGradient>
        <LinearGradient id="bbLeft" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5A3FE0" />
          <Stop offset="1" stopColor="#3B28A8" />
        </LinearGradient>
        <LinearGradient id="bbRight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7C5CFF" />
          <Stop offset="1" stopColor="#5238D6" />
        </LinearGradient>
      </Defs>
      {/* left face */}
      <Path d="M8 22 L32 34 L32 60 L8 48 Z" fill="url(#bbLeft)" />
      {/* right face */}
      <Path d="M56 22 L32 34 L32 60 L56 48 Z" fill="url(#bbRight)" />
      {/* top face */}
      <Path d="M8 22 L32 10 L56 22 L32 34 Z" fill="url(#bbTop)" />
      {/* lid flap, tilted open */}
      <Path d="M32 10 L56 22 L60 12 L38 2 Z" fill="#FFC23D" />
      <Path d="M32 10 L38 2 L60 12 L56 22" fill="none" stroke="#FFE08A" strokeWidth={1.5} strokeLinejoin="round" />
      {/* face: two eyes and a smile on the right face */}
      <Rect x={37.5} y={35.3} width={4} height={6.4} rx={2} fill="#0B0C14" />
      <Rect x={45.5} y={31.3} width={4} height={6.4} rx={2} fill="#0B0C14" />
      <Path d="M37 49.6 Q44 50.5 50 43.2" stroke="#0B0C14" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
});

export const Wordmark = memo(function Wordmark({ size = 'title' }: { size?: 'title' | 'display' }) {
  return (
    <View style={styles.wordmark}>
      <AppText variant={size} color={colors.text}>
        Bloxy
      </AppText>
      <AppText variant={size} color={colors.primary}>
        Box
      </AppText>
    </View>
  );
});

/** BoxCoin: gold coin with an embossed cube. Simulated currency, no real value. */
export const BoxCoinIcon = memo(function BoxCoinIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="BoxCoins">
      <Defs>
        <LinearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="0.55" stopColor="#FFC23D" />
          <Stop offset="1" stopColor="#E39A12" />
        </LinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="#B8760A" />
      <Circle cx={12} cy={11.4} r={10.2} fill="url(#coinFace)" />
      <Circle cx={12} cy={11.4} r={7.6} fill="none" stroke="#FFF1C2" strokeOpacity={0.6} strokeWidth={0.9} />
      <G>
        <Path d="M12 6.6 L16.4 9 L12 11.4 L7.6 9 Z" fill="#FFF6DA" />
        <Path d="M7.6 9 L12 11.4 L12 16.2 L7.6 13.8 Z" fill="#C88410" />
        <Path d="M16.4 9 L12 11.4 L12 16.2 L16.4 13.8 Z" fill="#E7A21E" />
      </G>
    </Svg>
  );
});

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
});
