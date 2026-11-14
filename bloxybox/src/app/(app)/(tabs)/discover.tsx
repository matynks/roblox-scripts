import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import type { Experience, ExperienceCategory } from '@/api/types';
import { ExperienceCard } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Chip, ChipRow, SectionHeader } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/StateViews';
import {
  CATEGORY_LABELS,
  featuredExperiences,
  inDevelopment,
  newExperiences,
  popularExperiences,
  searchExperiences,
  useExperiences,
} from '@/features/discover/api';
import { colors, fontFamily, radii, spacing } from '@/theme/tokens';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExperienceCategory[];

function openExperience(e: Experience) {
  router.push({ pathname: '/experience/[slug]', params: { slug: e.slug } });
}

function Row({ title, data, variant = 'tile' }: { title: string; data: Experience[]; variant?: 'tile' | 'wide' }) {
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <FlatList
        horizontal
        data={data}
        keyExtractor={(e) => e.id}
        showsHorizontalScrollIndicator={false}
        style={styles.hScroll}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => <ExperienceCard experience={item} variant={variant} onPress={() => openExperience(item)} />}
      />
    </View>
  );
}

export default function DiscoverScreen() {
  const experiences = useExperiences();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExperienceCategory | 'all'>('all');
  const list = useMemo(() => experiences.data ?? [], [experiences.data]);
  const filtering = query.trim().length > 0 || category !== 'all';
  const results = useMemo(() => searchExperiences(list, query, category), [list, query, category]);
  const usedCategories = useMemo(() => CATEGORIES.filter((c) => list.some((e) => e.category === c)), [list]);

  return (
    <Screen title="Discover" refreshing={experiences.isRefetching} onRefresh={() => experiences.refetch()}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search experiences"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Search experiences"
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Ionicons name="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} accessibilityLabel="Clear search" />
        ) : null}
      </View>

      <ChipRow>
        <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
        {usedCategories.map((c) => (
          <Chip key={c} label={CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ChipRow>

      {experiences.isPending ? (
        <View style={styles.section}>
          <Skeleton height={230} radius={radii.lg} />
          <Skeleton height={160} radius={radii.lg} />
        </View>
      ) : experiences.isError && !experiences.data ? (
        <ErrorState error={experiences.error} onRetry={() => experiences.refetch()} />
      ) : filtering ? (
        results.length === 0 ? (
          <EmptyState icon="search" title="No experiences found" message="Try a different search or category." />
        ) : (
          <View style={styles.results}>
            <AppText variant="caption" color={colors.textSecondary}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </AppText>
            {results.map((e) => (
              <ExperienceCard key={e.id} experience={e} variant="row" onPress={() => openExperience(e)} />
            ))}
          </View>
        )
      ) : (
        <>
          <Row title="Featured" data={featuredExperiences(list)} variant="wide" />
          <Row title="Popular" data={popularExperiences(list)} />
          <Row title="New" data={newExperiences(list)} />
          <View style={styles.section}>
            <SectionHeader title="In development" />
            <AppText variant="caption" color={colors.textSecondary}>
              Upcoming experiences. They are not playable yet.
            </AppText>
            {inDevelopment(list).map((e) => (
              <ExperienceCard key={e.id} experience={e} variant="row" onPress={() => openExperience(e)} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  searchInput: { flex: 1, color: colors.text, fontFamily, fontSize: 16, paddingVertical: spacing.sm },
  section: { gap: spacing.md },
  hScroll: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  hList: { gap: spacing.md, paddingHorizontal: spacing.lg },
  results: { gap: spacing.sm },
});
