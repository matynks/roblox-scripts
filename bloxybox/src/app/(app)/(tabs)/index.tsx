import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { DailyRewardCard } from '@/components/feature/DailyRewardCard';
import { ExperienceCard, ListingCard } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { IconButton, SectionHeader } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, Skeleton } from '@/components/ui/StateViews';
import { AvatarView } from '@/features/avatar/AvatarView';
import { popularExperiences, useExperiences, useMyProgress } from '@/features/discover/api';
import { useInventory, useMyAppearance } from '@/features/inventory/api';
import { useListings } from '@/features/market/api';
import { useProfileSummary } from '@/features/social/api';
import { useWallet } from '@/features/wallet/api';
import { useUserId } from '@/stores/session';
import { colors, radii, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const userId = useUserId();
  const profile = useProfileSummary(userId);
  const wallet = useWallet();
  const experiences = useExperiences();
  const progress = useMyProgress();
  const listings = useListings();
  const inventory = useInventory();
  const appearance = useMyAppearance();

  const playable = useMemo(() => popularExperiences(experiences.data ?? []), [experiences.data]);
  const bestBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of progress.data ?? []) {
      const exp = experiences.data?.find((e) => e.id === p.experience_id);
      if (exp) map.set(exp.slug, p.best_score);
    }
    return map;
  }, [progress.data, experiences.data]);
  const owned = useMemo(() => new Set((inventory.data ?? []).map((i) => i.item_id)), [inventory.data]);
  const featured = useMemo(() => (listings.data ?? []).filter((l) => l.is_featured), [listings.data]);

  const refreshing = wallet.isRefetching || experiences.isRefetching;
  const onRefresh = () => {
    void wallet.refetch();
    void profile.refetch();
    void experiences.refetch();
    void progress.refetch();
    void listings.refetch();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="home-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit avatar"
          onPress={() => router.push('/avatar')}
          style={styles.avatarBubble}
        >
          <AvatarView appearance={appearance} size={46} frame="head" />
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.textSecondary}>
            Welcome back
          </AppText>
          {profile.data ? (
            <AppText variant="heading" numberOfLines={1}>
              {profile.data.display_name}
            </AppText>
          ) : (
            <Skeleton width={120} height={20} />
          )}
        </View>
        <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <Card tone="primary" onPress={() => router.push('/wallet')} accessibilityLabel="Open wallet">
        <View style={styles.walletRow}>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textSecondary}>
              BoxCoins balance
            </AppText>
            {wallet.data ? (
              <CoinAmount amount={wallet.data.balance} size="xl" />
            ) : wallet.isError ? (
              <AppText variant="caption" color={colors.danger}>
                Couldn’t load balance
              </AppText>
            ) : (
              <Skeleton width={140} height={36} />
            )}
          </View>
          <View style={styles.walletAction}>
            <AppText variant="caption" color={colors.primary}>
              History
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </View>
        <AppText variant="micro" color={colors.textMuted} style={styles.walletNote}>
          Simulated currency · no real-world value
        </AppText>
      </Card>

      <DailyRewardCard />

      <SectionHeader title="Play now" actionLabel="Discover" onAction={() => router.push('/discover')} />
      {experiences.isError && !experiences.data ? (
        <ErrorState error={experiences.error} onRetry={() => experiences.refetch()} />
      ) : (
        <FlatList
          horizontal
          data={playable}
          keyExtractor={(e) => e.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          style={styles.hListScroll}
          ListEmptyComponent={
            experiences.isPending ? (
              <View style={styles.hList}>
                <Skeleton width={280} height={230} radius={radii.lg} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ExperienceCard
              experience={item}
              variant="wide"
              bestScore={bestBySlug.get(item.slug)}
              onPress={() => router.push({ pathname: '/experience/[slug]', params: { slug: item.slug } })}
            />
          )}
        />
      )}

      <SectionHeader title="Featured in the shop" actionLabel="Shop" onAction={() => router.push('/shop')} />
      <FlatList
        horizontal
        data={featured}
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        style={styles.hListScroll}
        ListEmptyComponent={
          listings.isPending ? <Skeleton width={150} height={200} radius={radii.lg} /> : null
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            owned={owned.has(item.item_id)}
            width={150}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.item_id } })}
          />
        )}
      />

      <View style={styles.quickRow}>
        <Card style={styles.quick} onPress={() => router.push('/passes')} accessibilityLabel="My Game Passes">
          <Ionicons name="ticket" size={22} color={colors.primary} />
          <AppText variant="bodyStrong">Game Passes</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Perks you own
          </AppText>
        </Card>
        <Card style={styles.quick} onPress={() => router.push('/players')} accessibilityLabel="Find players">
          <Ionicons name="people" size={22} color={colors.info} />
          <AppText variant="bodyStrong">Find players</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Follow friends
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  avatarBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  walletAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  walletNote: { marginTop: spacing.sm },
  hListScroll: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  hList: { gap: spacing.md, paddingHorizontal: spacing.lg },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quick: { flex: 1, gap: spacing.xs },
});
