import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Copy, Download, Play, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Button, Field, PageHeader, Q, Section, Sheet, Tabs, Toggle } from '../components/ui';
import { dateTime, downloadJson, full, timeAgo } from '../lib/format';
import { useCinematic, useMe, useSession, useToast } from '../state';
import type { Paged } from '../types';
import { AccountPicker, JsonField, useAdminMutation } from './common';

// ───────────── Currency ─────────────

export function CurrencyAdmin() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [type, setType] = useState('');
  const [scripted, setScripted] = useState(false);
  const ledger = useQuery({ queryKey: ['admin', 'ledger', type, scripted], queryFn: () => api.get<Paged<any>>(`/api/admin/transactions?limit=100${type ? `&type=${type}` : ''}${scripted ? '&scripted=1' : ''}`) });
  const [resetBal, setResetBal] = useState('500');
  const [scope, setScope] = useState<'fictional' | 'all'>('fictional');
  const reset = useAdminMutation(() => api.post('/api/admin/wallets/reset', { balance: Number(resetBal) || 0, scope }), (r) => { push({ title: `Reset ${r.reset} wallets` }); qc.invalidateQueries({ queryKey: ['admin'] }); });
  return (
    <div className="page">
      <PageHeader title="Fictional currency" subtitle="Sparks · roleplay only, never redeemable" />
      <p className="muted small">Set, add or remove Sparks per account from the account editor. Every change writes a ledger row and an audit entry.</p>
      <Section title="Reset balances">
        <div className="card pad">
          <div className="two-col">
            <Field label="New balance"><input inputMode="numeric" value={resetBal} onChange={(e) => setResetBal(e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Accounts"><select value={scope} onChange={(e) => setScope(e.target.value as any)}><option value="fictional">Fictional accounts</option><option value="all">Every account</option></select></Field>
          </div>
          <Button variant="danger" loading={reset.isPending} onClick={() => { if (confirm(`Set every ${scope === 'all' ? '' : 'fictional '}wallet to ${resetBal}?`)) reset.mutate(undefined); }}>Reset balances</Button>
        </div>
      </Section>
      <Section title="Global ledger">
        <div className="row-gap">
          <select className="select-sm" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{['purchase', 'sale', 'refund', 'reward', 'daily_reward', 'game_reward', 'event_reward', 'admin_add', 'admin_remove', 'admin_set', 'scripted', 'fee', 'starting_balance'].map((t) => <option key={t}>{t}</option>)}</select>
          <Toggle label="Scripted only" checked={scripted} onChange={setScripted} />
        </div>
        <Q q={ledger}>{(d) => (
          <div className="list card">{d.items.map((t: any) => (
            <div key={t.id} className="row tx"><div className="row-main"><strong>@{t.username} · {t.description}</strong><div className="muted tiny">{t.type}{t.scripted ? ' · scripted' : ''} · {dateTime(t.createdAt)}</div></div><div className="tx-amount"><span className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount >= 0 ? '+' : '−'}{full(Math.abs(t.amount))}</span></div></div>
          ))}</div>
        )}</Q>
      </Section>
    </div>
  );
}

// ───────────── Events ─────────────

export function EventsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'events'], queryFn: () => api.get<{ events: any[]; types: { platform: string[]; game: string[] } }>('/api/admin/events') });
  const [scope, setScope] = useState<'platform' | 'game'>('platform');
  const [open, setOpen] = useState<any | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeader title="Scripted events" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen('new')}>New event</Button>} />
      <Tabs value={scope} onChange={setScope} tabs={[{ value: 'platform', label: 'Platform events' }, { value: 'game', label: 'LARP game events' }]} />
      <Q q={q}>{(d) => (
        <div className="list card">{d.events.filter((e) => e.scope === scope).map((e) => (
          <button key={e.id} className="row" onClick={() => setOpen(e)}>
            <div className="row-main"><strong>{e.name}</strong><div className="muted tiny">{e.type} · run {e.runCount}×{e.lastRunAt ? ` · last ${timeAgo(e.lastRunAt)}` : ''}</div><div className="muted tiny">{e.description}</div></div>
            <Play size={16} />
          </button>
        ))}</div>
      )}</Q>
      {open && q.data && <EventSheet ev={open === 'new' ? null : open} types={q.data.types} defaultScope={scope} onClose={() => setOpen(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['admin', 'events'] })} />}
    </div>
  );
}

