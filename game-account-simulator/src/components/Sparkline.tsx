import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Row } from '@/ui/primitives';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Small area chart for price history (values oldest → newest). */
export function Sparkline({ values, width, height = 90, color, label }: { values: number[]; width: number; height?: number; color?: string; label?: (v: number) => string }) {
  const t = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = color ?? t.accent;
  if (values.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="caption" tone="faint">
          Not enough sales yet
        </Text>
      </View>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]} ${height} L${pts[0][0]} ${height}Z`;
  const last = pts[pts.length - 1];
  const fmt = label ?? ((v: number) => v.toLocaleString('en-US'));
  const change = ((values[values.length - 1] - values[0]) / Math.max(values[0], 1)) * 100;
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Price trend ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} percent`}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity={0.35} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#sp${id})`} />
        <Path d={line} stroke={c} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={4} fill={c} />
      </Svg>
      <Row justify="space-between">
        <Text variant="small" tone="faint">
          Low {fmt(min)}
        </Text>
        <Text variant="small" tone={change >= 0 ? 'success' : 'danger'}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% · 30 days
        </Text>
        <Text variant="small" tone="faint">
          High {fmt(max)}
        </Text>
      </Row>
    </View>
  );
}
