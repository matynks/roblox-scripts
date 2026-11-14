import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { num } from '@/api/client';
import { toAppError } from '@/api/errors';
import { SLOT_LABELS } from '@/api/types';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { Chip, ChipRow, Divider, ListRow, SwitchRow } from '@/components/ui/Controls';
import { Input } from '@/components/ui/Input';
import { Sheet, useIsOnline } from '@/components/ui/Overlays';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import {
  useDevAccess,
  useDevAction,
  useDevAuditLog,
  useDevDiagnostics,
  useDevTransactions,
  useDevUser,
  useDevUsers,
  type DevAction,
} from '@/features/dev/api';
import { useItems } from '@/features/market/api';
import { useGamePasses } from '@/features/passes/api';
import { describeHost } from '@/lib/config';
import { formatDateTime, formatNumber, formatSigned } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useSessionStore, useUserId } from '@/stores/session';
import { toast } from '@/stores/toast';
import { colors, rarityColors, spacing } from '@/theme/tokens';

type Section = 'economy' | 'stats' | 'items' | 'passes' | 'reset' | 'logs' | 'diagnostics';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'economy', label: 'BoxCoins' },
  { key: 'stats', label: 'Stats' },
  { key: 'items', label: 'Items' },
  { key: 'passes', label: 'Passes' },
  { key: 'reset', label: 'Reset' },
  { key: 'logs', label: 'Logs' },
  { key: 'diagnostics', label: 'Diagnostics' },
];

function parseWhole(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d{1,13}$/.test(trimmed)) return null;
  return Number(trimmed);
}

export default function ModifyMenuScreen() {
  const me = useUserId();
  const access = useDevAccess();
  const isDev = access.data === true;

  if (access.isPending) {
    return (
      <Screen back title="Developer">
        <LoadingState label="Checking access…" />
      </Screen>
    );
  }
  if (!isDev) {
    return (
      <Screen back title="Developer">
        <EmptyState icon="lock-closed-outline" title="Not available" actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }
  return <ModifyMenu me={me} />;
}

function ModifyMenu({ me }: { me: string }) {
  const client = useQueryClient();
  const online = useIsOnline();
  const [section, setSection] = useState<Section>('economy');
  const [targetId, setTargetId] = useState<string>(me);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);

  const target = useDevUser(targetId, true);
  const users = useDevUsers(search.trim(), picking);
  const action = useDevAction();

  const run = (a: DevAction, success: string) => {
    haptics.light();
    action.mutate(a, {
      onSuccess: () => {
        haptics.success();
        toast.success(success, 'Logged in the developer audit log.');
      },
      onError: (e) => {
        haptics.error();
        toast.error('Action failed', toAppError(e).message);
      },
    });
  };

  const t = target.data;

  return (
    <Screen
      back
      title="Modify Menu"
      subtitle="Developer tools · simulated BloxyBox data only"
      bottomInset
      refreshing={target.isRefetching}
      onRefresh={() => client.invalidateQueries({ queryKey: ['dev'] })}
    >
      <Card tone="primary">
        <View style={styles.warning}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
            Every change is checked against your developer role on the server and written to the audit log. These tools only
            change BloxyBox’s own simulated data.
          </AppText>
        </View>
      </Card>

      <Card padded={false}>
        <ListRow
          icon="person-outline"
          title={t ? `${t.display_name} (@${t.username})` : 'Loading target…'}
          subtitle={t ? `${targetId === me ? 'You' : 'Selected player'} · ${t.is_developer ? 'developer' : 'player'}` : undefined}
          right={t ? <CoinAmount amount={num(t.wallet.balance)} size="sm" /> : null}
          onPress={() => setPicking(true)}
        />
      </Card>

      <ChipRow>
        {SECTIONS.map((s) => (
          <Chip key={s.key} label={s.label} selected={section === s.key} onPress={() => setSection(s.key)} />
        ))}
      </ChipRow>

      {!online ? (
        <AppText variant="caption" color={colors.warning}>
          You’re offline. Developer actions need a connection.
        </AppText>
      ) : null}

      {target.isError ? <ErrorState error={target.error} onRetry={() => target.refetch()} /> : null}

      {t && section === 'economy' ? <EconomySection userId={targetId} balance={num(t.wallet.balance)} busy={action.isPending} run={run} /> : null}
      {t && section === 'stats' ? (
        <StatsSection
          key={targetId}
          userId={targetId}
          stats={t.stats}
          busy={action.isPending}
          run={run}
        />
      ) : null}
      {t && section === 'items' ? <ItemsSection userId={targetId} owned={t.item_ids} busy={action.isPending} run={run} /> : null}
      {t && section === 'passes' ? <PassesSection userId={targetId} owned={t.pass_ids} busy={action.isPending} run={run} /> : null}
      {t && section === 'reset' ? <ResetSection userId={targetId} username={t.username} busy={action.isPending} run={run} /> : null}
      {section === 'logs' ? <LogsSection userId={targetId} /> : null}
      {section === 'diagnostics' ? <DiagnosticsSection /> : null}

      <Sheet visible={picking} onClose={() => setPicking(false)}>
        <AppText variant="heading">Choose a player</AppText>
        <Input label="Search username or display name" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
        <Card padded={false}>
          <ListRow
            icon="person-circle-outline"
            title="Myself"
            onPress={() => {
              setTargetId(me);
              setPicking(false);
            }}
          />
          {(users.data ?? []).slice(0, 6).map((u) => (
            <View key={u.id}>
              <Divider />
              <ListRow
                title={`${u.display_name} (@${u.username})`}
                subtitle={`Level ${u.level ?? 1} · ${formatNumber(num(u.balance))} BoxCoins`}
                onPress={() => {
                  setTargetId(u.id);
                  setPicking(false);
                }}
              />
            </View>
          ))}
        </Card>
        {users.isError ? (
          <AppText variant="caption" color={colors.danger}>
            {toAppError(users.error).message}
          </AppText>
        ) : null}
      </Sheet>
    </Screen>
  );
}

