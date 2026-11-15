import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Plus, RotateCcw, Search as SearchIcon, Trash2, UserCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { BadgeIcon } from '../components/Art';
import { Avatar } from '../components/Avatar';
import { AccountRow, Button, Field, Headshot, ItemThumb, Name, PageHeader, Q, Section, Sheet, Sparks, Tabs, Toggle } from '../components/ui';
import { dateTime, full, readFileAsDataUrl } from '../lib/format';
import { useMe, useSession, useToast } from '../state';
import type { AccountCard, Item, Paged } from '../types';
import { AccountPicker, ItemPicker, useAdminAccounts, useAdminMutation } from './common';

export function AccountsAdmin() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'' | '1' | '0'>('');
  const [creating, setCreating] = useState(false);
  const list = useAdminAccounts(q, filter);
  return (
    <div className="page">
      <PageHeader title="Accounts" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>Fictional account</Button>} />
      <div className="searchbar"><SearchIcon size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or display name" aria-label="Search accounts" /></div>
      <Tabs value={filter} onChange={setFilter} tabs={[{ value: '', label: 'All' }, { value: '1', label: 'Fictional' }, { value: '0', label: 'Real users' }]} />
      <Q q={list}>
        {(d) => (
          <div className="list card">
            {d.items.map((a) => (
              <AccountRow key={a.id} account={a} to={`/modify/accounts/${a.id}`} sub={<>@{a.username} · {a.isFictional ? 'fictional' : 'user'}{a.status === 'disabled' ? ' · DISABLED' : ''} · <Sparks amount={a.balance ?? 0} size={10} compactNum /></>} />
            ))}
          </div>
        )}
      </Q>
      {creating && <CreateAccount onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateAccount({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [startingBalance, setStartingBalance] = useState('500');
  const create = useAdminMutation(() => api.post('/api/admin/accounts', { username, displayName: displayName || undefined, bio, startingBalance: Number(startingBalance) || 0 }), (r) => {
    qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    nav(`/modify/accounts/${r.account.id}`);
  });
  return (
    <Sheet open onClose={onClose} title="Create fictional account" footer={<Button block loading={create.isPending} onClick={() => create.mutate(undefined)}>Create</Button>}>
      <p className="muted small">Fictional accounts are owned by your staff login. You can switch into them, stage their stats and use them as roleplay extras.</p>
      <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" /></Field>
      <Field label="Display name"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} /></Field>
      <Field label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></Field>
      <Field label="Starting balance (Sparks)"><input inputMode="numeric" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value.replace(/\D/g, ''))} /></Field>
    </Sheet>
  );
}

type AdminAccount = {
  account: { id: number; username: string; displayName: string; isFictional: boolean; isPrimary: boolean; status: string; createdAt: number; lastOnlineAt: number | null; owner: { id: number; username: string; staffRole: string } | null };
  profile: { bio: string; statusText: string; announcement: string | null; bannerColor: string; picture: string | null; joinDateOverride: number | null; statOverrides: any; showcaseItemIds: number[] };
  card: AccountCard; wallet: { balance: number; lifetimeEarned: number; lifetimeSpent: number }; badges: any[];
  stats: { friends: number; followers: number; following: number; visits: number; real: { friends: number; followers: number; following: number } };
  inventoryCount: number; characters: number; avatar: any; recentTransactions: any[];
};

const TABS = [
  { value: 'profile', label: 'Profile' }, { value: 'stats', label: 'Staged stats' }, { value: 'currency', label: 'Currency' }, { value: 'badges', label: 'Badges' },
  { value: 'inventory', label: 'Inventory' }, { value: 'avatar', label: 'Avatar' }, { value: 'social', label: 'Social' }, { value: 'presets', label: 'Presets' },
] as const;

