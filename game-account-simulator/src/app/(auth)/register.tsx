import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, type TextInputInstance, View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import { TermsSheet } from '@/components/TermsSheet';
import { passwordStrength, validateDisplayName, validateEmail, validatePassword, validateUsername } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { haptic } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { space, useTheme } from '@/ui/theme';

type Avail = { state: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'error'; message?: string };

export default function Register() {
  const t = useTheme();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [avail, setAvail] = useState<Avail>({ state: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const pwRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  // Debounced, server-side username availability check.
  useEffect(() => {
    const v = username.trim();
    if (!v) return setAvail({ state: 'idle' });
    const local = validateUsername(v);
    if (!local.ok) return setAvail({ state: 'invalid', message: local.message });
    setAvail({ state: 'checking' });
    const h = setTimeout(() => {
      backend
        .checkUsername(v)
        .then((r) => setAvail(r.available ? { state: 'ok' } : { state: r.reason === 'USERNAME_TAKEN' ? 'taken' : 'invalid', message: r.reason === 'USERNAME_TAKEN' ? 'That username is taken.' : undefined }))
        .catch(() => setAvail({ state: 'error', message: "Couldn't check availability." }));
    }, 400);
    return () => clearTimeout(h);
  }, [username]);

  const errors = {
    username: avail.state === 'invalid' || avail.state === 'taken' ? avail.message ?? 'Invalid username' : null,
    displayName: displayName.trim() && !validateDisplayName(displayName).ok ? (validateDisplayName(displayName) as any).message : null,
    email: !validateEmail(email).ok ? (validateEmail(email) as any).message : null,
    password: !validatePassword(password).ok ? (validatePassword(password) as any).message : null,
    confirm: confirm !== password ? 'Passwords do not match.' : null,
  };
  const canSubmit = avail.state === 'ok' && !errors.displayName && !errors.email && !errors.password && !errors.confirm && terms && !submitting;
  const strength = passwordStrength(password);

  const submit = async () => {
    setTouched({ username: true, displayName: true, email: true, password: true, confirm: true });
    if (!canSubmit) {
      haptic.warning();
      if (!terms) setFormError('Please accept the terms to continue.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const r = await backend.signUp({ email, password, username: username.trim(), displayName: displayName.trim() || username.trim() });
      haptic.success();
      if (r.needsEmailConfirmation) router.replace({ pathname: '/confirm-email', params: { email: email.trim() } });
      else router.replace('/home');
    } catch (e) {
      const err = toAppError(e);
      haptic.error();
      if (err.code === 'USERNAME_TAKEN') setAvail({ state: 'taken', message: err.message });
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availIcon =
    avail.state === 'checking' ? <ActivityIndicator size="small" color={t.textFaint} /> : avail.state === 'ok' ? <Icon name="checkmark-circle" size={20} color={t.success} /> : avail.state === 'taken' || avail.state === 'invalid' ? <Icon name="close-circle" size={20} color={t.danger} /> : null;

  return (
    <Screen keyboard header={<Header title="Create your account" subtitle="It takes less than a minute" />} testID="register-screen">
      <TextField
        label="Username"
        testID="reg-username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        maxLength={20}
        icon="at"
        right={availIcon}
        placeholder="CoolBuilder42"
        onBlur={() => setTouched((x) => ({ ...x, username: true }))}
        error={username ? errors.username : null}
        hint={avail.state === 'ok' ? 'Available!' : '3–20 letters or numbers, one optional underscore. This is your unique @handle.'}
        returnKeyType="next"
      />
      <TextField
        label="Display name (optional)"
        testID="reg-display"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={20}
        icon="person-outline"
        placeholder={username || 'How others see you'}
        error={touched.displayName ? errors.displayName : null}
        hint="Shown on your profile. You can change it every 7 days."
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        testID="reg-email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        icon="mail-outline"
        placeholder="you@example.com"
        onBlur={() => setTouched((x) => ({ ...x, email: true }))}
        error={touched.email ? errors.email : null}
        hint="Never shown to other players. Used to sign in and recover your account."
        returnKeyType="next"
        onSubmitEditing={() => pwRef.current?.focus()}
      />
      <View style={{ gap: 8 }}>
        <TextField
          ref={pwRef}
          label="Password"
          testID="reg-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          secureToggle
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          onBlur={() => setTouched((x) => ({ ...x, password: true }))}
          error={touched.password ? errors.password : null}
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        {password ? (
          <Row gap={4} accessibilityLabel={`Password strength ${['very weak', 'weak', 'fair', 'good', 'strong'][strength]}`}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < strength ? [t.danger, t.warning, t.accent, t.success][strength - 1] : t.surfacePressed }} />
            ))}
            <Text variant="small" tone="faint" style={{ marginLeft: 6, width: 54 }}>
              {['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]}
            </Text>
          </Row>
        ) : null}
      </View>
      <TextField
        ref={confirmRef}
        label="Confirm password"
        testID="reg-confirm"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        icon="lock-closed-outline"
        placeholder="Type it again"
        onBlur={() => setTouched((x) => ({ ...x, confirm: true }))}
        error={touched.confirm && confirm ? errors.confirm : null}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Pressable
        testID="reg-terms"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        onPress={() => {
          haptic.tap();
          setTerms((v) => !v);
          setFormError(null);
        }}
        style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: terms ? t.primary : t.borderStrong, backgroundColor: terms ? t.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          {terms ? <Icon name="checkmark" size={16} color="#fff" /> : null}
        </View>
        <Text variant="caption" tone="muted" style={{ flex: 1 }}>
          I agree to the{' '}
          <Text variant="caption" tone="primary" style={{ fontFamily: 'Nunito_800ExtraBold' }} onPress={() => setShowTerms(true)} suppressHighlighting>
            Terms & Privacy
          </Text>{' '}
          and understand Blockora is a simulator: Orbs, items and stats are simulated and have no real-world value.
        </Text>
      </Pressable>
      {formError ? (
        <View style={{ backgroundColor: t.dangerSoft, borderRadius: 12, padding: space.md }} accessibilityRole="alert">
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        </View>
      ) : null}
      <Button title="Create account" size="lg" fullWidth loading={submitting} disabled={!canSubmit} onPress={submit} testID="reg-submit" />
      <Row justify="center" gap={4}>
        <Text variant="caption" tone="muted">
          Already playing?
        </Text>
        <Text variant="caption" tone="primary" style={{ fontFamily: 'Nunito_800ExtraBold' }} onPress={() => router.replace('/login')}>
          Sign in
        </Text>
      </Row>
      <TermsSheet visible={showTerms} onClose={() => setShowTerms(false)} onAccept={() => { setTerms(true); setShowTerms(false); }} />
    </Screen>
  );
}
