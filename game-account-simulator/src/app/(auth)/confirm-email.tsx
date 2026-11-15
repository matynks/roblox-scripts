import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

export default function ConfirmEmail() {
  const t = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [sending, setSending] = useState(false);
  return (
    <Screen header={<Header title="Confirm your email" />} testID="confirm-screen">
      <View style={{ alignItems: 'center', gap: space.lg, paddingTop: space.xl }}>
        <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail-unread" size={40} color={t.accent} />
        </View>
        <Text variant="title" align="center">
          One last step
        </Text>
        <Text variant="body" tone="muted" align="center">
          We sent a confirmation link to {email || 'your email'}. Open it on this phone to activate your account, then sign in.
        </Text>
      </View>
      <Button title="I've confirmed — sign in" size="lg" fullWidth onPress={() => router.replace('/login')} />
      <Button
        title="Resend email"
        variant="secondary"
        fullWidth
        loading={sending}
        onPress={async () => {
          setSending(true);
          try {
            await backend.resendConfirmation(email ?? '');
            toast.success('Email sent', 'Check your inbox and spam folder.');
          } catch (e) {
            toast.error("Couldn't resend", toAppError(e).message);
          } finally {
            setSending(false);
          }
        }}
      />
    </Screen>
  );
}
