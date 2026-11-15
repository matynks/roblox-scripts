import { Pressable, ScrollView, View } from 'react-native';

import { haptic } from './haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export interface ChipOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  count?: number;
}

export function ChipRow<V extends string>({ options, value, onChange, testIDPrefix = 'chip' }: { options: ChipOption<V>[]; value: V; onChange: (v: V) => void; testIDPrefix?: string }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }} style={{ flexGrow: 0 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: active ? t.primary : pressed ? t.surfacePressed : t.surfaceAlt, borderWidth: active ? 0 : 1, borderColor: t.border })}
          >
            {o.icon ? <Icon name={o.icon} size={15} color={active ? '#fff' : t.textMuted} /> : null}
            <Text variant="caption" color={active ? '#fff' : t.textMuted} style={{ fontFamily: 'Nunito_800ExtraBold' }}>
              {o.label}
            </Text>
            {o.count != null ? (
              <View style={{ minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? 'rgba(255,255,255,0.25)' : t.surfacePressed, alignItems: 'center' }}>
                <Text variant="small" color={active ? '#fff' : t.textFaint} style={{ fontSize: 10.5 }}>
                  {o.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<V extends string>({ options, value, onChange, testIDPrefix = 'seg' }: { options: ChipOption<V>[]; value: V; onChange: (v: V) => void; testIDPrefix?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: 4, gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={{ flex: 1, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: active ? t.bgElevated : 'transparent' }}
          >
            {o.icon ? <Icon name={o.icon} size={14} color={active ? t.text : t.textFaint} /> : null}
            <Text variant="caption" tone={active ? 'default' : 'faint'} style={{ fontFamily: 'Nunito_800ExtraBold' }} numberOfLines={1}>
              {o.label}
              {o.count ? ` ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
