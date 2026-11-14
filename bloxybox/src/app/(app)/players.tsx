import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerRow } from '@/components/feature/Cards';
import { Divider } from '@/components/ui/Controls';
import { ScreenHeader } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { usePlayerSearch } from '@/features/social/api';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

export default function PlayersScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const search = usePlayerSearch(query);
  const ready = query.trim().length >= 2;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader back title="Find players" />
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Search by username or display name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            accessibilityLabel="Search players"
          />
        </View>
      </View>
      {!ready ? (
        <EmptyState icon="people-outline" title="Find other BloxyBox players" message="Type at least two characters to search." />
      ) : search.isPending ? (
        <LoadingState label="Searching…" />
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : (
        <FlatList
          data={search.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerRow player={item} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} />}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={<EmptyState icon="search" title="No players found" message={`Nobody matches "${query.trim()}".`} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontFamily, fontSize: 16, paddingVertical: spacing.sm },
});