type RunFn = (action: DevAction, success: string) => void;

function EconomySection({ userId, balance, busy, run }: { userId: string; balance: number; busy: boolean; run: RunFn }) {
  const [setTo, setSetTo] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const setValue = parseWhole(setTo);
  const deltaValue = parseWhole(delta);

  return (
    <Card>
      <View style={styles.gap}>
        <AppText variant="subheading">Simulated balance</AppText>
        <CoinAmount amount={balance} size="lg" />
        <Input label="Reason (optional, stored in the ledger)" value={reason} onChangeText={setReason} maxLength={80} />
        <Input
          label="Set balance to"
          value={setTo}
          onChangeText={setSetTo}
          keyboardType="number-pad"
          error={setTo && (setValue === null || setValue < 0) ? 'Enter a whole number of 0 or more' : null}
        />
        <Button
          label="Set balance"
          disabled={setValue === null || setValue < 0 || busy}
          loading={busy}
          onPress={() => setValue !== null && run({ type: 'set_balance', userId, balance: setValue, reason }, `Balance set to ${formatNumber(setValue)}`)}
        />
        <Divider />
        <Input
          label="Add or subtract (use - to subtract)"
          value={delta}
          onChangeText={setDelta}
          keyboardType="numbers-and-punctuation"
          error={delta && (deltaValue === null || deltaValue === 0) ? 'Enter a non-zero whole number' : null}
        />
        <View style={styles.row}>
          {[100, 1000, 10000].map((amount) => (
            <Button
              key={amount}
              label={`+${formatNumber(amount)}`}
              size="sm"
              variant="secondary"
              disabled={busy}
              onPress={() => run({ type: 'adjust_balance', userId, delta: amount, reason }, `Added ${formatNumber(amount)}`)}
              style={styles.flex}
            />
          ))}
        </View>
        <Button
          label={deltaValue ? `Apply ${formatSigned(deltaValue)}` : 'Apply change'}
          disabled={deltaValue === null || deltaValue === 0 || busy}
          loading={busy}
          onPress={() => deltaValue && run({ type: 'adjust_balance', userId, delta: deltaValue, reason }, `Applied ${formatSigned(deltaValue)}`)}
        />
      </View>
    </Card>
  );
}

function StatsSection({
  userId,
  stats,
  busy,
  run,
}: {
  userId: string;
  stats: { simulated_followers: number; xp: number; profile_visits: number; games_played: number; level: number };
  busy: boolean;
  run: RunFn;
}) {
  const [followers, setFollowers] = useState(String(num(stats.simulated_followers)));
  const [xp, setXp] = useState(String(num(stats.xp)));
  const [visits, setVisits] = useState(String(num(stats.profile_visits)));
  const [games, setGames] = useState(String(num(stats.games_played)));
  const values = [followers, xp, visits, games].map(parseWhole);
  const valid = values.every((v) => v !== null && v >= 0);

  return (
    <Card>
      <View style={styles.gap}>
        <AppText variant="subheading">Simulated statistics</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Current level {stats.level}. Level is recalculated from XP.
        </AppText>
        <Input label="Simulated followers" value={followers} onChangeText={setFollowers} keyboardType="number-pad" />
        <Input label="XP" value={xp} onChangeText={setXp} keyboardType="number-pad" />
        <Input label="Profile visits" value={visits} onChangeText={setVisits} keyboardType="number-pad" />
        <Input label="Games played" value={games} onChangeText={setGames} keyboardType="number-pad" />
        <Button
          label="Save statistics"
          disabled={!valid || busy}
          loading={busy}
          onPress={() =>
            run(
              {
                type: 'set_stats',
                userId,
                simulatedFollowers: values[0]!,
                xp: values[1]!,
                profileVisits: values[2]!,
                gamesPlayed: values[3]!,
              },
              'Statistics updated',
            )
          }
        />
      </View>
    </Card>
  );
}

