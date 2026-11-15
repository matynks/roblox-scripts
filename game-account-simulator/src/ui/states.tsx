import { View } from 'react-native';

import { toAppError } from '@/api/errors';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './primitives';
import { Text } from './Text';
import { space, useTheme } from './theme';

export function EmptyState({ icon = 'sparkles-outline', title, message, actionLabel, onAction }: { icon?: IconName; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={34} color={t.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="muted" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} size="sm" style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const t = useTheme();
  const e = toAppError(error);
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? space.lg : space.xxxl, paddingHorizontal: space.xl, gap: space.md }} accessibilityRole="alert">
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: t.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={e.code === 'NETWORK' ? 'cloud-offline-outline' : 'alert-circle-outline'} size={30} color={t.danger} />
      </View>
      <Text variant="heading" align="center">
        {e.code === 'NETWORK' ? "You're offline" : "Couldn't load this"}
      </Text>
      <Text variant="body" tone="muted" align="center">
        {e.message}
      </Text>
      {onRetry ? <Button title="Try again" icon="refresh" variant="secondary" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}

/** Skeleton placeholders shaped like the content that is loading. */
export function LoadingList({ rows = 5, height = 64 }: { rows?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width="100%" height={height} />
      ))}
    </View>
  );
}

export function LoadingGrid({ count = 6, columns = 3, height = 150 }: { count?: number; columns?: number; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={`${100 / columns - 4}%`} height={height} />
      ))}
    </View>
  );
}
