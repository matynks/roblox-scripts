import { forwardRef, useState } from 'react';
import { Pressable, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { fonts, radius, space, useTheme } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string | null;
  icon?: IconName;
  secureToggle?: boolean;
  right?: React.ReactNode;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, hint, icon, secureToggle, secureTextEntry, right, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const borderColor = error ? t.danger : focused ? t.primary : t.border;
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: space.sm,
          backgroundColor: t.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor,
          paddingHorizontal: space.md,
          minHeight: 50,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={focused ? t.primary : t.textFaint} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={t.textFaint}
          selectionColor={t.primary}
          secureTextEntry={hidden}
          multiline={multiline}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            { flex: 1, color: t.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: multiline ? 12 : 10, minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' },
            style,
          ]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={10} onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.textFaint} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
