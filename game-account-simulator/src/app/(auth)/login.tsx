import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type TextInputInstance, View } from 'react-native';

import { backend, isOnline } from '@/api';
import { toAppError } from '@/api/errors';
import { validateEmail } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { haptic } from '@/ui/haptics';
import { LogoMark } from '@/ui/Logo';
import { Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { space, useTheme } from '@/ui/theme';

export default function Login() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    if (!validateEmail(email).ok || !password) {
      setError('Enter your email and password.');
      haptic.warning();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await backend.signIn(email, password);
      haptic.success();
      router.replace('/home');
    } catch (e) {
      const err = toAppError(e);
      haptic.error();
      if (err.code === 'EMAIL_NOT_CONFIRMED') {
        router.push({ pathname: '/confirm-email', params: { email: email.trim() } });
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard header={<Header title="Welcome back" />} testID="login-screen">
      <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
        <LogoMark size={64} />
      </View>
      <TextField
        label="Email"
        testID="login-email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        icon="mail-outline"
        placeholder="you@example.com"
        returnKeyType="next"
        onSubmitEditing={() => pwRef.current?.focus()}
      />
      <TextField
        ref={pwRef}
        label="Password"
        testID="login-password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        icon="lock-closed-outline"
        placeholder="Your password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Text variant="caption" tone="primary" style={{ alignSelf: 'flex-end', fontFamily: 'Nunito_800ExtraBold' }} onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} accessibilityRole="link">
        Forgot password?
      </Text>
      {error ? (
        <View style={{ backgroundColor: t.dangerSoft, borderRadius: 12, padding: space.md }} accessibilityRole="alert">
          <Text variant="caption" tone="danger" testID="login-error">
            {error}
          </Text>
        </View>
      ) : null}
      <Button title="Sign in" size="lg" fullWidth loading={loading} onPress={submit} testID="login-submit" />
      <Row justify="center" gap={4}>
        <Text variant="caption" tone="muted">
          New to Blockora?
        </Text>
        <Text variant="caption" tone="primary" style={{ fontFamily: 'Nunito_800ExtraBold' }} onPress={() => router.replace('/register')}>
          Create an account
        </Text>
      </Row>
      {!isOnline ? (
        <Text variant="small" tone="faint" align="center">
          Offline mode: accounts are stored securely on this device only.
        </Text>
      ) : null}
    </Screen>
  );
}
