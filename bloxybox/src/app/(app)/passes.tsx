import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { toAppError } from '@/api/errors';
import type { GamePass } from '@/api/types';
import { PassCard } from '@/components/feature/Cards';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader, SwitchRow } from '@/components/ui/Controls';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useGamePasses, usePassOwnership, useSetPassEnabled } from '@/features/passes/api';
import { toast } from '@/stores/toast';
import { colors, spacing } from '@/theme/tokens';

export default function PassesScreen() {
  const passes = useGamePasses();
  const ownership = usePassOwnership();
  const setEnabled = useSetPassEnabled();

  const { owned, available } = useMemo(() => {
    const list = passes.data ?? [];
    return {
      owned: list.filter((p) => ownership.data?.has(p.id)),
      available: list.filter((p) => !ownership.data?.has(p.id)),
    };
  }, [passes.data, ownership.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; passes: GamePass[] }>();
    for (const pass of owned) {
      const key = pass.experience_id;
      const group = map.get(key) ?? { title: pass.experience?.title ?? 'Experience', passes: [] };
      group.passes.push(pass);
      map.set(key, group);
    }
    return [...map.values()];
  }, [owned]);

  const loading = passes.isPending || ownership.isPending;
  const error = passes.error ?? ownership.error;

  return (
    <Screen
      back
      title="Game Passes"
      subtitle="Simulated perks for BloxyBox experiences"
      bottomInset
      refreshing={passes.isRefetching || ownership.isRefetching}
      onRefresh={() => {
        void passes.refetch();
        void ownership.refetch();
      }}
    >
      {loading ? (
        <LoadingState />
      ) : error && !passes.data ? (
        <ErrorState error={error} onRetry={() => { void passes.refetch(); void ownership.refetch(); }} />
      ) : (
        <>
          <SectionHeader title="My passes" />
          {grouped.length === 0 ? (
            <EmptyState icon="ticket-outline" title="No passes yet" message="Buy a pass below to unlock a perk in a game." />
          ) : (
            grouped.map((group) => (
              <Card key={group.title} padded={false}>
                <View style={styles.groupHeader}>
                  <AppText variant="subheading">{group.title}</AppText>
                </View>
                {group.passes.map((pass) => {
                  const own = ownership.data?.get(pass.id);
                  return (
                    <SwitchRow
                      key={pass.id}
                      title={pass.name}
                      subtitle={pass.description}
                      value={own?.enabled ?? false}
                      onValueChange={(enabled) =>
                        setEnabled.mutate(
                          { passId: pass.id, enabled },
                          { onError: (e) => toast.error("Couldn't update pass", toAppError(e).message) },
                        )
                      }
                    />
                  );
                })}
              </Card>
            ))
          )}

          <SectionHeader title="Available" />
          {available.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              You own every Game Pass. Nice!
            </AppText>
          ) : (
            <View style={styles.list}>
              {available.map((pass) => (
                <PassCard key={pass.id} pass={pass} owned={false} onPress={() => router.push({ pathname: '/pass/[id]', params: { id: pass.id } })} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { gap: spacing.sm },
});
