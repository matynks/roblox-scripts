import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { backend } from '@/api';
import type { AdminReport } from '@/api/types';
import { ActionSheet, DevBanner } from '@/components/admin';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { Card, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space } from '@/ui/theme';
import { timeAgo } from '@/utils/format';

export default function Reports() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'open' | 'reviewed' | 'dismissed'>('open');
  const q = useQuery({ queryKey: ['admin', 'reports', status], queryFn: () => backend.admin.listReports(status) });
  const [acting, setActing] = useState<{ r: AdminReport; to: 'reviewed' | 'dismissed' } | null>(null);
  return (
    <Screen header={<Header title="Reports" />} refreshing={q.isRefetching} onRefresh={() => q.refetch()} testID="modify-reports">
      <DevBanner />
      <Segmented testIDPrefix="rep" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'dismissed', label: 'Dismissed' }]} />
      {q.isLoading ? <LoadingList rows={4} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon="flag-outline" title="No reports" /> : null}
      {(q.data ?? []).map((r) => (
        <Card key={r.id} style={{ gap: 6 }}>
          <Row justify="space-between">
            <Text variant="bodyStrong">{r.reason.replace(/_/g, ' ')}</Text>
            <Text variant="small" tone="faint">
              {timeAgo(r.created_at)}
            </Text>
          </Row>
          <Text variant="caption" tone="muted">
            @{r.reporter.username} reported{' '}
            <Text variant="caption" tone="primary" onPress={() => router.push(`/modify/account/${r.target.id}`)}>
              @{r.target.username}
            </Text>
          </Text>
          {r.details ? <Text variant="caption">“{r.details}”</Text> : null}
          {status === 'open' ? (
            <Row gap={space.sm} style={{ marginTop: 4 }}>
              <Button title="Mark reviewed" size="sm" style={{ flex: 1 }} onPress={() => setActing({ r, to: 'reviewed' })} />
              <Button title="Dismiss" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setActing({ r, to: 'dismissed' })} />
            </Row>
          ) : null}
        </Card>
      ))}
      <View />
      <ActionSheet
        visible={!!acting}
        onClose={() => setActing(null)}
        title={acting?.to === 'reviewed' ? 'Mark report reviewed' : 'Dismiss report'}
        confirmLabel="Confirm"
        onConfirm={async (reason) => {
          await backend.admin.resolveReport(acting!.r.id, acting!.to, reason);
          toast.success('Report updated');
          qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
          qc.invalidateQueries({ queryKey: ['admin', 'status'] });
        }}
      />
    </Screen>
  );
}