function ItemsSection({ userId, owned, busy, run }: { userId: string; owned: string[]; busy: boolean; run: RunFn }) {
  const items = useItems();
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  if (items.isPending) return <LoadingState />;
  if (items.isError) return <ErrorState error={items.error} onRetry={() => items.refetch()} />;
  return (
    <Card padded={false}>
      {(items.data ?? []).map((item, index) => {
        const has = ownedSet.has(item.id);
        return (
          <View key={item.id}>
            {index > 0 ? <Divider /> : null}
            <ListRow
              title={item.name}
              subtitle={`${item.rarity} · ${SLOT_LABELS[item.slot]}${item.is_starter ? ' · starter' : ''}`}
              iconColor={rarityColors[item.rarity]}
              icon="cube-outline"
              chevron={false}
              right={
                <Button
                  label={has ? 'Remove' : 'Add'}
                  size="sm"
                  variant={has ? 'danger' : 'secondary'}
                  disabled={busy}
                  onPress={() =>
                    run(
                      has ? { type: 'revoke_item', userId, itemId: item.id } : { type: 'grant_item', userId, itemId: item.id },
                      has ? `Removed ${item.name}` : `Added ${item.name}`,
                    )
                  }
                />
              }
            />
          </View>
        );
      })}
    </Card>
  );
}

function PassesSection({ userId, owned, busy, run }: { userId: string; owned: string[]; busy: boolean; run: RunFn }) {
  const passes = useGamePasses();
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  if (passes.isPending) return <LoadingState />;
  if (passes.isError) return <ErrorState error={passes.error} onRetry={() => passes.refetch()} />;
  return (
    <Card padded={false}>
      {(passes.data ?? []).map((pass, index) => {
        const has = ownedSet.has(pass.id);
        return (
          <View key={pass.id}>
            {index > 0 ? <Divider /> : null}
            <ListRow
              icon="ticket-outline"
              title={pass.name}
              subtitle={pass.experience?.title}
              chevron={false}
              right={
                <Button
                  label={has ? 'Revoke' : 'Grant'}
                  size="sm"
                  variant={has ? 'danger' : 'secondary'}
                  disabled={busy}
                  onPress={() =>
                    run(
                      has ? { type: 'revoke_pass', userId, passId: pass.id } : { type: 'grant_pass', userId, passId: pass.id },
                      has ? `Revoked ${pass.name}` : `Granted ${pass.name}`,
                    )
                  }
                />
              }
            />
          </View>
        );
      })}
    </Card>
  );
}

function ResetSection({ userId, username, busy, run }: { userId: string; username: string; busy: boolean; run: RunFn }) {
  const [includeSocial, setIncludeSocial] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <>
      <Card>
        <View style={styles.gap}>
          <AppText variant="subheading">Reset test data</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Deletes @{username}’s inventory, Game Passes, game sessions, progress and transaction history, resets
            statistics, and restores the starting balance and starter items. The audit log keeps a record.
          </AppText>
        </View>
      </Card>
      <Card padded={false}>
        <SwitchRow
          title="Also remove follows"
          subtitle="Delete this player's followers and following"
          value={includeSocial}
          onValueChange={setIncludeSocial}
        />
      </Card>
      <Button label="Reset player data" variant="danger" icon="trash-outline" disabled={busy} onPress={() => setConfirm(true)} />
      <Sheet visible={confirm} onClose={() => setConfirm(false)} dismissable={!busy}>
        <AppText variant="heading">Reset @{username}?</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          This cannot be undone. Type the username to confirm.
        </AppText>
        <Input label="Username" value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} />
        <Button
          label="Reset"
          variant="danger"
          loading={busy}
          disabled={typed.trim().toLowerCase() !== username}
          onPress={() => {
            run({ type: 'reset_user', userId, includeSocial }, `Reset @${username}`);
            setConfirm(false);
            setTyped('');
          }}
        />
      </Sheet>
    </>
  );
}

