import { useState } from 'react';
import { View } from 'react-native';

import { validateReason } from '@/domain/validation';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Row } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { radius, space, useTheme } from '@/ui/theme';

export function DevBanner() {
  const t = useTheme();
  return (
    <Row gap={8} style={{ backgroundColor: t.goldSoft, borderRadius: radius.md, padding: space.md }}>
      <Icon name="construct" size={16} color={t.warning} />
      <Text variant="small" tone="warning" style={{ flex: 1 }}>
        Developer mode · simulated Blockora data only · every action is authorized by the server and written to the audit log
      </Text>
    </Row>
  );
}

/** Sheet that collects a mandatory audit reason before running an admin action. */
export function ActionSheet({ visible, onClose, title, description, children, confirmLabel, destructive, onConfirm, testID }: { visible: boolean; onClose: () => void; title: string; description?: string; children?: React.ReactNode; confirmLabel: string; destructive?: boolean; onConfirm: (reason: string) => Promise<void>; testID?: string }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      visible={visible}
      onClose={() => !busy && onClose()}
      title={title}
      testID={testID}
      footer={
        <Button
          title={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          fullWidth
          loading={busy}
          testID={testID ? `${testID}-confirm` : undefined}
          onPress={async () => {
            const v = validateReason(reason);
            if (!v.ok) return setError(v.message);
            setBusy(true);
            setError(null);
            try {
              await onConfirm(reason.trim());
              setReason('');
              onClose();
            } catch (e: any) {
              setError(e?.message ?? 'Something went wrong');
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      {description ? (
        <Text variant="body" tone="muted">
          {description}
        </Text>
      ) : null}
      {children}
      <View>
        <TextField label="Reason (recorded in the audit log)" value={reason} onChangeText={setReason} maxLength={200} placeholder="e.g. QA test for limited purchase flow" testID={testID ? `${testID}-reason` : undefined} error={error} />
      </View>
    </Sheet>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <Row justify="space-between" style={{ paddingVertical: 4 }}>
      <Text variant="caption" tone="muted">
        {k}
      </Text>
      {typeof v === 'string' || typeof v === 'number' ? <Text variant="caption" style={{ fontFamily: 'Nunito_800ExtraBold' }}>{String(v)}</Text> : v}
    </Row>
  );
}
