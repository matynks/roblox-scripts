import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { backend, isOnline } from '@/api';
import { toAppError } from '@/api/errors';
import { validateEmail } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Card } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { space, useTheme } from '@/ui/theme';

export default function ForgotPassword() {
  const t = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const v = validateEmail(email);
    if (!v.ok) return setError(v.message);
    setLoading(true);
    setError(null);
    try {
      await backend.requestPasswordReset(email);
      router.replace({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard header={<Header title="Reset password" />} testID="forgot-screen">
      <View style={{ alignItems: 'center', paddingVertical: space.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="key" size={34} color={t.primary} />
        </View>
      </View>
      {isOnline ? (
        <>
          <Text variant="body" tone="muted" align="center">
            Enter the email you signed up with. We'll send you a 6-digit code to choose a new password.
          </Text>
          <TextField label="Email" testID="forgot-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" icon="mail-outline" error={error} onSubmitEditing={submit} />
          <Button title="Send reset code" size="lg" fullWidth loading={loading} onPress={submit} testID="forgot-submit" />
          <Text variant="caption" tone="faint" align="center">
            For your security we don't reveal whether an email has an account.
          </Text>
        </>
      ) : (
        <Card>
          <Text variant="bodyStrong">Offline accounts can't be reset by email</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
            This copy of Blockora runs offline, so your account exists only on this device and has no email server to send a code. If you're signed in, you can change your password in Settings.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