export function AccountEditor() {
  const { id } = useParams();
  const accountId = Number(id);
  const qc = useQueryClient();
  const { refresh } = useSession();
  const { push } = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('profile');
  const q = useQuery({ queryKey: ['admin', 'account', accountId], queryFn: () => api.get<AdminAccount>(`/api/admin/accounts/${accountId}`) });
  const reload = () => { qc.invalidateQueries({ queryKey: ['admin', 'account', accountId] }); qc.invalidateQueries({ queryKey: ['admin', 'accounts'] }); };
  const switchTo = useAdminMutation(() => api.post(`/api/admin/accounts/${accountId}/switch`), async () => { await refresh(); qc.invalidateQueries(); push({ title: 'Now acting as this account' }); nav('/'); });
  return (
    <div className="page">
      <PageHeader title="Edit account" />
      <Q q={q}>
        {(a) => (
          <>
            <div className="admin-account-head card">
              <Headshot account={a.card} size={64} />
              <div className="row-main">
                <Name account={a.card} showBadges size={16} />
                <div className="muted small">@{a.account.username} · {a.account.isFictional ? 'fictional' : 'user'}{a.account.owner ? ` · owner ${a.account.owner.username}` : ''}</div>
                <div className="row-gap"><Sparks amount={a.wallet.balance} tag /><span className="muted tiny">{a.inventoryCount} items · {a.stats.followers} followers</span></div>
              </div>
              {(a.account.isFictional) && <Button size="sm" icon={<UserCheck size={14} />} loading={switchTo.isPending} onClick={() => switchTo.mutate(undefined)}>Switch into</Button>}
            </div>
            <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t.value, label: t.label }))} />
            {tab === 'profile' && <ProfileTab a={a} reload={reload} />}
            {tab === 'stats' && <StatsTab a={a} reload={reload} />}
            {tab === 'currency' && <CurrencyTab a={a} reload={reload} />}
            {tab === 'badges' && <BadgesTab a={a} reload={reload} />}
            {tab === 'inventory' && <InventoryTab accountId={accountId} reload={reload} />}
            {tab === 'avatar' && <AvatarTab accountId={accountId} />}
            {tab === 'social' && <SocialTab accountId={accountId} />}
            {tab === 'presets' && <PresetsTab accountId={accountId} reload={reload} />}
          </>
        )}
      </Q>
    </div>
  );
}

