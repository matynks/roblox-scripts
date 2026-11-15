import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, useWindowDimensions, View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import type { Outfit } from '@/api/types';
import { AvatarView } from '@/avatar/AvatarView';
import { useMe, useOutfits } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, IconButton, Pill, Row } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Sheet, useConfirm } from '@/ui/Sheet';
import { EmptyState, ErrorState, LoadingGrid } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

export default function Outfits() {
  const t = useTheme();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tryOn?: string; name?: string }>();
  const me = useMe();
  const outfits = useOutfits();
  const { confirm, element } = useConfirm();
  const [saveSheet, setSaveSheet] = useState(false);
  const [edit, setEdit] = useState<Outfit | null>(null);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<{ item_id: string; name: string; price: number }[] | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['outfits'] });
    qc.invalidateQueries({ queryKey: ['me'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['quests'] });
  };

  const wear = async (id: string, label: string) => {
    setBusy(true);
    try {
      const r = await backend.wearOutfit(id);
      if (r.status === 'missing_items') setMissing(r.missing);
      else {
        toast.success('Outfit applied', `You're wearing “${label}”.`);
        refresh();
      }
    } catch (e) {
      toast.error("Couldn't wear outfit", toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  // Opened from another player's profile: try their shared outfit on.
  useEffect(() => {
    if (params.tryOn) wear(params.tryOn, params.name ?? 'outfit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tryOn]);

  const saveCurrent = async () => {
    if (!me.data) return;
    setBusy(true);
    try {
      if (edit) {
        await backend.updateOutfit(edit.id, name, isPublic);
        toast.success('Outfit updated');
      } else {
        const r = await backend.saveOutfit(name, me.data.avatar, isPublic);
        toast.success('Outfit saved', isPublic ? 'Shared on your profile.' : undefined);
        toast.achievements(r.unlocked);
      }
      setSaveSheet(false);
      setEdit(null);
      refresh();
    } catch (e) {
      toast.error("Couldn't save outfit", toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const cardW = (Math.min(width, 700) - space.lg * 2 - space.md) / 2;
  return (
    <Screen header={<Header title="Outfits" subtitle={`${outfits.data?.length ?? 0}/50 saved`} right={<IconButton icon="add" tone="primary" label="Save current look" onPress={() => { setEdit(null); setName(''); setIsPublic(false); setSaveSheet(true); }} />} />} testID="outfits-screen">
      {outfits.isLoading ? (
        <LoadingGrid count={4} columns={2} height={240} />
      ) : outfits.error ? (
        <ErrorState error={outfits.error} onRetry={() => outfits.refetch()} />
      ) : (outfits.data ?? []).length === 0 ? (
        <EmptyState icon="albums-outline" title="No outfits yet" message="Save your current look to switch back to it any time — or share it on your profile." actionLabel="Save current look" onAction={() => { setName(''); setSaveSheet(true); }} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {(outfits.data ?? []).map((o) => (
            <Card key={o.id} padded={false} style={{ width: cardW, overflow: 'hidden' }} testID={`outfit-${o.name}`}>
              <View style={{ alignItems: 'center', backgroundColor: t.surfaceAlt, paddingTop: space.sm }}>
                <AvatarView config={o} size={cardW * 0.72} animated={false} />
                {o.is_public ? (
                  <View style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Pill label="Shared" color={t.accent} icon="globe" size="sm" />
                  </View>
                ) : null}
              </View>
              <View style={{ padding: space.md, gap: space.sm }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {o.name}
                </Text>
                <Row gap={6}>
                  <Button title="Wear" size="sm" style={{ flex: 1 }} loading={busy} onPress={() => wear(o.id, o.name)} testID={`wear-${o.name}`} />
                  <IconButton icon="create-outline" label="Edit outfit" size={36} onPress={() => { setEdit(o); setName(o.name); setIsPublic(o.is_public); setSaveSheet(true); }} />
                  <IconButton
                    icon="trash-outline"
                    label="Delete outfit"
                    size={36}
                    color={t.danger}
                    onPress={async () => {
                      if (!(await confirm({ title: `Delete “${o.name}”?`, message: 'This only deletes the saved outfit. Your items stay in your inventory.', confirmLabel: 'Delete', destructive: true, icon: 'trash' }))) return;
                      try {
                        await backend.deleteOutfit(o.id);
                        refresh();
                      } catch (e) {
                        toast.error("Couldn't delete", toAppError(e).message);
                      }
                    }}
                  />
                </Row>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Sheet visible={saveSheet} onClose={() => setSaveSheet(false)} title={edit ? 'Edit outfit' : 'Save current look'} footer={<Button title={edit ? 'Save changes' : 'Save outfit'} fullWidth loading={busy} disabled={!name.trim()} onPress={saveCurrent} testID="outfit-save" />}>
        {!edit && me.data ? (
          <View style={{ alignItems: 'center' }}>
            <AvatarView config={me.data.avatar} size={130} />
          </View>
        ) : null}
        <TextField label="Outfit name" value={name} onChangeText={setName} maxLength={30} placeholder="Weekend fit" testID="outfit-name" />
        <Row justify="space-between">
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Share on my profile</Text>
            <Text variant="caption" tone="muted">
              Others can see it and try it on.
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: t.primary, false: t.surfacePressed }} thumbColor="#fff" />
        </Row>
      </Sheet>

      <Sheet visible={!!missing} onClose={() => setMissing(null)} title="Missing items">
        <Text variant="body" tone="muted">
          You need these items to wear this outfit:
        </Text>
        {(missing ?? []).map((m) => (
          <Pressable key={m.item_id} onPress={() => { setMissing(null); router.push(`/item/${m.item_id}`); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md, borderRadius: radius.md, backgroundColor: t.surfaceAlt }}>
            <Text variant="bodyStrong">{m.name}</Text>
            <Row gap={8}>
              <OrbAmount amount={m.price} variant="caption" size={14} />
              <Icon name="chevron-forward" size={16} color={t.textFaint} />
            </Row>
          </Pressable>
        ))}
      </Sheet>
      {element}
    </Screen>
  );
}
