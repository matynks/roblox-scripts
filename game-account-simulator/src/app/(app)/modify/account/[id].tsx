import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { backend } from '@/api';
import { Headshot, ItemThumb } from '@/avatar/AvatarView';
import { ActionSheet, DevBanner, KV } from '@/components/admin';
import { useMe } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { Icon } from '@/ui/Icon';
import { OrbAmount } from '@/ui/Orb';
import { Card, IconButton, Pill, Row } from '@/ui/primitives';
import { Header, Screen, SectionHeader } from '@/ui/Screen';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { RARITY_COLORS, radius, space, useTheme } from '@/ui/theme';
import { formatDate, timeAgo, TXN_LABEL } from '@/utils/format';

type Action =
  | 'adjust'
  | 'set_balance'
  | 'profile'
  | 'stats'
  | 'followers'
  | 'flags'
  | 'suspend'
  | 'grant_item'
  | 'grant_set'
  | 'revoke_item'
  | 'grant_pass'
  | 'revoke_pass'
  | 'role';

export default function AdminAccount() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const acct = useQuery({ queryKey: ['admin', 'account', id], queryFn: () => backend.admin.getAccount(id!) });
  const inv = useQuery({ queryKey: ['admin', 'inv', id], queryFn: () => backend.admin.listInventory(id!) });
  const txns = useQuery({ queryKey: ['admin', 'acct-txns', id], queryFn: () => backend.admin.listTransactions(id!, null, 0, 20) });
  const activity = useQuery({ queryKey: ['admin', 'acct-activity', id], queryFn: () => backend.admin.listActivity(id!) });
  const [action, setAction] = useState<Action | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [sign, setSign] = useState<'add' | 'remove'>('add');
  const [form, setForm] = useState<Record<string, string>>({});
  const [lookup, setLookup] = useState('');
  const catalog = useQuery({ queryKey: ['admin', 'lookup', lookup], queryFn: () => backend.admin.catalogLookup(lookup), enabled: action === 'grant_item' || action === 'grant_set' || action === 'grant_pass' });

  const refresh = () => {
    ['account', 'inv', 'acct-txns', 'acct-activity', 'status', 'accounts', 'audit'].forEach((k) => qc.invalidateQueries({ queryKey: ['admin', k] }));
    qc.invalidateQueries({ queryKey: ['me'] });
  };
  const open = (a: Action, preset: Record<string, string> = {}, tgt: string | null = null) => {
    setForm(preset);
    setAmount('');
    setTarget(tgt);
    setLookup('');
    setAction(a);
  };

  if (acct.isLoading) return <Screen header={<Header title="Account" />}><LoadingList rows={5} height={100} /></Screen>;
  if (acct.error || !acct.data) return <Screen header={<Header title="Account" />}><ErrorState error={acct.error} onRetry={() => acct.refetch()} /></Screen>;
  const d = acct.data;
  const a = d.account;
  const isOwner = me.data?.access.role === 'owner';
  const ownerTarget = a.role === 'owner' && a.id !== me.data?.profile.id && !isOwner;

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    await fn();
    toast.success(msg);
    refresh();
  };

  const sheets: Record<Action, { title: string; label: string; destructive?: boolean; description?: string; body?: React.ReactNode; go: (reason: string) => Promise<void> }> = {
    adjust: {
      title: 'Adjust balance',
      label: 'Apply adjustment',
      description: 'Credits or debits simulated Orbs through the ledger. The player is notified.',
      body: (
        <>
          <Segmented testIDPrefix="adjsign" value={sign} onChange={setSign} options={[{ value: 'add', label: 'Add', icon: 'add' }, { value: 'remove', label: 'Remove', icon: 'remove' }]} />
          <TextField label="Amount" keyboardType="number-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} testID="adj-amount" />
        </>
      ),
      go: (reason) => run(() => backend.admin.adjustBalance(a.id, (sign === 'add' ? 1 : -1) * Number(amount || 0), reason, randomUUID()), 'Balance adjusted'),
    },
    set_balance: {
      title: 'Set balance',
      label: 'Set balance',
      description: 'Sets the wallet to an exact value. The difference is recorded as a ledger adjustment.',
      body: <TextField label="New balance" keyboardType="number-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} testID="set-amount" />,
      go: (reason) => run(() => backend.admin.setBalance(a.id, Number(amount || 0), reason, randomUUID()), 'Balance set'),
    },
    profile: {
      title: 'Edit profile',
      label: 'Save profile',
      body: (
        <>
          <TextField label="Username" value={form.username ?? a.username} onChangeText={(v) => setForm({ ...form, username: v })} autoCapitalize="none" testID="admin-username" />
          <TextField label="Display name" value={form.display_name ?? a.display_name} onChangeText={(v) => setForm({ ...form, display_name: v })} testID="admin-display" />
          <TextField label="Bio" value={form.bio ?? d.profile.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline maxLength={500} />
        </>
      ),
      go: (reason) => run(() => backend.admin.updateProfile(a.id, form.username ?? null, form.display_name ?? null, form.bio ?? null, reason), 'Profile updated'),
    },
    stats: {
      title: 'Adjust test statistics',
      label: 'Save statistics',
      description: 'Setting a level moves XP to that level’s threshold so the two stay consistent.',
      body: (
        <>
          <TextField label="Level (1–100)" keyboardType="number-pad" value={form.level ?? ''} placeholder={String(a.level)} onChangeText={(v) => setForm({ ...form, level: v.replace(/\D/g, '') })} testID="admin-level" />
          <TextField label="XP (optional, overrides level)" keyboardType="number-pad" value={form.xp ?? ''} placeholder={String(a.xp)} onChangeText={(v) => setForm({ ...form, xp: v.replace(/\D/g, '') })} />
          <TextField label="Reputation" keyboardType="numbers-and-punctuation" value={form.reputation ?? ''} placeholder={String(a.reputation)} onChangeText={(v) => setForm({ ...form, reputation: v.replace(/[^\d-]/g, '') })} />
        </>
      ),
      go: (reason) => run(() => backend.admin.setStats(a.id, form.level ? Number(form.level) : null, form.xp ? Number(form.xp) : null, form.reputation ? Number(form.reputation) : null, reason), 'Statistics updated'),
    },
    followers: {
      title: 'Add simulated followers',
      label: 'Add followers',
      description: 'Simulated players start following this account. Counts always reflect real follow rows.',
      body: <TextField label="How many (1–500, limited by simulated players available)" keyboardType="number-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} testID="admin-followers" />,
      go: async (reason) => {
        const r = await backend.admin.addNpcFollowers(a.id, Number(amount || 0), reason);
        toast.success(`Added ${r.added} followers`, `Now ${r.followers} total`);
        refresh();
      },
    },
    flags: {
      title: a.is_test_account ? 'Unmark test account' : 'Mark as test account',
      label: 'Save',
      go: (reason) => run(() => backend.admin.setFlags(a.id, !a.is_test_account, null, reason), 'Flags updated'),
    },
    suspend: {
      title: a.account_status === 'suspended' ? 'Restore account' : 'Suspend account',
      label: a.account_status === 'suspended' ? 'Restore' : 'Suspend',
      destructive: a.account_status !== 'suspended',
      description: a.account_status === 'suspended' ? 'The player will be able to use Blockora again.' : 'The player is signed out of every feature until restored.',
      go: (reason) => run(() => backend.admin.setFlags(a.id, null, a.account_status === 'suspended' ? 'active' : 'suspended', reason), 'Account status updated'),
    },
    grant_item: {
      title: 'Grant item',
      label: target ? 'Grant item' : 'Pick an item first',
      body: (
        <>
          <TextField icon="search" placeholder="Search catalog" value={lookup} onChangeText={setLookup} autoCapitalize="none" testID="grant-search" />
          <View style={{ gap: 6 }}>
            {(catalog.data?.items ?? []).slice(0, 12).map((c) => (
              <Pressable key={c.id} testID={`grant-pick-${c.id}`} onPress={() => setTarget(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 6, borderRadius: radius.md, backgroundColor: target === c.id ? t.primarySoft : t.surfaceAlt }}>
                <ItemThumb itemId={c.id} slot={c.slot} size={40} />
                <Text variant="caption" style={{ flex: 1 }}>
                  {c.name}
                </Text>
                {c.is_limited ? <Pill label={`${c.stock_remaining} left`} color="#F472B6" size="sm" /> : null}
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RARITY_COLORS[c.rarity] }} />
              </Pressable>
            ))}
          </View>
        </>
      ),
      go: async (reason) => {
        if (!target) throw new Error('Pick an item to grant.');
        const r = await backend.admin.grantItem(a.id, target, reason);
        toast.success('Item granted', r.serial_number ? `Serial #${r.serial_number}` : undefined);
        refresh();
      },
    },
    grant_set: {
      title: 'Grant item set',
      label: target ? 'Grant set' : 'Pick a set first',
      description: 'Grants every missing item in the set (test collections).',
      body: (
        <View style={{ gap: 6 }}>
          {(catalog.data?.sets ?? []).map((s) => (
            <Pressable key={s.key} onPress={() => setTarget(s.key)} style={{ padding: space.md, borderRadius: radius.md, backgroundColor: target === s.key ? t.primarySoft : t.surfaceAlt }}>
              <Text variant="bodyStrong">{s.name}</Text>
            </Pressable>
          ))}
        </View>
      ),
      go: async (reason) => {
        if (!target) throw new Error('Pick a set.');
        const r = await backend.admin.grantSet(a.id, target, reason);
        toast.success(`Granted ${r.granted} items`);
        refresh();
      },
    },
    revoke_item: {
      title: 'Revoke item',
      label: 'Revoke',
      destructive: true,
      description: 'Removes this copy and unequips it. Limited stock is not restored, so serial numbers stay unique.',
      go: (reason) => run(() => backend.admin.revokeItem(target!, reason), 'Item revoked'),
    },
    grant_pass: {
      title: 'Grant game pass',
      label: target ? 'Grant pass' : 'Pick a pass first',
      body: (
        <View style={{ gap: 6 }}>
          {(catalog.data?.passes ?? []).filter((p) => !d.passes.some((o) => o.pass_id === p.id)).map((p) => (
            <Pressable key={p.id} onPress={() => setTarget(p.id)} style={{ padding: space.md, borderRadius: radius.md, backgroundColor: target === p.id ? t.primarySoft : t.surfaceAlt }}>
              <Text variant="bodyStrong">{p.name}</Text>
              <Text variant="small" tone="faint">
                {p.game_title}
              </Text>
            </Pressable>
          ))}
        </View>
      ),
      go: async (reason) => {
        if (!target) throw new Error('Pick a pass.');
        await run(() => backend.admin.grantPass(a.id, target, reason), 'Pass granted');
      },
    },
    revoke_pass: {
      title: 'Revoke game pass',
      label: 'Revoke',
      destructive: true,
      go: (reason) => run(() => backend.admin.revokePass(a.id, target!, reason), 'Pass revoked'),
    },
    role: {
      title: 'Developer role',
      label: 'Save role',
      description: 'Owners can grant or remove developer access. Developers cannot modify owners.',
      body: <Segmented testIDPrefix="role" value={(form.role ?? a.role ?? 'none') as any} onChange={(v: string) => setForm({ ...form, role: v })} options={[{ value: 'none', label: 'None' }, { value: 'developer', label: 'Developer' }, { value: 'owner', label: 'Owner' }]} />,
      go: (reason) => run(() => backend.admin.setRole(a.id, (form.role ?? a.role ?? 'none') === 'none' ? null : ((form.role ?? a.role) as any), reason), 'Role updated'),
    },
  };
  const sheet = action ? sheets[action] : null;

  return (
    <Screen header={<Header title={`@${a.username}`} subtitle="Account inspector" />} refreshing={acct.isRefetching} onRefresh={refresh} testID="modify-account">
      <DevBanner />
      <Card style={{ gap: space.md }}>
        <Row gap={space.md}>
          <Headshot config={d.avatar} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading">{a.display_name}</Text>
            <Text variant="caption" tone="muted">
              @{a.username}
              {a.email ? ` · ${a.email}` : ''}
            </Text>
            <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              {a.is_npc ? <Pill label="Simulated player" color={t.textMuted} size="sm" /> : null}
              {a.is_test_account ? <Pill label="Test account" color={t.accent} size="sm" /> : null}
              {a.role ? <Pill label={a.role} color={t.warning} size="sm" /> : null}
              <Pill label={a.account_status} color={a.account_status === 'active' ? t.success : t.danger} size="sm" />
            </Row>
          </View>
        </Row>
        <KV k="Account id" v={<Text variant="small" tone="faint" selectable>{a.id}</Text>} />
        <KV k="Joined" v={formatDate(a.created_at)} />
        <KV k="Last seen" v={timeAgo(a.last_seen_at)} />
        <KV k="Terms accepted" v={d.profile.terms_accepted_at ? formatDate(d.profile.terms_accepted_at) : '—'} />
        {ownerTarget ? (
          <Row gap={6}>
            <Icon name="lock-closed" size={14} color={t.warning} />
            <Text variant="small" tone="warning">
              Owner account — only owners can modify it.
            </Text>
          </Row>
        ) : null}
      </Card>

      <SectionHeader title="Currency" />
      <Card style={{ gap: space.sm }}>
        <OrbAmount amount={d.wallet?.balance ?? 0} variant="title" showSim />
        <KV k="Lifetime earned" v={(d.wallet?.lifetime_earned ?? 0).toLocaleString('en-US')} />
        <KV k="Lifetime spent" v={(d.wallet?.lifetime_spent ?? 0).toLocaleString('en-US')} />
        <Row gap={space.sm} style={{ marginTop: 4 }}>
          <Button title="Add / remove" icon="swap-vertical" size="sm" style={{ flex: 1 }} onPress={() => open('adjust')} testID="admin-adjust" />
          <Button title="Set balance" icon="create" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => open('set_balance')} testID="admin-set-balance" />
        </Row>
      </Card>

      <SectionHeader title="Profile & statistics" />
      <Card style={{ gap: space.sm }}>
        <KV k="Level / XP" v={`${a.level} / ${a.xp.toLocaleString('en-US')}`} />
        <KV k="Reputation" v={a.reputation} />
        {Object.entries(d.metrics).filter(([k]) => !['joined', 'balance', 'level'].includes(k)).map(([k, v]) => (
          <KV key={k} k={k.replace(/_/g, ' ')} v={Number(v).toLocaleString('en-US')} />
        ))}
        <KV k="Rejected game sessions" v={d.rejected_sessions} />
        <KV k="Reports against" v={d.reports_against} />
        <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: 4 }}>
          <Button title="Edit profile" size="sm" variant="secondary" onPress={() => open('profile')} testID="admin-edit-profile" />
          <Button title="Set stats" size="sm" variant="secondary" onPress={() => open('stats')} testID="admin-set-stats" />
          <Button title="Add followers" size="sm" variant="secondary" onPress={() => open('followers')} testID="admin-add-followers" />
          <Button title={a.is_test_account ? 'Unmark test' : 'Mark test'} size="sm" variant="secondary" onPress={() => open('flags')} />
          <Button title={a.account_status === 'suspended' ? 'Restore' : 'Suspend'} size="sm" variant={a.account_status === 'suspended' ? 'secondary' : 'danger'} onPress={() => open('suspend')} />
          {isOwner && !a.is_npc && a.id !== me.data?.profile.id ? <Button title="Role" size="sm" variant="outline" icon="key" onPress={() => open('role')} /> : null}
        </Row>
      </Card>

      <SectionHeader title={`Inventory · ${inv.data?.length ?? 0}`} />
      <Card style={{ gap: space.sm }}>
        <Row gap={space.sm}>
          <Button title="Grant item" icon="gift" size="sm" style={{ flex: 1 }} onPress={() => open('grant_item')} testID="admin-grant-item" />
          <Button title="Grant set" icon="layers" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => open('grant_set')} />
        </Row>
        {(inv.data ?? []).slice(0, 40).map((i) => (
          <Row key={i.id} gap={space.md} style={{ paddingVertical: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
              <ItemThumb itemId={i.item_id} slot={i.slot} size={40} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" style={{ fontFamily: 'Nunito_800ExtraBold' }} numberOfLines={1}>
                {i.name}
                {i.serial_number ? ` #${i.serial_number}` : ''}
              </Text>
              <Text variant="small" tone="faint">
                {i.acquired_via.replace('_', ' ')} · {timeAgo(i.acquired_at)}
              </Text>
            </View>
            <IconButton icon="trash-outline" label={`Revoke ${i.name}`} size={34} color={t.danger} onPress={() => open('revoke_item', {}, i.id)} />
          </Row>
        ))}
      </Card>

      <SectionHeader title="Game passes & stats" />
      <Card style={{ gap: space.sm }}>
        <Button title="Grant pass" icon="ticket" size="sm" variant="secondary" onPress={() => open('grant_pass')} />
        {d.passes.map((p) => (
          <Row key={p.pass_id} justify="space-between">
            <Text variant="caption">{p.name} <Text variant="small" tone="faint">({p.acquired_via})</Text></Text>
            <IconButton icon="close-circle-outline" label={`Revoke ${p.name}`} size={32} color={t.danger} onPress={() => open('revoke_pass', {}, p.pass_id)} />
          </Row>
        ))}
        {d.game_stats.slice(0, 10).map((s) => (
          <KV key={s.game_id} k={s.title} v={`${s.plays} plays · best ${Number(s.best_score).toLocaleString('en-US')}`} />
        ))}
        <Text variant="small" tone="faint">
          Achievements: {d.achievements.length ? d.achievements.join(', ') : 'none'}
        </Text>
      </Card>

      <SectionHeader title="Recent transactions" />
      <Card style={{ gap: 2 }}>
        {(txns.data ?? []).map((r) => (
          <Row key={r.id} justify="space-between" style={{ paddingVertical: 5 }}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" numberOfLines={1}>
                {r.description}
              </Text>
              <Text variant="small" tone="faint">
                {TXN_LABEL[r.kind] ?? r.kind} · {timeAgo(r.created_at)}
                {r.actor_username ? ` · by @${r.actor_username}` : ''}
              </Text>
            </View>
            <Text variant="number" tone={r.amount > 0 ? 'success' : 'danger'}>
              {r.amount > 0 ? '+' : ''}
              {r.amount.toLocaleString('en-US')}
            </Text>
          </Row>
        ))}
      </Card>

      <SectionHeader title="Activity history" />
      <Card style={{ gap: 2 }}>
        {(activity.data ?? []).slice(0, 15).map((e) => (
          <KV key={e.id} k={e.kind.replace(/_/g, ' ')} v={timeAgo(e.created_at)} />
        ))}
      </Card>

      {sheet ? (
        <ActionSheet visible={!!action} onClose={() => setAction(null)} title={sheet.title} description={sheet.description} confirmLabel={sheet.label} destructive={sheet.destructive} onConfirm={sheet.go} testID="admin-sheet">
          {sheet.body}
        </ActionSheet>
      ) : null}
    </Screen>
  );
}