function LogsSection({ userId }: { userId: string }) {
  const [scope, setScope] = useState<'target' | 'all'>('target');
  const [kind, setKind] = useState<'transactions' | 'audit'>('transactions');
  const txs = useDevTransactions(scope === 'target' ? userId : null, kind === 'transactions');
  const audit = useDevAuditLog(kind === 'audit');
  const query = kind === 'transactions' ? txs : audit;

  return (
    <>
      <ChipRow>
        <Chip label="Transactions" selected={kind === 'transactions'} onPress={() => setKind('transactions')} />
        <Chip label="Audit log" selected={kind === 'audit'} onPress={() => setKind('audit')} />
        {kind === 'transactions' ? (
          <>
            <Chip label="This player" selected={scope === 'target'} onPress={() => setScope('target')} />
            <Chip label="Everyone" selected={scope === 'all'} onPress={() => setScope('all')} />
          </>
        ) : null}
      </ChipRow>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : kind === 'transactions' ? (
        <Card padded={false}>
          {(txs.data ?? []).length === 0 ? (
            <View style={styles.pad}>
              <AppText variant="caption" color={colors.textSecondary}>
                No transactions.
              </AppText>
            </View>
          ) : (
            (txs.data ?? []).map((tx, i) => (
              <View key={tx.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.logRow}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {tx.description}
                    </AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      #{tx.id} · @{tx.username} · {tx.kind} · {formatDateTime(tx.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" color={num(tx.amount) > 0 ? colors.success : colors.text} tabular>
                    {formatSigned(num(tx.amount))}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </Card>
      ) : (
        <Card padded={false}>
          {(audit.data ?? []).map((entry, i) => (
            <View key={entry.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.logRow}>
                <View style={styles.flex}>
                  <View style={styles.row}>
                    <Badge label={entry.action} color={entry.action === 'access_denied' ? colors.danger : colors.primary} />
                  </View>
                  <AppText variant="caption" color={colors.textSecondary}>
                    by @{entry.actor_username ?? 'deleted'}
                    {entry.target_username ? ` → @${entry.target_username}` : ''} · {formatDateTime(entry.created_at)}
                  </AppText>
                  {Object.keys(entry.details ?? {}).length > 0 ? (
                    <AppText variant="micro" color={colors.textMuted} numberOfLines={3}>
                      {JSON.stringify(entry.details)}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function DiagnosticsSection() {
  const client = useQueryClient();
  const diagnostics = useDevDiagnostics(true);
  const backend = useSessionStore((s) => s.backend);
  const session = useSessionStore((s) => s.session);
  const online = useIsOnline();
  const engine = (globalThis as { HermesInternal?: unknown }).HermesInternal ? 'Hermes' : 'JSC/other';
  const cached = client.getQueryCache().getAll().length;
  const expires = session?.expires_at ? formatDateTime(new Date(session.expires_at * 1000)) : 'n/a';

  const clientRows: [string, string][] = [
    ['App version', `${Constants.expoConfig?.version ?? '?'} (build ${Constants.expoConfig?.android?.versionCode ?? '?'})`],
    ['Platform', `${Platform.OS} ${String(Platform.Version)}`],
    ['JS engine', engine],
    ['Network', online ? 'online' : 'offline'],
    ['Server', backend ? `${describeHost(backend.url)} (${backend.source})` : 'none'],
    ['Session expires', expires],
    ['Cached queries', String(cached)],
  ];

  return (
    <>
      <Card padded={false}>
        {clientRows.map(([label, value], i) => (
          <View key={label}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.logRow}>
              <AppText variant="body" color={colors.textSecondary} style={styles.flex}>
                {label}
              </AppText>
              <AppText variant="bodyStrong">{value}</AppText>
            </View>
          </View>
        ))}
      </Card>
      {diagnostics.isPending ? (
        <LoadingState />
      ) : diagnostics.isError ? (
        <ErrorState error={diagnostics.error} onRetry={() => diagnostics.refetch()} />
      ) : diagnostics.data ? (
        <Card padded={false}>
          {(
            [
              ['Server time', formatDateTime(diagnostics.data.server_time)],
              ['Database', diagnostics.data.database_version],
              ['Schema version', diagnostics.data.schema_version ?? 'unknown'],
              ['BoxCoins in circulation', formatNumber(num(diagnostics.data.economy.boxcoins_in_circulation))],
              ['Ledger consistent', diagnostics.data.economy.ledger_consistent ? 'yes' : 'NO'],
              ...Object.entries(diagnostics.data.counts).map(([k, v]) => [k.replace(/_/g, ' '), formatNumber(num(v))] as [string, string]),
            ] as [string, string][]
          ).map(([label, value], i) => (
            <View key={label}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.logRow}>
                <AppText variant="body" color={colors.textSecondary} style={styles.flex}>
                  {label}
                </AppText>
                <AppText
                  variant="bodyStrong"
                  color={label === 'Ledger consistent' && value !== 'yes' ? colors.danger : colors.text}
                >
                  {value}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <Button label="Refresh diagnostics" variant="secondary" icon="refresh" onPress={() => diagnostics.refetch()} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  warning: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pad: { padding: spacing.lg },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
