import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Row } from './primitives';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export function Sheet({ visible, onClose, title, children, footer, testID }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; testID?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(160)} style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} accessibilityLabel="Close" onPress={onClose} />
          <Animated.View
            testID={testID}
            entering={SlideInDown.springify().damping(18).mass(0.7)}
            style={{
              backgroundColor: t.bgElevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom + space.lg,
              maxHeight: '88%',
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.borderStrong }} />
            </View>
            {title ? (
              <Row justify="space-between" style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
                <Text variant="title" style={{ flex: 1 }}>
                  {title}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
                  <Icon name="close" size={24} color={t.textMuted} />
                </Pressable>
              </Row>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>{footer}</View> : null}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: IconName;
}

/** Promise-based confirmation dialog: `const ok = await confirm({...})`. */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = (o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve }));
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const element = <ConfirmDialog visible={!!state} options={state} onClose={close} />;
  return { confirm, element };
}

function ConfirmDialog({ visible, options, onClose }: { visible: boolean; options: ConfirmOptions | null; onClose: (v: boolean) => void }) {
  const t = useTheme();
  if (!options) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <Animated.View entering={FadeIn.duration(140)} style={{ width: '100%', maxWidth: 380, backgroundColor: t.bgElevated, borderRadius: radius.xl, padding: space.xl, gap: space.md, borderWidth: 1, borderColor: t.border }} accessibilityRole="alert">
          {options.icon ? (
            <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: options.destructive ? t.dangerSoft : t.primarySoft }}>
              <Icon name={options.icon} size={26} color={options.destructive ? t.danger : t.primary} />
            </View>
          ) : null}
          <Text variant="title">{options.title}</Text>
          <Text variant="body" tone="muted">
            {options.message}
          </Text>
          <Row gap={space.sm} style={{ marginTop: space.sm }}>
            <Button title={options.cancelLabel ?? 'Cancel'} variant="secondary" onPress={() => onClose(false)} style={{ flex: 1 }} testID="confirm-cancel" />
            <Button title={options.confirmLabel ?? 'Confirm'} variant={options.destructive ? 'danger' : 'primary'} onPress={() => onClose(true)} style={{ flex: 1 }} testID="confirm-ok" />
          </Row>
        </Animated.View>
      </View>
    </Modal>
  );
}
