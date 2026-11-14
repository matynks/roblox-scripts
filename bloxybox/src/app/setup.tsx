import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { LogoMark, Wordmark } from '@/components/brand/Brand';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { connectBackend } from '@/features/auth/bootstrap';
import { saveDeviceConfig, validateBackendConfig, type BackendConfig } from '@/lib/config';
import { colors, spacing } from '@/theme/tokens';

async function probe(config: BackendConfig): Promise<string | null> {
  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/is_username_available`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_username: 'connection_check' }),
    });
    if (response.ok) return null;
    if (response.status === 401 || response.status === 403) return 'The server rejected this key. Check the anon key.';
    if (response.status === 404) {
      return 'Connected, but the BloxyBox database is not set up on this project yet. Apply the migrations first.';
    }
    return `The server responded with an error (HTTP ${response.status}).`;
  } catch {
    return "Couldn't reach that server. Check the URL and your connection.";
  }
}

export default function SetupScreen() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const validation = validateBackendConfig(url, anonKey);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const candidate: BackendConfig = { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim(), source: 'device' };
      const problem = await probe(candidate);
      if (problem) {
        setError(problem);
        return;
      }
      const saved = await saveDeviceConfig(candidate.url, candidate.anonKey);
      await connectBackend(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save these settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Screen bottomInset>
        <View style={styles.hero}>
          <LogoMark size={64} />
          <Wordmark size="display" />
          <AppText variant="body" color={colors.textSecondary} align="center">
            Connect BloxyBox to its server to get started.
          </AppText>
        </View>

        <Card>
          <View style={styles.form}>
            <AppText variant="subheading">Server setup</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Enter your Supabase project URL and its public anon key (Project Settings → API). Never use the
              service_role key in the app.
            </AppText>
            <Input
              label="Project URL"
              value={url}
              onChangeText={setUrl}
              placeholder="https://your-project.supabase.co"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
            />
            <Input
              label="Anon (public) key"
              value={anonKey}
              onChangeText={setAnonKey}
              placeholder="eyJhbGciOi… or sb_publishable_…"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
              style={styles.keyInput}
            />
            {error ? (
              <AppText variant="caption" color={colors.danger}>
                {error}
              </AppText>
            ) : null}
            <Button label="Connect" icon="link" loading={busy} onPress={submit} fullWidth />
          </View>
        </Card>

        <AppText variant="caption" color={colors.textMuted} align="center">
          These settings are stored encrypted on this device. Builds made with a .env file skip this step.
        </AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  keyInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
});
