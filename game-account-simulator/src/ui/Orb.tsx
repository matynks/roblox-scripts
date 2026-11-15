import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Row } from './primitives';
import { Text, type TextVariant } from './Text';
import { useTheme } from './theme';

/** The Orb — Blockora's simulated currency mark (original artwork). */
export function OrbIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Orbs">
      <Defs>
        <LinearGradient id="orbFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="0.55" stopColor="#FFC53D" />
          <Stop offset="1" stopColor="#F59E0B" />
        </LinearGradient>
      </Defs>
      <Path d="M12 1.6 21.2 6.9v10.2L12 22.4 2.8 17.1V6.9Z" fill="url(#orbFill)" stroke="#B86E00" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M12 5.4 17.6 8.6v6.8L12 18.6l-5.6-3.2V8.6Z" fill="#FFF4CC" opacity={0.55} />
      <Path d="M12 5.4 17.6 8.6 12 11.8 6.4 8.6Z" fill="#FFFFFF" opacity={0.65} />
    </Svg>
  );
}

export const formatOrbs = (n: number) => Math.round(n).toLocaleString('en-US');

export function compact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('en-US');
}

/** Amount of simulated currency. `showSim` adds the "SIM" tag that marks Orbs as simulated. */
export function OrbAmount({ amount, variant = 'number', size, showSim = false, color, signed = false, short = false }: { amount: number; variant?: TextVariant; size?: number; showSim?: boolean; color?: string; signed?: boolean; short?: boolean }) {
  const t = useTheme();
  const iconSize = size ?? (variant === 'title' || variant === 'display' ? 24 : variant === 'heading' ? 19 : 16);
  const text = `${signed && amount > 0 ? '+' : ''}${short ? compact(amount) : formatOrbs(amount)}`;
  return (
    <Row gap={5} accessibilityLabel={`${formatOrbs(amount)} Orbs${showSim ? ', simulated currency' : ''}`}>
      <OrbIcon size={iconSize} />
      <Text variant={variant} color={color}>
        {text}
      </Text>
      {showSim ? (
        <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, borderWidth: 1, borderColor: t.borderStrong }}>
          <Text variant="small" tone="faint" style={{ fontSize: 9, lineHeight: 12, letterSpacing: 0.6 }}>
            SIM
          </Text>
        </View>
      ) : null}
    </Row>
  );
}