function ProfileTab({ a, reload }: { a: AdminAccount; reload: () => void }) {
  const { push } = useToast();
  const [f, setF] = useState({
    username: a.account.username, displayName: a.account.displayName, bio: a.profile.bio, statusText: a.profile.statusText,
    announcement: a.profile.announcement ?? '', bannerColor: a.profile.bannerColor,
    joinedDaysAgo: Math.round((Date.now() - (a.profile.joinDateOverride ?? a.account.createdAt)) / 86400_000).toString(),
  });
  const file = useRef<HTMLInputElement>(null);
  const save = useAdminMutation(() => api.patch(`/api/admin/accounts/${a.account.id}`, {
    username: f.username, displayName: f.displayName, bio: f.bio, statusText: f.statusText, announcement: f.announcement || null, bannerColor: f.bannerColor,
    joinDateOverride: f.joinedDaysAgo === '' ? null : Date.now() - Number(f.joinedDaysAgo) * 86400_000,
  }), () => { reload(); push({ kind: 'success', title: 'Profile saved' }); });
  const status = useAdminMutation((s: string) => api.patch(`/api/admin/accounts/${a.account.id}`, { status: s }), reload);
  const pic = useAdminMutation(async (file: File) => api.post(`/api/admin/accounts/${a.account.id}/picture`, { dataUrl: await readFileAsDataUrl(file) }), reload);
  const rmPic = useAdminMutation(() => api.del(`/api/admin/accounts/${a.account.id}/picture`), reload);
  return (
    <div className="card pad">
      <div className="pic-edit">
        <Headshot account={a.card} size={64} presence={false} />
        <Button size="sm" variant="secondary" icon={<Camera size={14} />} loading={pic.isPending} onClick={() => file.current?.click()}>Change picture</Button>
        {a.profile.picture && <Button size="sm" variant="ghost" onClick={() => rmPic.mutate(undefined)}>Use avatar</Button>}
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) pic.mutate(x); e.target.value = ''; }} />
      </div>
      <div className="two-col">
        <Field label="Username"><input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
        <Field label="Display name"><input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={30} /></Field>
      </div>
      <Field label="Bio"><textarea rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
      <Field label="Status"><input value={f.statusText} onChange={(e) => setF({ ...f, statusText: e.target.value })} maxLength={80} /></Field>
      <Field label="Profile announcement"><input value={f.announcement} onChange={(e) => setF({ ...f, announcement: e.target.value })} maxLength={280} /></Field>
      <div className="two-col">
        <Field label="Banner color"><input type="color" value={f.bannerColor} onChange={(e) => setF({ ...f, bannerColor: e.target.value })} /></Field>
        <Field label="Joined (days ago)"><input inputMode="numeric" value={f.joinedDaysAgo} onChange={(e) => setF({ ...f, joinedDaysAgo: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <div className="row-gap">
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save profile</Button>
        {a.account.status === 'active'
          ? <Button variant="danger" onClick={() => { if (confirm('Disable this account?')) status.mutate('disabled'); }}>Disable account</Button>
          : <Button variant="secondary" onClick={() => status.mutate('active')}>Enable account</Button>}
      </div>
      <div className="muted tiny">Created {dateTime(a.account.createdAt)} · last online {dateTime(a.account.lastOnlineAt)}</div>
    </div>
  );
}

function StatsTab({ a, reload }: { a: AdminAccount; reload: () => void }) {
  const { push } = useToast();
  const o = a.profile.statOverrides ?? {};
  const [f, setF] = useState({
    followers: o.followers?.toString() ?? '', following: o.following?.toString() ?? '', friends: o.friends?.toString() ?? '', visits: o.visits?.toString() ?? '',
    presence: o.presence ?? '', presenceExperienceId: o.presenceExperienceId?.toString() ?? '',
  });
  const exps = useQuery({ queryKey: ['admin', 'experiences'], queryFn: () => api.get<any>('/api/admin/experiences') });
  const num = (s: string) => (s === '' ? null : Number(s));
  const save = useAdminMutation(() => api.patch(`/api/admin/accounts/${a.account.id}`, {
    statOverrides: { followers: num(f.followers), following: num(f.following), friends: num(f.friends), visits: num(f.visits), presence: f.presence || null, presenceExperienceId: num(f.presenceExperienceId) },
  }), () => { reload(); push({ kind: 'success', title: 'Staged statistics saved' }); });
  const field = (k: 'followers' | 'following' | 'friends' | 'visits', real?: number) => (
    <Field label={`${k[0].toUpperCase() + k.slice(1)} shown`} hint={real != null ? `Real: ${full(real)} · leave empty to show the real number` : 'Leave empty to show the real number'}>
      <input inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '') })} />
    </Field>
  );
  return (
    <div className="card pad">
      <p className="muted small">Staged statistics change what the profile displays for a roleplay scenario. Real relationship rows are not created (use the Social tab or scripted events for that).</p>
      <div className="two-col">{field('followers', a.stats.real.followers)}{field('following', a.stats.real.following)}</div>
      <div className="two-col">{field('friends', a.stats.real.friends)}{field('visits')}</div>
      <div className="two-col">
        <Field label="Presence override"><select value={f.presence} onChange={(e) => setF({ ...f, presence: e.target.value })}><option value="">Real presence</option><option value="online">Online</option><option value="in_experience">In an experience</option><option value="offline">Offline</option></select></Field>
        {f.presence === 'in_experience' && <Field label="Experience"><select value={f.presenceExperienceId} onChange={(e) => setF({ ...f, presenceExperienceId: e.target.value })}><option value="">—</option>{exps.data?.items.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
      </div>
      <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save staged stats</Button>
    </div>
  );
}

function CurrencyTab({ a, reload }: { a: AdminAccount; reload: () => void }) {
  const qc = useQueryClient();
  const { push } = useToast();
  const { refresh } = useSession();
  const me = useMe();
  const [op, setOp] = useState<'set' | 'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [scripted, setScripted] = useState(false);
  const [notify, setNotify] = useState(false);
  const tx = useQuery({ queryKey: ['admin', 'tx', a.account.id], queryFn: () => api.get<Paged<any>>(`/api/admin/accounts/${a.account.id}/transactions?limit=30`) });
  const run = useAdminMutation(() => api.post(`/api/admin/accounts/${a.account.id}/wallet`, { op, amount: Number(amount), description: description || undefined, scripted, notify }), (r) => {
    push({ kind: 'success', title: `Balance is now ${full(r.balance)} Sparks` });
    setAmount('');
    reload();
    qc.invalidateQueries({ queryKey: ['admin', 'tx', a.account.id] });
    if (me.account.id === a.account.id) refresh();
  });
  return (
    <>
      <div className="card pad">
        <div className="kv"><span>Balance</span><Sparks amount={a.wallet.balance} tag /></div>
        <div className="kv"><span>Lifetime earned / spent</span><span>{full(a.wallet.lifetimeEarned)} / {full(a.wallet.lifetimeSpent)}</span></div>
        <div className="chips">{(['add', 'remove', 'set'] as const).map((o) => <button key={o} className={`chip ${op === o ? 'active' : ''}`} onClick={() => setOp(o)}>{o === 'set' ? 'Set balance' : o === 'add' ? 'Add' : 'Remove'}</button>)}</div>
        <div className="two-col">
          <Field label="Amount"><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Ledger description"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={op === 'add' ? 'e.g. Group payout' : 'Adjustment'} maxLength={200} /></Field>
        </div>
        <div className="chips">{[1000, 10000, 100000, 1000000].map((n) => <button key={n} className="chip" onClick={() => setAmount(String(n))}>{full(n)}</button>)}</div>
        <Toggle label="Scripted transaction" hint="Recorded as a roleplay transaction in the account’s history" checked={scripted} onChange={setScripted} />
        <Toggle label="Send a notification" checked={notify} onChange={setNotify} />
        <Button loading={run.isPending} disabled={!amount} onClick={() => run.mutate(undefined)}>Apply</Button>
      </div>
      <Section title="Ledger">
        <Q q={tx}>{(d) => (
          <div className="list card">{d.items.map((t: any) => (
            <div key={t.id} className="row tx"><div className="row-main"><strong>{t.description}</strong><div className="muted tiny">{t.type}{t.scripted ? ' · scripted' : ''} · {dateTime(t.createdAt)}</div></div><div className="tx-amount"><span className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount >= 0 ? '+' : '−'}{full(Math.abs(t.amount))}</span><span className="muted tiny">bal {full(t.balanceAfter)}</span></div></div>
          ))}</div>
        )}</Q>
      </Section>
    </>
  );
}