function EventSheet({ ev, types, defaultScope, onClose, onChanged }: { ev: any | null; types: { platform: string[]; game: string[] }; defaultScope: 'platform' | 'game'; onClose: () => void; onChanged: () => void }) {
  const me = useMe();
  const { push } = useToast();
  const { refresh } = useSession();
  const [name, setName] = useState(ev?.name ?? '');
  const [description, setDescription] = useState(ev?.description ?? '');
  const [scope, setScope] = useState<'platform' | 'game'>(ev?.scope ?? defaultScope);
  const [type, setType] = useState(ev?.type ?? types[defaultScope][0]);
  const [params, setParams] = useState<any>(ev?.params ?? {});
  const [targets, setTargets] = useState<number[]>([me.account.id]);
  const [sessionId, setSessionId] = useState('');
  const [overrides, setOverrides] = useState<any>({});
  const sessions = useQuery({ queryKey: ['admin', 'game', 'sessions', 'open'], queryFn: () => api.get<any>('/api/admin/game/sessions?status=open'), enabled: scope === 'game' });
  const runs = useQuery({ queryKey: ['admin', 'event-runs', ev?.id], queryFn: () => api.get<any>(`/api/admin/events/${ev.id}/runs`), enabled: Boolean(ev) });
  const save = useAdminMutation(() => (ev ? api.patch(`/api/admin/events/${ev.id}`, { name, description, scope, type, params }) : api.post('/api/admin/events', { name, description, scope, type, params })), () => { push({ kind: 'success', title: 'Event saved' }); onChanged(); if (!ev) onClose(); });
  const run = useAdminMutation(() => api.post(`/api/admin/events/${ev.id}/run`, { accountIds: scope === 'platform' ? targets : [], sessionId: scope === 'game' ? Number(sessionId) : null, overrides }), async () => {
    push({ kind: 'success', title: `Ran “${ev.name}”` });
    onChanged();
    runs.refetch();
    refresh();
  });
  const dup = useAdminMutation(() => api.post(`/api/admin/events/${ev.id}/duplicate`), () => { onChanged(); onClose(); });
  const del = useAdminMutation(() => api.del(`/api/admin/events/${ev.id}`), () => { onChanged(); onClose(); });
  return (
    <Sheet open onClose={onClose} title={ev ? ev.name : 'New scripted event'} tall>
      {ev && (
        <section className="section">
          <h4>Run this event</h4>
          {scope === 'platform'
            ? <AccountPicker value={targets} onChange={setTargets} multiple label="Target accounts" />
            : <Field label="LARP session"><select value={sessionId} onChange={(e) => setSessionId(e.target.value)}><option value="">Pick a running session…</option>{sessions.data?.sessions.filter((s: any) => s.status === 'active').map((s: any) => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}</select></Field>}
          <JsonField label="One-off parameter overrides" value={overrides} onChange={setOverrides} rows={2} />
          <Button icon={<Play size={14} />} loading={run.isPending} disabled={scope === 'platform' ? !targets.length && type !== 'marketplace_drop' && type !== 'group_event' : !sessionId} onClick={() => run.mutate(undefined)}>Run now</Button>
          {runs.data?.runs.length > 0 && <div className="timeline small">{runs.data.runs.slice(0, 6).map((r: any) => <div key={r.id} className="timeline-row"><span className="dot" /><div><strong>{r.by ?? 'staff'}</strong> <span className="muted tiny">{dateTime(r.at)} · {r.target.accountIds?.length ?? 0} accounts{r.target.sessionId ? ` · session #${r.target.sessionId}` : ''}</span></div></div>)}</div>}
        </section>
      )}
      <h4>Definition</h4>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="two-col">
        <Field label="Scope"><select value={scope} onChange={(e) => { const s = e.target.value as 'platform' | 'game'; setScope(s); setType(types[s][0]); }}><option value="platform">Platform</option><option value="game">LARP game</option></select></Field>
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)}>{types[scope].map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <JsonField key={type + (ev?.id ?? '')} label="Parameters" value={params} onChange={setParams} rows={6} />
      <div className="row-gap">
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
        {ev && <Button variant="secondary" icon={<Copy size={14} />} onClick={() => dup.mutate(undefined)}>Duplicate</Button>}
        {ev && <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { if (confirm('Delete this event?')) del.mutate(undefined); }}>Delete</Button>}
      </div>
    </Sheet>
  );
}

