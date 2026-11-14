import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { signIn } from '@/features/auth/auth';
import { validateSignIn } from '@/features/auth/validation';
import { colors, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    const fieldErrors = validateSignIn(email, password);
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0) return;
    setBusy(true);
    try {
      await signIn(email, password);
      // The root navigator switches to the app as soon as the session arrives.
    } catch (e) {
      setFormError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Screen title="Welcome back" subtitle="Sign in to your BloxyBox account" back bottomInset>
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureToggle
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {formError ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="assertive">
              {formError}
            </AppText>
          ) : null}
          <Button label="Sign in" size="lg" loading={busy} onPress={submit} fullWidth testID="sign-in-submit" />
          <Button label="New here? Create an account" variant="ghost" onPress={() => router.replace('/sign-up')} fullWidth />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { gap: spacing.lg, paddingTop: spacing.md },
});