function BadgesTab({ a, reload }: { a: AdminAccount; reload: () => void }) {
  const all = useQuery({ queryKey: ['admin', 'badges'], queryFn: () => api.get<{ badges: any[] }>('/api/admin/badges') });
  const [label, setLabel] = useState('');
  const [notify, setNotify] = useState(true);
  const assign = useAdminMutation((badgeId: number) => api.post(`/api/admin/accounts/${a.account.id}/badges`, { badgeId, labelOverride: label || null, notify }), () => { reload(); setLabel(''); });
  const remove = useAdminMutation((badgeId: number) => api.del(`/api/admin/accounts/${a.account.id}/badges/${badgeId}`), reload);
  const has = new Set(a.badges.map((b) => b.id));
  return (
    <>
      <Section title="Assigned">
        {a.badges.length === 0 ? <p className="muted">No badges.</p> : (
          <div className="list card">{a.badges.map((b) => (
            <div key={b.id} className="row"><BadgeIcon badge={b} /><div className="row-main"><strong>{b.label}</strong><div className="muted tiny">{b.kind}{b.kind === 'system' ? ' · follows staff role' : ''}</div></div>{b.kind !== 'system' && <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)}>Remove</Button>}</div>
          ))}</div>
        )}
      </Section>
      <Section title="Assign a badge">
        <div className="card pad">
          <Field label="Custom label (optional)" hint="e.g. “RP Verified Creator”"><input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} /></Field>
          <Toggle label="Notify the account" checked={notify} onChange={setNotify} />
        </div>
        <Q q={all}>{(d) => (
          <div className="list card">{d.badges.filter((b) => !has.has(b.id)).map((b) => (
            <div key={b.id} className="row"><BadgeIcon badge={b} /><div className="row-main"><strong>{b.name}</strong><div className="muted tiny">{b.description}</div></div><Button size="sm" disabled={b.kind === 'system'} onClick={() => assign.mutate(b.id)}>{b.kind === 'system' ? 'Staff role' : 'Assign'}</Button></div>
          ))}</div>
        )}</Q>
      </Section>
    </>
  );
}