// ───────────── Presets ─────────────

export function PresetsAdmin() {
  const qc = useQueryClient();
  const { push } = useToast();
  const file = useRef<HTMLInputElement>(null);
  const q = useQuery({ queryKey: ['admin', 'presets'], queryFn: () => api.get<{ presets: any[]; kinds: string[] }>('/api/admin/presets') });
  const [open, setOpen] = useState<any | 'new' | null>(null);
  const [snap, setSnap] = useState(false);
  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'presets'] });
  const importP = useAdminMutation(async (f: File) => api.post('/api/admin/presets/import', JSON.parse(await f.text())), () => { push({ kind: 'success', title: 'Preset imported' }); reload(); });
  return (
    <div className="page">
      <PageHeader title="Scenario presets" right={<div className="row-gap"><Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => file.current?.click()}>Import</Button><Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen('new')}>New</Button></div>} />
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importP.mutate(f); e.target.value = ''; }} />
      <p className="muted small">Presets set an account’s profile, staged stats, balance, badges, inventory, look and notifications in one step. Items and badges are stored by SKU/key so exports work on any Larpverse server.</p>
      <Button size="sm" variant="ghost" onClick={() => setSnap(true)}>Snapshot an account as a preset</Button>
      <Q q={q}>{(d) => (
        <div className="list card">{d.presets.map((p) => (
          <button key={p.id} className="row" onClick={() => setOpen(p)}><div className="row-main"><strong>{p.name}</strong><div className="muted tiny">{p.kind} · {p.description}</div></div></button>
        ))}</div>
      )}</Q>
      {open && q.data && <PresetSheet preset={open === 'new' ? null : open} kinds={q.data.kinds} onClose={() => setOpen(null)} onChanged={reload} />}
      {snap && <SnapshotSheet onClose={() => setSnap(false)} onDone={() => { setSnap(false); reload(); }} />}
    </div>
  );
}

function SnapshotSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [acc, setAcc] = useState<number[]>([]);
  const [name, setName] = useState('');
  const run = useAdminMutation(() => api.post(`/api/admin/presets/from-account/${acc[0]}`, { name, kind: 'custom' }), onDone);
  return (
    <Sheet open onClose={onClose} title="Snapshot an account" tall footer={<Button block disabled={!acc.length || !name} loading={run.isPending} onClick={() => run.mutate(undefined)}>Save preset</Button>}>
      <Field label="Preset name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <AccountPicker value={acc} onChange={setAcc} label="Account to capture" />
    </Sheet>
  );
}

