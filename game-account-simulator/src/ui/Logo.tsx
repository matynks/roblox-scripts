import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Row } from './primitives';
import { Text } from './Text';

/** Blockora mark: an isometric block with an orb facet (original artwork). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Blockora">
      <Defs>
        <LinearGradient id="lmTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A78BFA" />
          <Stop offset="1" stopColor="#7C5CFF" />
        </LinearGradient>
        <LinearGradient id="lmLeft" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6D4CF5" />
          <Stop offset="1" stopColor="#4C2FD8" />
        </LinearGradient>
        <LinearGradient id="lmRight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#22D3EE" />
          <Stop offset="1" stopColor="#0891B2" />
        </LinearGradient>
      </Defs>
      <Path d="M24 4 42 14 24 24 6 14Z" fill="url(#lmTop)" />
      <Path d="M6 14 24 24V44L6 34Z" fill="url(#lmLeft)" />
      <Path d="M42 14 24 24V44L42 34Z" fill="url(#lmRight)" />
      <Path d="M24 10.5 31 14.4 24 18.3 17 14.4Z" fill="#FFC53D" />
      <Path d="M24 4 42 14 24 24 6 14Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
    </Svg>
  );
}

export function Logo({ size = 34, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <Row gap={10}>
      <LogoMark size={size} />
      {showWordmark ? (
        <Text variant="title" style={{ fontSize: size * 0.72, lineHeight: size * 0.9, letterSpacing: -0.4 }}>
          Blockora
        </Text>
      ) : null}
    </Row>
  );
}
