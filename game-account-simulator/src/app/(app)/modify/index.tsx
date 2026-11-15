import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import type { DiagnosticCheck } from '@/api/types';
import { DevBanner } from '@/components/admin';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { compact } from '@/ui/Orb';
import { Card, ListRow, Row, StatTile } from '@/ui/primitives';
import { Header, Screen, SectionHeader } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

export default function ModifyHome() {
  const t = useTheme();
  const status = useQuery({ queryKey: ['admin', 'status'], queryFn: () => backend.admin.systemStatus() });
  const diag = useMutation({ mutationFn: () => backend.admin.diagnostics() });
  const s = status.data;
  const color = (c: DiagnosticCheck['status']) => (c === 'pass' ? t.success : c === 'warn' ? t.warning : t.danger);
  return (
    <Screen header={<Header title="Modify Menu" subtitle="Developer console" />} refreshing={status.isRefetching} onRefresh={() => status.refetch()} testID="modify-home">
      <DevBanner />
      {status.isLoading ? <LoadingList rows={3} height={90} /> : status.error ? <ErrorState error={status.error} onRetry={() => status.refetch()} /> : s ? (
        <>
          <Row gap={space.sm}>
            <StatTile label="Players" value={compact(s.accounts.players)} icon="people" />
            <StatTile label="Simulated" value={compact(s.accounts.npcs)} icon="hardware-chip" />
            <StatTile label="Active today" value={compact(s.accounts.active_today)} icon="pulse" color={t.success} />
          </Row>
          <Row gap={space.sm}>
            <StatTile label="Orbs in circulation" value={compact(s.economy.orbs_in_circulation)} icon="wallet" color={t.gold} />
            <StatTile label="Txns today" value={compact(s.economy.transactions_today)} icon="swap-horizontal" />
            <StatTile label="Sessions today" value={compact(s.games.sessions_today)} icon="game-controller" />
          </Row>
          <Card style={{ gap: 4 }}>
            <Text variant="caption" tone="muted">
              Schema {String(s.schema_version)} · season {s.season} · DB {s.database_size_mb} MB · server time {new Date(s.server_time).toLocaleString()}
            </Text>
            <Text variant="caption" tone="muted">
              Rejected scores today: {s.games.rejected_today} · open reports: {s.moderation.open_reports} · audit entries today: {s.audit.entries_today}
            </Text>
          </Card>
        </>
      ) : null}
      <Card padded={false}>
        <ListRow icon="people-circle" title="Accounts" subtitle="Search, inspect and modify simulated accounts" onPress={() => router.push('/modify/accounts')} testID="nav-accounts" />
        <ListRow icon="receipt" title="Platform transactions" subtitle="Recent ledger entries across all accounts" onPress={() => router.push('/modify/transactions')} />
        <ListRow icon="document-text" title="Audit log" subtitle="Every developer action with before/after state" onPress={() => router.push('/modify/audit')} testID="nav-audit" />
        <ListRow icon="flag" iconColor={t.danger} title="Reports" subtitle={s ? `${s.moderation.open_reports} open` : undefined} onPress={() => router.push('/modify/reports')} />
      </Card>
      <SectionHeader title="Diagnostics" />
      <Card style={{ gap: space.md }}>
        <Text variant="caption" tone="muted">
          Read-only integrity checks: ledger vs balances, limited stock, ownership, RLS coverage and more.
        </Text>
        <Button title="Run diagnostics" icon="medkit" loading={diag.isPending} onPress={() => diag.mutate()} testID="run-diagnostics" />
        {diag.error ? <Text variant="caption" tone="danger">{toAppError(diag.error).message}</Text> : null}
        {diag.data?.checks.map((c) => (
          <Row key={c.key} gap={space.md} align="flex-start" testID={`diag-${c.key}`}>
            <Icon name={c.status === 'pass' ? 'checkmark-circle' : c.status === 'warn' ? 'warning' : 'close-circle'} size={20} color={color(c.status)} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{c.label}</Text>
              <Text variant="small" tone="faint">
                {c.detail}
              </Text>
            </View>
            <Text variant="small" color={color(c.status)}>
              {c.status.toUpperCase()}
            </Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