function PresetSheet({ preset, kinds, onClose, onChanged }: { preset: any | null; kinds: string[]; onClose: () => void; onChanged: () => void }) {
  const me = useMe();
  const { push } = useToast();
  const { refresh } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState(preset?.name ?? '');
  const [kind, setKind] = useState(preset?.kind ?? 'custom');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [data, setData] = useState<any>(preset?.data ?? { version: 1, balance: 1000 });
  const [target, setTarget] = useState<number[]>([me.account.id]);
  const [switchTo, setSwitchTo] = useState(false);
  const save = useAdminMutation(() => (preset ? api.patch(`/api/admin/presets/${preset.id}`, { name, kind, description, data }) : api.post('/api/admin/presets', { name, kind, description, data })), () => { push({ kind: 'success', title: 'Preset saved' }); onChanged(); if (!preset) onClose(); });
  const apply = useAdminMutation(() => api.post(`/api/admin/presets/${preset.id}/apply`, { accountId: target[0], switchTo }), async (r) => {
    await refresh();
    qc.invalidateQueries();
    push({ kind: 'success', title: `Applied${r.report.session ? ' · LARP session ready' : ''}${r.report.skipped.length ? ` · ${r.report.skipped.length} skipped` : ''}` });
  });
  const dup = useAdminMutation(() => api.post(`/api/admin/presets/${preset.id}/duplicate`), () => { onChanged(); onClose(); });
  const del = useAdminMutation(() => api.del(`/api/admin/presets/${preset.id}`), () => { onChanged(); onClose(); });
  const exp = useAdminMutation(() => api.get(`/api/admin/presets/${preset.id}/export`), (r) => downloadJson(`${preset.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.larpverse-preset.json`, r));
  return (
    <Sheet open onClose={onClose} title={preset ? preset.name : 'New preset'} tall>
      {preset && (
        <section className="section">
          <h4>Load preset</h4>
          <AccountPicker value={target} onChange={setTarget} label="Apply to account" />
          <Toggle label="Switch into the account afterwards" checked={switchTo} onChange={setSwitchTo} />
          <Button icon={<Play size={14} />} disabled={!target.length} loading={apply.isPending} onClick={() => apply.mutate(undefined)}>Apply preset</Button>
        </section>
      )}
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="two-col">
        <Field label="Kind"><select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <JsonField key={preset?.id ?? 'new'} label="Preset data (profile, balance, statOverrides, joinDateDaysAgo, badges, inventory, look, notifications, transactions, larpSession)" value={data} onChange={setData} rows={14} />
      <div className="row-gap wrap">
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
        {preset && <Button variant="secondary" icon={<Copy size={14} />} onClick={() => dup.mutate(undefined)}>Duplicate</Button>}
        {preset && <Button variant="secondary" icon={<Download size={14} />} onClick={() => exp.mutate(undefined)}>Export</Button>}
        {preset && <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { if (confirm('Delete this preset?')) del.mutate(undefined); }}>Delete</Button>}
      </div>
    </Sheet>
  );
}

// ───────────── Notifications ─────────────

const NTYPES = ['system', 'friend_request', 'friend_accept', 'follow', 'purchase', 'sale', 'reward', 'badge', 'group', 'game_invite', 'event', 'announcement', 'security'];

export function NotificationsAdmin() {
  const me = useMe();
  const { push } = useToast();
  const [targets, setTargets] = useState<number[]>([me.account.id]);
  const [actor, setActor] = useState<number[]>([]);
  const [type, setType] = useState('system');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [delay, setDelay] = useState('0');
  const send = useAdminMutation(() => api.post('/api/admin/notifications', { accountIds: targets, type, title, body, actorAccountId: actor[0] ?? null, delaySeconds: Number(delay) || 0 }), (r) => push({ kind: 'success', title: r.scheduled ? `Scheduled in ${delay}s` : `Sent to ${r.sent}` }));
  return (
    <div className="page">
      <PageHeader title="Scripted notifications" />
      <div className="card pad">
        <div className="two-col">
          <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)}>{NTYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Delay (seconds)" hint="Great for timing a recording"><input inputMode="numeric" value={delay} onChange={(e) => setDelay(e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="NovaStudio sent you a friend request" /></Field>
        <Field label="Body"><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} /></Field>
        <Button loading={send.isPending} disabled={!title || !targets.length} onClick={() => send.mutate(undefined)}>Send</Button>
      </div>
      <AccountPicker value={targets} onChange={setTargets} multiple label="Recipients" />
      <AccountPicker value={actor} onChange={setActor} label="Shown as coming from (optional)" />
    </div>
  );
}

// ───────────── Audit ─────────────

