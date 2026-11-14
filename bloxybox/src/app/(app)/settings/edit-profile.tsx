import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import type { ProfileSummary } from '@/api/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useIsOnline } from '@/components/ui/Overlays';
import { goBack, Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { checkUsernameAvailable } from '@/features/auth/auth';
import { normaliseUsername, validateDisplayName, validateUsername } from '@/features/auth/validation';
import { useProfileSummary, useSetUsername, useUpdateProfile } from '@/features/social/api';
import { haptics } from '@/lib/haptics';
import { useUserId } from '@/stores/session';
import { toast } from '@/stores/toast';
import { accentColors, accentKeys, colors, spacing, type Accent } from '@/theme/tokens';

export default function EditProfileScreen() {
  const userId = useUserId();
  const profile = useProfileSummary(userId);

  if (profile.isPending) return <Screen back title="Edit profile"><LoadingState /></Screen>;
  if (!profile.data) {
    return (
      <Screen back title="Edit profile">
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      </Screen>
    );
  }
  return <EditProfileForm current={profile.data} />;
}

function EditProfileForm({ current }: { current: ProfileSummary }) {
  const updateProfile = useUpdateProfile();
  const setUsername = useSetUsername();
  const online = useIsOnline();

  const [displayName, setDisplayName] = useState(current.display_name);
  const [bio, setBio] = useState(current.bio);
  const [accent, setAccent] = useState<Accent>(current.accent);
  const [username, setUsernameInput] = useState(current.username);
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string; username?: string }>({});

  const usernameChanged = normaliseUsername(username) !== current.username;
  const busy = updateProfile.isPending || setUsername.isPending;

  const save = async () => {
    const next: typeof errors = {};
    const nameError = validateDisplayName(displayName);
    if (nameError) next.displayName = nameError;
    if (bio.trim().length > 200) next.bio = 'Your bio can be at most 200 characters.';
    if (usernameChanged) {
      const usernameError = validateUsername(username);
      if (usernameError) next.username = usernameError;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      if (usernameChanged) {
        const available = await checkUsernameAvailable(username);
        if (!available) {
          setErrors({ username: 'That username is already taken.' });
          return;
        }
        await setUsername.mutateAsync(normaliseUsername(username));
      }
      await updateProfile.mutateAsync({ displayName: displayName.trim(), bio: bio.trim(), accent });
      haptics.success();
      toast.success('Profile saved');
      goBack();
    } catch (e) {
      const appError = toAppError(e);
      if (appError.code === 'USERNAME_TAKEN' || appError.code === 'INVALID_USERNAME') {
        setErrors({ username: appError.message });
      } else {
        toast.error("Couldn't save profile", appError.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <Screen
        back
        title="Edit profile"
        bottomInset
        footer={<Button label={online ? 'Save changes' : 'Connect to save'} size="lg" fullWidth loading={busy} disabled={!online} onPress={save} />}
      >
        <Input label="Display name" value={displayName} onChangeText={setDisplayName} error={errors.displayName} maxLength={30} />
        <Input
          label="Username"
          value={username}
          onChangeText={(v) => setUsernameInput(v.toLowerCase())}
          error={errors.username}
          helper={usernameChanged ? 'Your profile link changes with your username.' : 'Lowercase letters, numbers and underscores'}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          error={errors.bio}
          helper={`${bio.length}/200`}
          multiline
          maxLength={200}
          style={styles.bio}
        />
        <Card>
          <AppText variant="subheading">Accent colour</AppText>
          <View style={styles.accents}>
            {accentKeys.map((key) => {
              const selected = accent === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${key} accent`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.tap();
                    setAccent(key);
                  }}
                  style={[styles.accent, { backgroundColor: accentColors[key] }, selected ? styles.accentSelected : null]}
                >
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.backgroundDeep} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  bio: { minHeight: 96, textAlignVertical: 'top' },
  accents: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  accent: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  accentSelected: { borderWidth: 3, borderColor: colors.text },
});
