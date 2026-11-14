import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { checkUsernameAvailable, signUp } from '@/features/auth/auth';
import { normaliseUsername, validateSignUp, validateUsername, type FieldErrors, type SignUpInput } from '@/features/auth/validation';
import { colors, spacing } from '@/theme/tokens';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'unknown';

export default function SignUpScreen() {
  const [form, setForm] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<FieldErrors<SignUpInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ username: string; result: 'available' | 'taken' | 'unknown' } | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const update = (key: keyof SignUpInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Debounced username availability check. "checking" is derived: the latest
  // result belongs to a different username than the one typed.
  const normalised = normaliseUsername(form.username);
  const usernameValid = !validateUsername(normalised);
  const availability: Availability = !usernameValid
    ? 'idle'
    : check?.username === normalised
      ? check.result
      : 'checking';

  useEffect(() => {
    if (!usernameValid) return;
    let active = true;
    const timer = setTimeout(() => {
      checkUsernameAvailable(normalised)
        .then((ok) => active && setCheck({ username: normalised, result: ok ? 'available' : 'taken' }))
        .catch(() => active && setCheck({ username: normalised, result: 'unknown' }));
    }, 450);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalised, usernameValid]);

  const submit = async () => {
    const fieldErrors = validateSignUp(form);
    if (availability === 'taken') fieldErrors.username = 'That username is already taken.';
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0) return;

    setBusy(true);
    try {
      const outcome = await signUp(form);
      if (outcome.status === 'confirm-email') setConfirmEmail(outcome.email);
    } catch (e) {
      const appError = toAppError(e);
      if (appError.code === 'USERNAME_TAKEN') {
        setErrors((prev) => ({ ...prev, username: appError.message }));
      } else {
        setFormError(appError.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (confirmEmail) {
    return (
      <Screen title="Check your inbox" back bottomInset>
        <Card tone="primary">
          <View style={styles.confirm}>
            <Ionicons name="mail-unread-outline" size={40} color={colors.primary} />
            <AppText variant="subheading" align="center">
              Confirm your email
            </AppText>
            <AppText variant="body" color={colors.textSecondary} align="center">
              We sent a confirmation link to {confirmEmail}. Open it, then come back and sign in.
            </AppText>
          </View>
        </Card>
        <Button label="Go to sign in" size="lg" fullWidth onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  const usernameHelper =
    availability === 'checking'
      ? 'Checking availability…'
      : availability === 'available'
        ? 'Username is available'
        : availability === 'unknown'
          ? "Couldn't check availability right now"
          : '3–20 characters: lowercase letters, numbers, underscores';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Screen title="Create your account" subtitle="Start with 500 BoxCoins" back bottomInset>
        <View style={styles.form}>
          <Input
            label="Username"
            value={form.username}
            onChangeText={(v) => update('username')(v.toLowerCase())}
            error={errors.username ?? (availability === 'taken' ? 'That username is already taken.' : null)}
            helper={usernameHelper}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Input
            label="Display name"
            value={form.displayName}
            onChangeText={update('displayName')}
            error={errors.displayName}
            maxLength={30}
          />
          <Input
            label="Email"
            value={form.email}
            onChangeText={update('email')}
            error={errors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={form.password}
            onChangeText={update('password')}
            error={errors.password}
            helper="At least 8 characters with a letter and a number"
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={update('confirmPassword')}
            error={errors.confirmPassword}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
          />
          {formError ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="assertive">
              {formError}
            </AppText>
          ) : null}
          <Button label="Create account" size="lg" loading={busy} onPress={submit} fullWidth testID="sign-up-submit" />
          <AppText variant="caption" color={colors.textMuted} align="center">
            BloxyBox is a simulation. BoxCoins, followers and stats exist only inside this app.
          </AppText>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { gap: spacing.lg, paddingTop: spacing.md },
  confirm: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
});
