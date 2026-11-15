import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import { PROFILE_THEMES } from '@/content/progression';
import { USERNAME_CHANGE_COST } from '@/domain/rules';
import { validateDisplayName, validateUsername } from '@/domain/validation';
import { invalidateEconomy, patchBalance, useMe } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, GradientFill, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { useConfirm } from '@/ui/Sheet';
import { LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

export default function EditProfile() {
  const t = useTheme();
  const qc = useQueryClient();
  const me = useMe();
  const { confirm, element } = useConfirm();
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState('default');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    const p = me.data.profile;
    setDisplayName(p.display_name);
    setStatus(p.status_text);
    setBio(p.bio);
    setTheme(p.profile_theme);
    setUsername(p.username);
  }, [me.data]);

  if (!me.data) return <Screen header={<Header title="Edit profile" />}><LoadingList rows={4} /></Screen>;
  const p = me.data.profile;
  const cooldownUntil = p.display_name_changed_at ? Date.parse(p.display_name_changed_at) + 7 * 86400000 : 0;
  const locked = cooldownUntil > Date.now();
  const dnErr = !validateDisplayName(displayName).ok ? (validateDisplayName(displayName) as any).message : null;

  const save = async () => {
    if (dnErr) return setError(dnErr);
    setSaving(true);
    setError(null);
    try {
      await backend.updateProfile({ display_name: displayName, bio, status_text: status, profile_theme: theme });
      await qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const rename = async () => {
    const v = validateUsername(username);
    if (!v.ok) return toast.error('Invalid username', v.message);
    const free = username.toLowerCase() === p.username.toLowerCase();
    const ok = await confirm({
      title: free ? 'Change capitalization?' : `Change username to @${username}?`,
      message: free ? 'Changing only capitalization is free.' : `This costs ${USERNAME_CHANGE_COST.toLocaleString('en-US')} Orbs (simulated). Your old username becomes available to others.`,
      confirmLabel: free ? 'Change' : `Pay ${USERNAME_CHANGE_COST.toLocaleString('en-US')} Orbs`,
      icon: 'at',
    });
    if (!ok) return;
    setRenaming(true);
    try {
      const r = await backend.changeUsername(username, randomUUID());
      patchBalance(qc, r);
      invalidateEconomy(qc);
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Username changed', `You are now @${r.username}`);
    } catch (e) {
      toast.error("Couldn't change username", toAppError(e).message);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <Screen keyboard header={<Header title="Edit profile" right={<Button title="Save" size="sm" loading={saving} onPress={save} testID="profile-save" />} />} testID="edit-profile-screen">
      <TextField
        label="Display name"
        testID="edit-display"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={20}
        editable={!locked}
        error={displayName !== p.display_name ? dnErr : null}
        hint={locked ? `You can change it again on ${new Date(cooldownUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` : 'Can be changed once every 7 days.'}
      />
      <TextField label="Status" testID="edit-status" value={status} onChangeText={setStatus} maxLength={60} placeholder="What are you up to?" hint={`${status.length}/60`} />
      <TextField label="About me" testID="edit-bio" value={bio} onChangeText={setBio} maxLength={500} multiline placeholder="Favorite games, items you're hunting, anything!" hint={`${bio.length}/500`} />

      <Text variant="label" tone="muted">
        Profile theme
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {PROFILE_THEMES.map((th) => {
          const lockedTheme = p.level < th.level;
          const active = theme === th.key;
          return (
            <Pressable key={th.key} testID={`theme-${th.key}`} disabled={lockedTheme} onPress={() => setTheme(th.key)} accessibilityRole="button" accessibilityState={{ selected: active, disabled: lockedTheme }} accessibilityLabel={`${th.name} theme${lockedTheme ? `, unlocks at level ${th.level}` : ''}`} style={{ width: '23%', minWidth: 72 }}>
              <GradientFill colors={th.colors} style={{ height: 56, borderRadius: radius.md, borderWidth: 3, borderColor: active ? t.text : 'transparent', alignItems: 'center', justifyContent: 'center', opacity: lockedTheme ? 0.4 : 1 }}>
                {lockedTheme ? <Icon name="lock-closed" size={18} color="#fff" /> : active ? <Icon name="checkmark" size={20} color="#fff" /> : null}
              </GradientFill>
              <Text variant="small" tone={lockedTheme ? 'faint' : 'muted'} align="center" style={{ marginTop: 4 }}>
                {lockedTheme ? `Lv ${th.level}` : th.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={{ backgroundColor: t.dangerSoft, borderRadius: 12, padding: space.md }}>
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </View>
      ) : null}

      <Card style={{ gap: space.md }}>
        <Row justify="space-between">
          <Text variant="heading">Username</Text>
          <OrbAmount amount={USERNAME_CHANGE_COST} variant="caption" size={14} />
        </Row>
        <TextField testID="edit-username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={20} icon="at" />
        <Button title="Change username" variant="secondary" loading={renaming} disabled={username === p.username} onPress={rename} testID="username-change" />
      </Card>
      {element}
    </Screen>
  );
}