export function AuditAdmin() {
  const [action, setAction] = useState('');
  const [open, setOpen] = useState<any>(null);
  const q = useQuery({ queryKey: ['admin', 'audit', action], queryFn: () => api.get<Paged<any>>(`/api/admin/audit?limit=200${action ? `&action=${encodeURIComponent(action)}` : ''}`) });
  return (
    <div className="page">
      <PageHeader title="Audit log" />
      <div className="chips">{['', 'account.', 'currency.', 'badge.', 'inventory.', 'purchase.', 'avatar.', 'social.', 'item.', 'experience.', 'game.', 'event.', 'preset.', 'notification.', 'config.', 'staff.', 'security.', 'admin.'].map((a) => <button key={a || 'all'} className={`chip ${action === a ? 'active' : ''}`} onClick={() => setAction(a)}>{a ? a.replace('.', '') : 'all'}</button>)}</div>
      <Q q={q}>{(d) => (
        <div className="list card">{d.items.map((l: any) => (
          <button key={l.id} className="row" onClick={() => setOpen(l)}><div className="row-main"><strong>{l.action}</strong><div className="muted tiny">{l.user}{l.actingAs ? ` as @${l.actingAs}` : ''} · {l.targetType ?? ''} {l.targetId ?? ''} · {dateTime(l.at)}</div></div></button>
        ))}</div>
      )}</Q>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.action}>{open && <pre className="mono small pre-scroll">{JSON.stringify(open, null, 2)}</pre>}</Sheet>
    </div>
  );
}

// ───────────── Config ─────────────

export function ConfigAdmin() {
  const { push } = useToast();
  const q = useQuery({ queryKey: ['admin', 'config'], queryFn: () => api.get<any>('/api/admin/config') });
  return (
    <div className="page">
      <PageHeader title="Economy & platform config" />
      <Q q={q}>{(d) => <ConfigForm initial={d} onSaved={() => push({ kind: 'success', title: 'Configuration saved' })} />}</Q>
    </div>
  );
}

function ConfigForm({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [e, setE] = useState<any>(initial.economy);
  const [motd, setMotd] = useState(initial.platform.motd ?? '');
  const save = useAdminMutation(() => api.patch('/api/admin/config', { economy: e, platform: { motd } }), onSaved);
  const num = (k: string, label: string, hint?: string, step?: string) => (
    <Field label={label} hint={hint}><input type="number" step={step} value={e[k]} onChange={(ev) => setE({ ...e, [k]: Number(ev.target.value) })} /></Field>
  );
  return (
    <div className="card pad">
      <div className="two-col">{num('startingBalance', 'Starting balance', 'New accounts')}{num('dailyReward', 'Daily reward')}</div>
      <div className="two-col">{num('dailyCooldownHours', 'Daily cooldown (hours)')}{num('sessionCompletionReward', 'LARP completion reward')}</div>
      <div className="two-col">{num('groupCreateCost', 'Group creation cost')}{num('usernameChangeCost', 'Username change cost')}</div>
      <div className="two-col">{num('creatorShare', 'Creator share of sales', '0–1', '0.05')}{num('refundWindowMinutes', 'Refund window (minutes)')}</div>
      {num('maxAltAccounts', 'Extra accounts per login')}
      <Field label="Home screen message"><input value={motd} onChange={(ev) => setMotd(ev.target.value)} maxLength={200} /></Field>
      <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
    </div>
  );
}

// ───────────── Staff ─────────────

export function StaffAdmin() {
  const qc = useQueryClient();
  const { push } = useToast();
  const q = useQuery({ queryKey: ['admin', 'staff'], queryFn: () => api.get<any>('/api/admin/staff') });
  const [open, setOpen] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] });
  const upd = useAdminMutation(({ id, b }: { id: number; b: any }) => api.patch(`/api/admin/staff/${id}`, b), () => { reload(); push({ title: 'Updated' }); });
  return (
    <div className="page">
      <PageHeader title="Staff & permissions" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>Staff login</Button>} />
      <Q q={q}>{(d) => (
        <>
          <div className="list card">{d.users.map((u: any) => (
            <div key={u.id} className="row">
              <button className="row-main left" onClick={() => setOpen(u)}><strong>{u.username}</strong><div className="muted tiny">{u.staffRole} · {u.status}{u.mfaEnabled ? ' · 2-step' : ''} · last login {timeAgo(u.lastLoginAt)}{Object.keys(u.overrides).length ? ` · ${Object.keys(u.overrides).length} overrides` : ''}</div></button>
              {u.staffRole !== 'owner' && (
                <select className="select-sm" value={u.staffRole} onChange={(e) => upd.mutate({ id: u.id, b: { staffRole: e.target.value } })}><option value="user">user</option><option value="moderator">moderator</option><option value="admin">admin</option></select>
              )}
            </div>
          ))}</div>
          {open && <PermSheet user={open} permissions={d.permissions} onClose={() => setOpen(null)} onSaved={() => { reload(); setOpen(null); }} onStatus={(s) => upd.mutate({ id: open.id, b: { status: s } })} />}
        </>
      )}</Q>
      {creating && <CreateStaff onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
    </div>
  );
}