function InventoryTab({ accountId, reload }: { accountId: number; reload: () => void }) {
  const qc = useQueryClient();
  const { push } = useToast();
  const [granting, setGranting] = useState(false);
  const [equip, setEquip] = useState(false);
  const [notify, setNotify] = useState(false);
  const inv = useQuery({ queryKey: ['admin', 'inv', accountId], queryFn: () => api.get<Paged<Item>>(`/api/admin/accounts/${accountId}/inventory?limit=200`) });
  const done = () => { qc.invalidateQueries({ queryKey: ['admin', 'inv', accountId] }); reload(); };
  const grant = useAdminMutation((item: Item) => api.post(`/api/admin/accounts/${accountId}/inventory`, { itemId: item.id, equip, notify }), (r) => { done(); push({ title: r.added.length ? 'Item granted' : 'Already owned' }); });
  const revoke = useAdminMutation((itemId: number) => api.del(`/api/admin/accounts/${accountId}/inventory/${itemId}`), done);
  const reset = useAdminMutation((itemId: number) => api.post(`/api/admin/accounts/${accountId}/reset-item`, { itemId }), (r) => { done(); push({ title: `Purchase undone · balance ${full(r.balance)}` }); });
  return (
    <>
      <Button icon={<Plus size={14} />} onClick={() => setGranting(true)}>Grant item</Button>
      <Q q={inv}>{(d) => (
        <div className="list card">{d.items.map((i) => (
          <div key={i.id} className="row">
            <span className="mini-thumb"><ItemThumb item={i} size={44} /></span>
            <div className="row-main"><strong>{i.name}</strong><div className="muted tiny">{i.category} · {i.rarity}{i.serial ? ` · #${i.serial}` : ''} · {i.source}{i.equipped ? ' · equipped' : ''}</div></div>
            {i.source === 'purchase' && <button className="icon-btn" title="Undo purchase (refund + remove) so it can be bought again on camera" aria-label="Reset purchase" onClick={() => reset.mutate(i.id)}><RotateCcw size={16} /></button>}
            <button className="icon-btn" aria-label="Revoke" onClick={() => { if (confirm(`Revoke ${i.name}?`)) revoke.mutate(i.id); }}><Trash2 size={16} /></button>
          </div>
        ))}</div>
      )}</Q>
      <Sheet open={granting} onClose={() => setGranting(false)} title="Grant an item" tall>
        <Toggle label="Equip after granting" checked={equip} onChange={setEquip} />
        <Toggle label="Notify the account" checked={notify} onChange={setNotify} />
        <ItemPicker onPick={(i) => grant.mutate(i)} />
      </Sheet>
    </>
  );
}

