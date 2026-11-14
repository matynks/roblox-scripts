import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import { LogoMark, Wordmark } from '@/components/brand/Brand';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider, ListRow, SwitchRow } from '@/components/ui/Controls';
import { Sheet } from '@/components/ui/Overlays';
import { Screen } from '@/components/ui/Screen';
import { signOut } from '@/features/auth/auth';
import { devWhoAmI } from '@/features/dev/api';
import { initialSequenceState, registerLongPress, registerTap } from '@/features/dev/sequence';
import { useProfileSummary } from '@/features/social/api';
import { clearDeviceConfig, describeHost } from '@/lib/config';
import { haptics } from '@/lib/haptics';
import { usePreferences } from '@/stores/preferences';
import { useSessionStore, useUserId } from '@/stores/session';
import { toast } from '@/stores/toast';
import { colors, spacing } from '@/theme/tokens';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD = Constants.expoConfig?.android?.versionCode ?? 1;

export default function SettingsScreen() {
  const userId = useUserId();
  const email = useSessionStore((s) => s.session?.user.email ?? '');
  const backend = useSessionStore((s) => s.backend);
  const profile = useProfileSummary(userId);
  const prefs = usePreferences();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmServer, setConfirmServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(initialSequenceState);

  // Hidden Modify Menu: tap the build number 7 times, then long-press the logo.
  // The sequence only asks the server; the server decides (developer role).
  const onBuildTap = () => {
    const next = registerTap(sequence.current, Date.now());
    sequence.current = next.state;
    if (next.armed) haptics.medium();
  };

  const onLogoLongPress = async () => {
    const next = registerLongPress(sequence.current, Date.now());
    sequence.current = next.state;
    if (!next.triggered) return;
    try {
      if (await devWhoAmI()) {
        haptics.success();
        router.push('/dev');
      }
      // Non-developers get no feedback at all.
    } catch {
      // Ignore: offline or server error. Nothing is revealed.
    }
  };

  const doSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      toast.error("Couldn't sign out", toAppError(e).message);
    } finally {
      setBusy(false);
      setConfirmSignOut(false);
    }
  };

  const changeServer = async () => {
    setBusy(true);
    try {
      await signOut().catch(() => undefined);
      await clearDeviceConfig();
      useSessionStore.getState().setBoot('needs-setup', null);
    } finally {
      setBusy(false);
      setConfirmServer(false);
    }
  };

  return (
    <Screen back title="Settings" bottomInset>
      <Card padded={false}>
        <ListRow
          icon="person-circle-outline"
          title={profile.data ? `${profile.data.display_name} (@${profile.data.username})` : 'Your account'}
          subtitle={email}
          chevron={false}
        />
        <Divider />
        <ListRow icon="create-outline" title="Edit profile" subtitle="Display name, bio, accent, username" onPress={() => router.push('/settings/edit-profile')} />
        <Divider />
        <ListRow icon="wallet-outline" title="Wallet & transactions" onPress={() => router.push('/wallet')} />
        <Divider />
        <ListRow icon="ticket-outline" title="My Game Passes" onPress={() => router.push('/passes')} />
      </Card>

      <AppText variant="subheading">Preferences</AppText>
      <Card padded={false}>
        <SwitchRow icon="phone-portrait-outline" title="Haptic feedback" value={prefs.haptics} onValueChange={prefs.setHaptics} />
        <Divider />
        <SwitchRow
          icon="eye-outline"
          title="Show simulated breakdown"
          subtitle="Explain which follower numbers are simulated"
          value={prefs.showSimulatedBreakdown}
          onValueChange={prefs.setShowSimulatedBreakdown}
        />
        <Divider />
        <SwitchRow
          icon="speedometer-outline"
          title="Reduce motion"
          subtitle="Fewer screen-shake and particle effects in games"
          value={prefs.reduceMotion}
          onValueChange={prefs.setReduceMotion}
        />
      </Card>

      <AppText variant="subheading">Server</AppText>
      <Card padded={false}>
        <ListRow
          icon="server-outline"
          title={backend ? describeHost(backend.url) : 'Not connected'}
          subtitle={backend?.source === 'build' ? 'Configured in this build' : 'Configured on this device'}
          chevron={false}
        />
        {backend?.source === 'device' ? (
          <>
            <Divider />
            <ListRow icon="swap-horizontal-outline" title="Change server" onPress={() => setConfirmServer(true)} />
          </>
        ) : null}
      </Card>

      <AppText variant="subheading">About</AppText>
      <Card>
        <Pressable
          accessibilityRole="image"
          accessibilityLabel="BloxyBox"
          onLongPress={onLogoLongPress}
          delayLongPress={700}
          style={styles.about}
        >
          <LogoMark size={52} />
          <Wordmark />
        </Pressable>
        <AppText variant="caption" color={colors.textSecondary} align="center">
          An original account-simulator playground. BloxyBox is not affiliated with any other game platform.
          BoxCoins, followers and other stats are simulated and have no real-world value.
        </AppText>
        <Pressable
          accessibilityRole="text"
          accessibilityLabel={`Version ${VERSION}, build ${BUILD}`}
          onPress={onBuildTap}
          style={styles.version}
          testID="build-number"
        >
          <AppText variant="caption" color={colors.textMuted} align="center">
            Version {VERSION} · build {BUILD}
          </AppText>
        </Pressable>
      </Card>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={() => setConfirmSignOut(true)} fullWidth />

      <Sheet visible={confirmSignOut} onClose={() => setConfirmSignOut(false)} dismissable={!busy}>
        <AppText variant="heading">Sign out?</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Your progress is saved on the server. Saved data on this device will be cleared.
        </AppText>
        <View style={styles.sheetActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirmSignOut(false)} style={styles.flex} disabled={busy} />
          <Button label="Sign out" variant="danger" onPress={doSignOut} loading={busy} style={styles.flex} />
        </View>
      </Sheet>

      <Sheet visible={confirmServer} onClose={() => setConfirmServer(false)} dismissable={!busy}>
        <AppText variant="heading">Change server?</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          You’ll be signed out and asked for a new server URL and key.
        </AppText>
        <View style={styles.sheetActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirmServer(false)} style={styles.flex} disabled={busy} />
          <Button label="Change" variant="danger" onPress={changeServer} loading={busy} style={styles.flex} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  about: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  version: { paddingTop: spacing.md, paddingBottom: spacing.xs, minHeight: 44, justifyContent: 'center' },
  sheetActions: { flexDirection: 'row', gap: spacing.md },
});