function PermSheet({ user, permissions, onClose, onSaved, onStatus }: { user: any; permissions: Record<string, string>; onClose: () => void; onSaved: () => void; onStatus: (s: string) => void }) {
  const [o, setO] = useState<Record<string, boolean | null>>(user.overrides);
  const save = useAdminMutation(() => api.put(`/api/admin/staff/${user.id}/permissions`, { overrides: Object.fromEntries(Object.keys(permissions).filter((p) => p !== 'staff.manage').map((p) => [p, o[p] ?? null])) }), onSaved);
  return (
    <Sheet open onClose={onClose} title={user.username} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save overrides</Button>}>
      <p className="muted small">Role: {user.staffRole}. Overrides grant or revoke individual permissions on top of the role.</p>
      {user.staffRole !== 'owner' && <Button size="sm" variant={user.status === 'active' ? 'danger' : 'secondary'} onClick={() => onStatus(user.status === 'active' ? 'disabled' : 'active')}>{user.status === 'active' ? 'Disable login' : 'Enable login'}</Button>}
      {Object.entries(permissions).filter(([p]) => p !== 'staff.manage').map(([p, label]) => (
        <div key={p} className="toggle-row">
          <span><span className="toggle-label">{p}</span><span className="field-hint">{label}</span></span>
          <select className="select-sm" value={o[p] === undefined || o[p] === null ? '' : o[p] ? 'grant' : 'revoke'} onChange={(e) => setO({ ...o, [p]: e.target.value === '' ? null : e.target.value === 'grant' })}>
            <option value="">role default</option><option value="grant">grant</option><option value="revoke">revoke</option>
          </select>
        </div>
      ))}
    </Sheet>
  );
}

function CreateStaff({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState('moderator');
  const run = useAdminMutation(() => api.post('/api/admin/staff', { username, password, staffRole }), onDone);
  return (
    <Sheet open onClose={onClose} title="New staff login" footer={<Button block loading={run.isPending} onClick={() => run.mutate(undefined)}>Create</Button>}>
      <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
      <Field label="Temporary password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Role"><select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}><option value="moderator">Moderator</option><option value="admin">Admin</option><option value="user">User</option></select></Field>
    </Sheet>
  );
}

// ───────────── Cinematic mode ─────────────

export function CinematicAdmin() {
  const cine = useCinematic();
  return (
    <div className="page">
      <PageHeader title="Cinematic mode" />
      <div className="card pad">
        <p><Clapperboard size={16} /> A clean, recording-friendly layout for Android screen recording. Staff entry points and connection banners are hidden, and a small floating <strong>Director</strong> button gives you fast scenario switching while you film.</p>
        <Toggle label="Cinematic mode" checked={cine.enabled} onChange={cine.setEnabled} />
        <Toggle label="Hide the Android status bar" checked={cine.options.hideStatusBar} onChange={(v) => cine.setOption('hideStatusBar', v)} />
        <Toggle label="Larger text" checked={cine.options.largeText} onChange={(v) => cine.setOption('largeText', v)} />
        <Toggle label="Instant notification banners" hint="Checks for new notifications every few seconds so scripted ones pop up on cue" checked={cine.options.fastNotifications} onChange={(v) => cine.setOption('fastNotifications', v)} />
      </div>
      <Section title="While recording">
        <ul className="tips">
          <li>Tap the Director button for presets, account switching, scripted notifications and events.</li>
          <li>Long-press the Larpverse logo to hide or show the Director button.</li>
          <li>“Reset last purchase” undoes a purchase so the same purchase flow can be filmed again.</li>
          <li>Every action is still recorded in the audit log.</li>
        </ul>
      </Section>
    </div>
  );
}
