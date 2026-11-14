import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type InputProps = TextInputProps & {
  label: string;
  error?: string | null;
  helper?: string;
  secureToggle?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, secureToggle, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          { borderColor: error ? colors.danger : focused ? colors.primary : colors.border },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            style={styles.toggle}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color={colors.textMuted}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs + 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily,
    fontSize: 16,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    height: '100%',
    justifyContent: 'center',
  },
});
