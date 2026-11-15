import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import { validatePassword } from '@/domain/validation';
import { useSession } from '@/state/session';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

export default function ResetPassword() {
  const t = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const { recovering, setRecovering, session } = useSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step: 'code' | 'password' = recovering && session ? 'password' : 'code';

  const verify = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from the email.');
    setLoading(true);
    setError(null);
    // Mark recovery first so the navigator keeps us here once the code signs us in.
    setRecovering(true);
    try {
      await backend.verifyRecoveryCode(params.email ?? '', code);
    } catch (e) {
      setRecovering(false);
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const v = validatePassword(password);
    if (!v.ok) return setError(v.message);
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    setError(null);
    try {
      await backend.updatePassword(password);
      toast.success('Password updated', 'You are signed in with your new password.');
      setRecovering(false);
      router.replace('/home');
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard header={<Header title={step === 'code' ? 'Check your email' : 'Choose a new password'} />} testID="reset-screen">
      <View style={{ alignItems: 'center', paddingVertical: space.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={step === 'code' ? 'mail-open' : 'lock-closed'} size={34} color={t.primary} />
        </View>
      </View>
      {step === 'code' ? (
        <>
          <Text variant="body" tone="muted" align="center">
            If an account exists for {params.email || 'that email'}, we sent a 6-digit code. It expires in one hour.
          </Text>
          <TextField label="Reset code" testID="reset-code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} icon="keypad-outline" placeholder="123456" style={{ letterSpacing: 6, fontSize: 20 }} error={error} onSubmitEditing={verify} />
          <Button title="Verify code" size="lg" fullWidth loading={loading} onPress={verify} testID="reset-verify" />
          <Button title="Send a new code" variant="ghost" onPress={() => router.replace({ pathname: '/forgot-password', params: { email: params.email } })} />
        </>
      ) : (
        <>
          <TextField label="New password" testID="reset-password" value={password} onChangeText={setPassword} secureTextEntry secureToggle autoCapitalize="none" icon="lock-closed-outline" />
          <TextField label="Confirm new password" testID="reset-confirm" value={confirm} onChangeText={setConfirm} secureTextEntry secureToggle autoCapitalize="none" icon="lock-closed-outline" error={error} onSubmitEditing={save} />
          <Button title="Save password" size="lg" fullWidth loading={loading} onPress={save} testID="reset-save" />
        </>
      )}
    </Screen>
  );
}
