import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { backend, isOnline } from '@/api';
import { toAppError } from '@/api/errors';
import type { Settings, Visibility } from '@/api/types';
import { validatePassword } from '@/domain/validation';
import { useMe } from '@/hooks/queries';
import { useSession } from '@/state/session';
import { usePrefs } from '@/state/prefs';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { haptic } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { Card, Divider, ListRow, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Sheet, useConfirm } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" tone="muted" style={{ paddingLeft: space.xs }}>
        {title}
      </Text>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

function SwitchRow({ title, subtitle, value, onChange, testID }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const t = useTheme();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      right={<Switch testID={testID} value={value} onValueChange={(v) => { haptic.tap(); onChange(v); }} trackColor={{ true: t.primary, false: t.surfacePressed }} thumbColor="#fff" accessibilityLabel={title} />}
    />
  );
}

const VIS: { value: Visibility; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'nobody', label: 'Only me' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const me = useMe();
  const { session } = useSession();
  const prefs = usePrefs();
  const { confirm, element } = useConfirm();
  const [pwSheet, setPwSheet] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const s = me.data?.settings;
  const isDev = !!me.data?.access.is_developer;

  const update = async (patch: Partial<Settings>) => {
    qc.setQueryData(['me'], (old: any) => (old ? { ...old, settings: { ...old.settings, ...patch } } : old));
    try {
      await backend.updateSettings(patch);
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      toast.error("Couldn't save setting", toAppError(e).message);
      qc.invalidateQueries({ queryKey: ['me'] });
    }
  };

  const openDeveloperTools = async () => {
    // The entry point is cosmetic; the server re-checks the role on every Modify Menu call.
    try {
      const a = await backend.getAccess();
      if (a.is_developer) router.push('/modify');
    } catch {
      /* silent for non-developers */
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const maskedEmail = session?.email ? session.email.replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2') : '—';

  return (
    <Screen header={<Header title="Settings" />} testID="settings-screen">
      <Group title="Account">
        <ListRow icon="mail" title="Email" subtitle={maskedEmail} />
        <Divider inset={62} />
        <ListRow icon="key" title="Change password" onPress={() => setPwSheet(true)} testID="change-password" />
        <Divider inset={62} />
        <ListRow icon="person-circle" title="Edit profile" onPress={() => router.push('/edit-profile')} />
      </Group>

      {s ? (
        <Group title="Privacy">
          <View style={{ padding: space.lg, gap: space.md }}>
            {(
              [
                ['inventory_visibility', 'Who can see my inventory'],
                ['friends_visibility', 'Who can see my friends & followers'],
                ['activity_visibility', 'Who can see my activity'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={{ gap: 8 }}>
                <Text variant="bodyStrong">{label}</Text>
                <Segmented testIDPrefix={key} value={s[key]} onChange={(v) => update({ [key]: v } as Partial<Settings>)} options={VIS} />
              </View>
            ))}
          </View>
          <Divider />
          <SwitchRow title="Allow friend requests" value={s.allow_friend_requests} onChange={(v) => update({ allow_friend_requests: v })} testID="allow-requests" />
          <Divider />
          <SwitchRow title="Show when I'm online" value={s.show_online_status} onChange={(v) => update({ show_online_status: v })} />
          <Divider />
          <ListRow icon="ban" iconColor={t.danger} title="Blocked players" onPress={() => router.push('/blocked')} />
        </Group>
      ) : null}

      {s ? (
        <Group title="Notifications">
          <SwitchRow title="New followers" subtitle="Friend requests always notify you" value={s.notify_social} onChange={(v) => update({ notify_social: v })} />
          <Divider />
          <SwitchRow title="Rewards & quests" value={s.notify_rewards} onChange={(v) => update({ notify_rewards: v })} />
        </Group>
      ) : null}

      <Group title="Appearance & device">
        <View style={{ padding: space.lg, gap: 8 }}>
          <Text variant="bodyStrong">Theme</Text>
          <Segmented testIDPrefix="theme" value={prefs.theme} onChange={(v) => prefs.set({ theme: v })} options={[{ value: 'system', label: 'System', icon: 'phone-portrait' }, { value: 'dark', label: 'Dark', icon: 'moon' }, { value: 'light', label: 'Light', icon: 'sunny' }]} />
        </View>
        <Divider />
        <SwitchRow title="Haptic feedback" value={prefs.haptics} onChange={(v) => prefs.set({ haptics: v })} />
        <Divider />
        <SwitchRow title="Reduce motion" subtitle="Turn off idle and celebration animations" value={prefs.reduceMotion} onChange={(v) => prefs.set({ reduceMotion: v })} />
      </Group>

      {isDev ? (
        <Group title="Developer">
          <ListRow icon="construct" iconColor={t.warning} title="Modify Menu" subtitle={`Role: ${me.data?.access.role} · actions are audited`} onPress={() => router.push('/modify')} testID="open-modify" />
        </Group>
      ) : null}

      <Group title="About">
        <Pressable onLongPress={openDeveloperTools} delayLongPress={900} accessibilityRole="text" testID="version-row">
          <ListRow icon="information-circle" title={`Blockora ${version}`} subtitle={isOnline ? 'Connected to the Blockora server' : 'Offline mode — your progress is saved on this device'} />
        </Pressable>
        <Divider inset={62} />
        <View style={{ padding: space.lg }}>
          <Text variant="caption" tone="muted">
            Blockora is an independent game-account simulator and is not affiliated with, endorsed by or connected to Roblox Corporation. Orbs are simulated currency with no monetary value and cannot be bought, sold or exchanged.
          </Text>
        </View>
      </Group>

      <Button
        title="Sign out"
        icon="log-out-outline"
        variant="secondary"
        fullWidth
        testID="sign-out"
        onPress={async () => {
          if (await confirm({ title: 'Sign out?', message: isOnline ? 'You can sign back in any time.' : 'Your offline progress stays on this device.', confirmLabel: 'Sign out', icon: 'log-out' })) {
            await backend.signOut();
            qc.clear();
          }
        }}
      />

      <Sheet
        visible={pwSheet}
        onClose={() => setPwSheet(false)}
        title="Change password"
        footer={
          <Button
            title="Update password"
            fullWidth
            loading={pwBusy}
            onPress={async () => {
              const v = validatePassword(pw);
              if (!v.ok) return setPwErr(v.message);
              if (pw !== pw2) return setPwErr('Passwords do not match.');
              setPwBusy(true);
              try {
                await backend.updatePassword(pw);
                toast.success('Password updated');
                setPwSheet(false);
                setPw('');
                setPw2('');
                setPwErr(null);
              } catch (e) {
                setPwErr(toAppError(e).message);
              } finally {
                setPwBusy(false);
              }
            }}
          />
        }
      >
        <TextField label="New password" value={pw} onChangeText={setPw} secureTextEntry secureToggle autoCapitalize="none" />
        <TextField label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry secureToggle autoCapitalize="none" error={pwErr} />
        <Row gap={6}>
          <Icon name="shield-checkmark" size={14} color={t.success} />
          <Text variant="small" tone="faint">
            At least 8 characters with letters and numbers.
          </Text>
        </Row>
      </Sheet>
      {element}
    </Screen>
  );
}