function AvatarTab({ accountId }: { accountId: number }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'avatar', accountId], queryFn: () => api.get<any>(`/api/admin/accounts/${accountId}/avatar`) });
  const [adding, setAdding] = useState(false);
  const [part, setPart] = useState('torso');
  const [name, setName] = useState('');
  const done = () => qc.invalidateQueries({ queryKey: ['admin', 'avatar', accountId] });
  const color = useAdminMutation((c: string) => api.patch(`/api/admin/accounts/${accountId}/avatar`, { bodyColors: part === 'skin' ? { head: c, leftArm: c, rightArm: c } : { [part]: c } }), done);
  const equip = useAdminMutation((itemId: number) => api.post(`/api/admin/accounts/${accountId}/avatar/equip`, { itemId, grant: true }), done);
  const unequip = useAdminMutation((itemId: number) => api.post(`/api/admin/accounts/${accountId}/avatar/unequip`, { itemId }), done);
  const reset = useAdminMutation(() => api.post(`/api/admin/accounts/${accountId}/avatar/reset`), done);
  const saveOutfit = useAdminMutation(() => api.post(`/api/admin/accounts/${accountId}/outfits`, { name }), () => { setName(''); done(); });
  const wear = useAdminMutation((oid: number) => api.post(`/api/admin/accounts/${accountId}/outfits/${oid}/wear`), done);
  const delOutfit = useAdminMutation((oid: number) => api.del(`/api/admin/accounts/${accountId}/outfits/${oid}`), done);
  return (
    <Q q={q}>
      {(av) => {
        const spec = { bodyColors: av.bodyColors, bodyType: av.bodyType, items: av.equipped.filter((e: any) => e.slot !== 'emote').map((e: any) => ({ id: e.itemId, slot: e.slot, ...e.asset })) };
        return (
          <>
            <div className="avatar-stage small"><Avatar spec={spec} size={160} animated /></div>
            <div className="card pad">
              <div className="field-label">Body color</div>
              <div className="row-gap wrap">
                <select className="select-sm" value={part} onChange={(e) => setPart(e.target.value)}>{['skin', 'head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].map((p) => <option key={p} value={p}>{p}</option>)}</select>
                <input type="color" onChange={(e) => color.mutate(e.target.value)} aria-label="Body color" />
                <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} onClick={() => reset.mutate(undefined)}>Reset appearance</Button>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)}>Add item</Button>
              </div>
            </div>
            <Section title="Wearing">
              <div className="list card">{av.equipped.map((e: any) => <div key={e.itemId} className="row"><div className="row-main"><strong>{e.name}</strong><div className="muted tiny">{e.slot}</div></div><Button size="sm" variant="ghost" onClick={() => unequip.mutate(e.itemId)}>Remove</Button></div>)}</div>
            </Section>
            <Section title="Saved outfits">
              <div className="compose"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Outfit name" aria-label="Outfit name" /><Button size="sm" disabled={!name} onClick={() => saveOutfit.mutate(undefined)}>Save current</Button></div>
              <div className="list card">{av.outfits.map((o: any) => <div key={o.id} className="row"><div className="row-main"><strong>{o.name}</strong><div className="muted tiny">{o.itemIds.length} items</div></div><Button size="sm" onClick={() => wear.mutate(o.id)}>Wear</Button><button className="icon-btn" aria-label="Delete outfit" onClick={() => delOutfit.mutate(o.id)}><Trash2 size={16} /></button></div>)}</div>
            </Section>
            <Sheet open={adding} onClose={() => setAdding(false)} title="Add accessory or clothing" tall>
              <p className="muted small">Items not owned are granted first, then equipped.</p>
              <ItemPicker onPick={(i) => equip.mutate(i.id)} />
            </Sheet>
          </>
        );
      }}
    </Q>
  );
}

function SocialTab({ accountId }: { accountId: number }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'social', accountId], queryFn: () => api.get<any>(`/api/admin/accounts/${accountId}/social`) });
  const [pick, setPick] = useState<number[]>([]);
  const [mode, setMode] = useState<'follower' | 'following' | 'friend' | 'request'>('follower');
  const [notify, setNotify] = useState(true);
  const done = () => { qc.invalidateQueries({ queryKey: ['admin', 'social', accountId] }); qc.invalidateQueries({ queryKey: ['admin', 'account', accountId] }); setPick([]); };
  const apply = useAdminMutation(async () => {
    for (const other of pick) {
      if (mode === 'follower') await api.post('/api/admin/social/follow', { followerId: other, followeeId: accountId, notify });
      if (mode === 'following') await api.post('/api/admin/social/follow', { followerId: accountId, followeeId: other, notify });
      if (mode === 'friend') await api.post('/api/admin/social/friendship', { aId: accountId, bId: other, status: 'accepted', notify });
      if (mode === 'request') await api.post('/api/admin/social/friendship', { aId: other, bId: accountId, status: 'pending', requesterId: other, notify });
    }
  }, done);
  const unfollow = useAdminMutation((b: any) => api.post('/api/admin/social/follow', { ...b, remove: true }), done);
  const unfriend = useAdminMutation((other: number) => api.post('/api/admin/social/friendship', { aId: accountId, bId: other, status: 'none' }), done);
  return (
    <Q q={q}>
      {(s) => (
        <>
          <div className="stats-row card"><div className="stat"><strong>{s.stats.followers}</strong><span className="muted tiny">Followers shown</span></div><div className="stat"><strong>{s.stats.following}</strong><span className="muted tiny">Following shown</span></div><div className="stat"><strong>{s.stats.friends}</strong><span className="muted tiny">Friends shown</span></div></div>
          <div className="card pad">
            <div className="chips">{([['follower', 'Add followers'], ['following', 'Follow accounts'], ['friend', 'Add friends'], ['request', 'Incoming requests']] as const).map(([v, l]) => <button key={v} className={`chip ${mode === v ? 'active' : ''}`} onClick={() => setMode(v)}>{l}</button>)}</div>
            <AccountPicker value={pick} onChange={setPick} multiple label="Pick accounts" />
            <Toggle label="Send notifications" checked={notify} onChange={setNotify} />
            <Button disabled={!pick.length} loading={apply.isPending} onClick={() => apply.mutate(undefined)}>Apply to {pick.length} account(s)</Button>
          </div>
          <Section title={`Followers (${s.followers.length})`}><div className="list card">{s.followers.map((f: AccountCard) => <AccountRow key={f.id} account={f} to="" right={<Button size="sm" variant="ghost" onClick={() => unfollow.mutate({ followerId: f.id, followeeId: accountId })}>Remove</Button>} />)}</div></Section>
          <Section title={`Following (${s.following.length})`}><div className="list card">{s.following.map((f: AccountCard) => <AccountRow key={f.id} account={f} to="" right={<Button size="sm" variant="ghost" onClick={() => unfollow.mutate({ followerId: accountId, followeeId: f.id })}>Remove</Button>} />)}</div></Section>
          <Section title={`Friendships (${s.friendships.length})`}><div className="list card">{s.friendships.map((f: any) => <AccountRow key={f.id} account={f.account} to="" sub={f.status} right={<Button size="sm" variant="ghost" onClick={() => unfriend.mutate(f.account.id)}>Remove</Button>} />)}</div></Section>
        </>
      )}
    </Q>
  );
}

function PresetsTab({ accountId, reload }: { accountId: number; reload: () => void }) {
  const { push } = useToast();
  const { refresh } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'presets'], queryFn: () => api.get<{ presets: any[] }>('/api/admin/presets') });
  const [name, setName] = useState('');
  const apply = useAdminMutation(({ id, switchTo }: { id: number; switchTo: boolean }) => api.post(`/api/admin/presets/${id}/apply`, { accountId, switchTo }), async (r) => {
    reload();
    await refresh();
    qc.invalidateQueries();
    push({ kind: 'success', title: `Preset applied${r.report.skipped.length ? ` (${r.report.skipped.length} skipped)` : ''}` });
  });
  const snap = useAdminMutation(() => api.post(`/api/admin/presets/from-account/${accountId}`, { name, kind: 'custom' }), () => { setName(''); qc.invalidateQueries({ queryKey: ['admin', 'presets'] }); push({ title: 'Saved as preset' }); });
  return (
    <>
      <div className="card pad"><div className="field-label">Save this account’s current look, stats and inventory as a preset</div><div className="compose"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preset name" aria-label="Preset name" /><Button size="sm" disabled={!name} onClick={() => snap.mutate(undefined)}>Snapshot</Button></div></div>
      <Q q={q}>{(d) => (
        <div className="list card">{d.presets.map((p) => (
          <div key={p.id} className="row"><div className="row-main"><strong>{p.name}</strong><div className="muted tiny">{p.kind} · {p.description}</div></div>
            <Button size="sm" onClick={() => { if (confirm(`Apply “${p.name}” to this account?`)) apply.mutate({ id: p.id, switchTo: false }); }}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={() => apply.mutate({ id: p.id, switchTo: true })}>Apply & switch</Button>
          </div>
        ))}</div>
      )}</Q>
      <Link to="/modify/presets" className="link small">Manage presets</Link>
    </>
  );
}
