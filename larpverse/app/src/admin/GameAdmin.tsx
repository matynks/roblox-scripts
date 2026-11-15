import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Button, Field, PageHeader, Q, Sheet, Tabs, Toggle } from '../components/ui';
import { dateTime, duration } from '../lib/format';
import { useToast } from '../state';
import type { SessionSummary } from '../types';
import { AccountPicker, JsonField, useAdminMutation } from './common';

const ROLE_PERMS = ['sell', 'cite', 'heal', 'broadcast', 'interview', 'announce', 'grant_bonus', 'perform', 'trigger_events'];
const OBJ_TYPES = ['earn', 'work', 'collect', 'chat', 'buy', 'heal', 'cite', 'interview', 'perform', 'broadcast', 'clue', 'gift', 'visit'];
const EVENT_DEFAULTS: Record<string, any> = {
  coin_rain: { count: 30 }, market_sale: { multiplier: 0.5, durationSeconds: 60 }, breaking_news: { text: 'Big news downtown!' }, blackout: { durationSeconds: 30 },
  award_ceremony: { title: 'Star of the Night', winner: 'top_earner', rewardSparks: 500, rewardItemSku: 'special-spotlight-aura', badgeKey: 'special_event' },
  cash_bonus: { amount: 75 }, clue_hunt: { count: 6 }, announcement: { text: 'Attention, citizens!' }, weather_rain: { durationSeconds: 60 }, spotlight: { durationSeconds: 15 },
};

export function GameAdmin() {
  const [tab, setTab] = useState<'sessions' | 'roles' | 'scenarios' | 'items'>('sessions');
  return (
    <div className="page">
      <PageHeader title="LARP game" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'sessions', label: 'Sessions' }, { value: 'roles', label: 'Roles' }, { value: 'scenarios', label: 'Scenarios' }, { value: 'items', label: 'Game items' }]} />
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'scenarios' && <ScenariosTab />}
      {tab === 'items' && <GameItemsTab />}
    </div>
  );
}

function SessionsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'open' | 'ended'>('open');
  const list = useQuery({ queryKey: ['admin', 'game', 'sessions', status], queryFn: () => api.get<{ sessions: SessionSummary[] }>(`/api/admin/game/sessions?status=${status}`), refetchInterval: 6000 });
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="row-gap">
        <Tabs value={status} onChange={setStatus} tabs={[{ value: 'open', label: 'Open' }, { value: 'ended', label: 'Ended' }]} />
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>Create session</Button>
      </div>
      <Q q={list}>{(d) => d.sessions.length === 0 ? <p className="muted">No sessions.</p> : (
        <div className="list card">{d.sessions.map((s) => (
          <button key={s.id} className="row" onClick={() => setOpen(s.id)}>
            <span className={`status-dot status-${s.status}`} />
            <div className="row-main"><strong>{s.name}</strong><div className="muted tiny">#{s.id} · {s.scenario?.name} · {s.status} · host {s.host?.displayName} · {s.players}/{s.maxPlayers}{s.elapsedMs ? ` · ${duration(s.elapsedMs)}` : ''}{s.accessCode ? ` · code ${s.accessCode}` : ''}</div></div>
          </button>
        ))}</div>
      )}</Q>
      {creating && <CreateStaffSession onClose={() => setCreating(false)} onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['admin', 'game'] }); }} />}
      {open && <SessionControl id={open} onClose={() => { setOpen(null); qc.invalidateQueries({ queryKey: ['admin', 'game'] }); }} />}
    </>
  );
}

function CreateStaffSession({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const exps = useQuery({ queryKey: ['admin', 'experiences'], queryFn: () => api.get<any>('/api/admin/experiences') });
  const scen = useQuery({ queryKey: ['admin', 'scenarios'], queryFn: () => api.get<{ scenarios: any[] }>('/api/admin/game/scenarios') });
  const [host, setHost] = useState<number[]>([]);
  const [experienceId, setExperienceId] = useState('');
  const [scenarioId, setScenarioId] = useState('');
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const create = useAdminMutation(() => api.post('/api/admin/game/sessions', { hostAccountId: host[0], experienceId: Number(experienceId), scenarioId: scenarioId ? Number(scenarioId) : undefined, name: name || undefined, privacy }), onDone);
  return (
    <Sheet open onClose={onClose} title="Create a LARP session" tall footer={<Button block loading={create.isPending} disabled={!experienceId} onClick={() => create.mutate(undefined)}>Create</Button>}>
      <Field label="Experience"><select value={experienceId} onChange={(e) => setExperienceId(e.target.value)}><option value="">Pick…</option>{exps.data?.items.filter((x: any) => x.engine === 'larp').map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Scenario"><select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}><option value="">Experience default</option>{scen.data?.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} /></Field>
      <Field label="Privacy"><select value={privacy} onChange={(e) => setPrivacy(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Private</option></select></Field>
      <AccountPicker value={host} onChange={setHost} label="Host account (default: the account you’re acting as)" />
    </Sheet>
  );
}

function SessionControl({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { push } = useToast();
  const d = useQuery({ queryKey: ['admin', 'game', 'session', id], queryFn: () => api.get<any>(`/api/game/sessions/${id}`), refetchInterval: 4000 });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<any>('/api/game/meta') });
  const [extras, setExtras] = useState<number[]>([]);
  const [evType, setEvType] = useState('coin_rain');
  const [evParams, setEvParams] = useState<any>(EVENT_DEFAULTS.coin_rain);
  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'game', 'session', id] });
  const control = useAdminMutation((action: string) => api.post(`/api/admin/game/sessions/${id}/control`, { action }), reload);
  const addExtras = useAdminMutation(async () => { for (const accountId of extras) await api.post(`/api/admin/game/sessions/${id}/participants`, { accountId }); }, () => { setExtras([]); reload(); });
  const assign = useAdminMutation((b: any) => api.post(`/api/admin/game/sessions/${id}/assign-role`, b), reload);
  const kick = useAdminMutation((accountId: number) => api.post(`/api/admin/game/sessions/${id}/kick`, { accountId }), reload);
  const fire = useAdminMutation(() => api.post(`/api/admin/game/sessions/${id}/event`, { type: evType, params: evParams }), (r) => { push({ title: r.winner ? `Winner: ${r.winner.name} (${r.winner.rewards.join(', ') || 'no rewards'})` : 'Event triggered' }); reload(); });
  const scenario = useAdminMutation((scenarioId: number) => api.post(`/api/admin/game/sessions/${id}/scenario`, { scenarioId }), reload);
  return (
    <Sheet open onClose={onClose} title={`Session #${id}`} tall>
      <Q q={d}>{(s) => (
        <>
          <div className="kv"><span>{s.name}</span><span className={`status-${s.status}`}>{s.status}</span></div>
          <div className="muted tiny">{s.scenario?.name} · host {s.host?.displayName}{s.accessCode ? ` · code ${s.accessCode}` : ''}</div>
          {s.status !== 'ended' && (
            <>
              <div className="row-gap wrap">
                {s.status === 'lobby' && <Button size="sm" onClick={() => control.mutate('start')}>Start</Button>}
                {s.status === 'active' && <Button size="sm" variant="secondary" onClick={() => control.mutate('pause')}>Pause</Button>}
                {s.status === 'paused' && <Button size="sm" onClick={() => control.mutate('resume')}>Resume</Button>}
                <Button size="sm" variant="secondary" onClick={() => control.mutate('reset')}>Reset scenario</Button>
                <Button size="sm" variant="danger" onClick={() => { if (confirm('End this session?')) control.mutate('end'); }}>End</Button>
                <Link className="btn btn-ghost btn-sm" to={`/play/${s.experienceId}?session=${s.id}`}><Play size={14} /> Join as me</Link>
              </div>
              {s.status === 'lobby' && meta.data && <Field label="Scenario"><select value={s.scenario?.id} onChange={(e) => scenario.mutate(Number(e.target.value))}>{meta.data.scenarios.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
              <h4>Trigger an event</h4>
              <div className="row-gap wrap">
                <select className="select-sm" value={evType} onChange={(e) => { setEvType(e.target.value); setEvParams(EVENT_DEFAULTS[e.target.value] ?? {}); }}>{Object.keys(EVENT_DEFAULTS).map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <JsonField key={evType} label="Parameters (staff can include rewardSparks / rewardItemSku / badgeKey)" value={evParams} onChange={setEvParams} rows={4} />
              <Button size="sm" disabled={s.status !== 'active'} loading={fire.isPending} onClick={() => fire.mutate(undefined)}>Fire event</Button>
              <h4>Add roleplay extras</h4>
              <AccountPicker value={extras} onChange={setExtras} multiple label="Fictional accounts (they wander the city as NPCs)" />
              <Button size="sm" disabled={!extras.length} loading={addExtras.isPending} onClick={() => addExtras.mutate(undefined)}>Add {extras.length} extra(s)</Button>
            </>
          )}
          <h4>Participants</h4>
          <div className="list card">{s.participants.map((p: any) => (
            <div key={p.accountId} className="row">
              <div className="row-main"><strong>{p.characterName}</strong><div className="muted tiny">@{p.username} · {p.status}{p.isBot ? ' · extra' : ''}{p.isHost ? ' · host' : ''}{p.connected ? ' · connected' : ''} · earned ${p.stats?.earned ?? 0}</div></div>
              {s.status !== 'ended' && p.status === 'active' && meta.data && (
                <select className="select-sm" value={p.role?.id} onChange={(e) => assign.mutate({ accountId: p.accountId, roleId: Number(e.target.value) })}>{meta.data.roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              )}
              {s.status !== 'ended' && p.status === 'active' && <button className="icon-btn" aria-label="Kick" onClick={() => kick.mutate(p.accountId)}><Trash2 size={16} /></button>}
            </div>
          ))}</div>
          <h4>Session log</h4>
          <div className="timeline small">{s.log.map((l: any, i: number) => <div key={i} className="timeline-row"><span className="dot" /><div><strong>{l.kind}</strong> <span className="muted tiny">{dateTime(l.at)}</span></div></div>)}</div>
        </>
      )}</Q>
    </Sheet>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => api.get<{ roles: any[] }>('/api/admin/game/roles') });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<any>('/api/game/meta') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  return (
    <>
      <Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New role</Button>
      <Q q={q}>{(d) => (
        <div className="list card">{d.roles.map((r) => (
          <button key={r.id} className="row" onClick={() => setEdit(r)}>
            <span className="role-dot" style={{ background: r.color }} />
            <div className="row-main"><strong>{r.name}{r.isDefault ? ' (default)' : ''}</strong><div className="muted tiny">{r.workZone ?? 'no workplace'} · ${r.salary}/shift · {r.permissions.join(', ') || 'no special actions'}{r.maxPerSession ? ` · max ${r.maxPerSession}` : ''}{r.hostOnly ? ' · host only' : ''}</div></div>
          </button>
        ))}</div>
      )}</Q>
      {edit && <RoleEditor role={edit === 'new' ? null : edit} zones={meta.data?.zones ?? []} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'roles'] }); qc.invalidateQueries({ queryKey: ['game-meta'] }); setEdit(null); }} />}
    </>
  );
}

function RoleEditor({ role, zones, onClose, onSaved }: { role: any | null; zones: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    key: role?.key ?? '', name: role?.name ?? '', description: role?.description ?? '', color: role?.color ?? '#64748b', permissions: role?.permissions ?? [],
    salary: String(role?.salary ?? 20), workZone: role?.workZone ?? '', maxPerSession: role?.maxPerSession?.toString() ?? '', isDefault: role?.isDefault ?? false, hostOnly: role?.hostOnly ?? false,
  });
  const body = () => ({ ...(role ? {} : { key: f.key }), name: f.name, description: f.description, color: f.color, permissions: f.permissions, salary: Number(f.salary) || 0, workZone: f.workZone || null, maxPerSession: f.maxPerSession ? Number(f.maxPerSession) : null, isDefault: f.isDefault, hostOnly: f.hostOnly });
  const save = useAdminMutation(() => (role ? api.patch(`/api/admin/game/roles/${role.id}`, body()) : api.post('/api/admin/game/roles', body())), onSaved);
  const del = useAdminMutation(() => api.del(`/api/admin/game/roles/${role.id}`), onSaved);
  return (
    <Sheet open onClose={onClose} title={role ? `Edit ${role.name}` : 'New role'} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save role</Button>}>
      {!role && <Field label="Key"><input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} placeholder="firefighter" /></Field>}
      <div className="two-col">
        <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Color"><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
      </div>
      <Field label="Description"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Workplace"><select value={f.workZone} onChange={(e) => setF({ ...f, workZone: e.target.value })}><option value="">None</option>{zones.map((z) => <option key={z.key} value={z.key}>{z.name}</option>)}</select></Field>
        <Field label="Salary per shift ($)"><input inputMode="numeric" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <Field label="Max per session" hint="Empty = unlimited"><input inputMode="numeric" value={f.maxPerSession} onChange={(e) => setF({ ...f, maxPerSession: e.target.value.replace(/\D/g, '') })} /></Field>
      <div className="field-label">Role permissions</div>
      <div className="chips">{ROLE_PERMS.map((p) => <button key={p} className={`chip ${f.permissions.includes(p) ? 'active' : ''}`} onClick={() => setF({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x: string) => x !== p) : [...f.permissions, p] })}>{p}</button>)}</div>
      <Toggle label="Default role for new players" checked={f.isDefault} onChange={(v) => setF({ ...f, isDefault: v })} />
      <Toggle label="Host only" checked={f.hostOnly} onChange={(v) => setF({ ...f, hostOnly: v })} />
      {role && !role.isDefault && <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this role?')) del.mutate(undefined); }}>Delete role</Button>}
    </Sheet>
  );
}

function ScenariosTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'scenarios'], queryFn: () => api.get<{ scenarios: any[] }>('/api/admin/game/scenarios') });
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => api.get<{ roles: any[] }>('/api/admin/game/roles') });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<any>('/api/game/meta') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const dup = useAdminMutation((id: number) => api.post(`/api/admin/game/scenarios/${id}/duplicate`), () => qc.invalidateQueries({ queryKey: ['admin', 'scenarios'] }));
  return (
    <>
      <Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New scenario</Button>
      <Q q={q}>{(d) => (
        <div className="list card">{d.scenarios.map((s) => (
          <div key={s.id} className="row">
            <button className="row-main left" onClick={() => setEdit(s)}><strong>{s.name}{s.isActive ? '' : ' (inactive)'}</strong><div className="muted tiny">{s.key} · {s.config.lighting ?? 'day'} · ${s.config.startingCash ?? 100} start · {(s.config.objectives ?? []).length} objectives · {(s.config.autoEvents ?? []).length} auto events</div></button>
            <button className="icon-btn" aria-label="Duplicate" onClick={() => dup.mutate(s.id)}><Copy size={16} /></button>
          </div>
        ))}</div>
      )}</Q>
      {edit && <ScenarioEditor scenario={edit === 'new' ? null : edit} roles={roles.data?.roles ?? []} zones={meta.data?.zones ?? []} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'scenarios'] }); qc.invalidateQueries({ queryKey: ['game-meta'] }); setEdit(null); }} />}
    </>
  );
}

function ScenarioEditor({ scenario, roles, zones, onClose, onSaved }: { scenario: any | null; roles: any[]; zones: any[]; onClose: () => void; onSaved: () => void }) {
  const c = scenario?.config ?? {};
  const [key, setKey] = useState(scenario?.key ?? '');
  const [name, setName] = useState(scenario?.name ?? '');
  const [description, setDescription] = useState(scenario?.description ?? '');
  const [isActive, setIsActive] = useState(scenario?.isActive ?? true);
  const [cfg, setCfg] = useState<any>({
    roles: Array.isArray(c.roles) ? c.roles : roles.map((r) => r.key), startingCash: c.startingCash ?? 100, timeLimitMinutes: c.timeLimitMinutes ?? null,
    lighting: c.lighting ?? 'day', objectives: c.objectives ?? [], autoEvents: c.autoEvents ?? [], completionReward: c.completionReward ?? 50,
    initialPickups: c.initialPickups ?? 10, initialClues: c.initialClues ?? 0, priceMultiplier: c.priceMultiplier ?? 1, salaryMultiplier: c.salaryMultiplier ?? 1,
    fine: c.fine ?? 25, botLines: c.botLines ?? [],
  });
  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const body = () => ({ ...(scenario ? {} : { key }), name, description, config: { ...cfg, timeLimitMinutes: cfg.timeLimitMinutes || null, botLines: cfg.botLines.length ? cfg.botLines : undefined }, ...(scenario ? { isActive } : {}) });
  const save = useAdminMutation(() => (scenario ? api.patch(`/api/admin/game/scenarios/${scenario.id}`, body()) : api.post('/api/admin/game/scenarios', body())), onSaved);
  return (
    <Sheet open onClose={onClose} title={scenario ? `Edit ${scenario.name}` : 'New scenario'} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save scenario</Button>}>
      {!scenario && <Field label="Key"><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="beach_party" /></Field>}
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Description"><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      {scenario && <Toggle label="Active (available to hosts)" checked={isActive} onChange={setIsActive} />}
      <div className="field-label">Roles available</div>
      <div className="chips">{roles.map((r) => <button key={r.key} className={`chip ${cfg.roles.includes(r.key) ? 'active' : ''}`} onClick={() => set('roles', cfg.roles.includes(r.key) ? cfg.roles.filter((x: string) => x !== r.key) : [...cfg.roles, r.key])}>{r.name}</button>)}</div>
      <div className="two-col">
        <Field label="Lighting"><select value={cfg.lighting} onChange={(e) => set('lighting', e.target.value)}><option>day</option><option>dusk</option><option>night</option></select></Field>
        <Field label="Starting cash ($)"><input type="number" value={cfg.startingCash} onChange={(e) => set('startingCash', Number(e.target.value))} /></Field>
      </div>
      <div className="two-col">
        <Field label="Time limit (min)"><input type="number" value={cfg.timeLimitMinutes ?? ''} onChange={(e) => set('timeLimitMinutes', e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Completion reward (Sparks)"><input type="number" value={cfg.completionReward ?? 0} onChange={(e) => set('completionReward', Number(e.target.value))} /></Field>
      </div>
      <div className="two-col">
        <Field label="Initial sparks"><input type="number" value={cfg.initialPickups} onChange={(e) => set('initialPickups', Number(e.target.value))} /></Field>
        <Field label="Initial clues"><input type="number" value={cfg.initialClues} onChange={(e) => set('initialClues', Number(e.target.value))} /></Field>
      </div>
      <div className="two-col">
        <Field label="Price multiplier"><input type="number" step="0.1" value={cfg.priceMultiplier} onChange={(e) => set('priceMultiplier', Number(e.target.value))} /></Field>
        <Field label="Salary multiplier"><input type="number" step="0.1" value={cfg.salaryMultiplier} onChange={(e) => set('salaryMultiplier', Number(e.target.value))} /></Field>
      </div>
      <div className="field-label">Objectives</div>
      {cfg.objectives.map((o: any, i: number) => (
        <div key={i} className="objective-edit card">
          <div className="two-col">
            <select value={o.type} onChange={(e) => set('objectives', cfg.objectives.map((x: any, k: number) => (k === i ? { ...x, type: e.target.value } : x)))}>{OBJ_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            {o.type === 'visit'
              ? <select value={o.zone ?? ''} onChange={(e) => set('objectives', cfg.objectives.map((x: any, k: number) => (k === i ? { ...x, zone: e.target.value } : x)))}><option value="">zone…</option>{zones.map((z) => <option key={z.key} value={z.key}>{z.name}</option>)}</select>
              : <input type="number" value={o.target ?? 1} onChange={(e) => set('objectives', cfg.objectives.map((x: any, k: number) => (k === i ? { ...x, target: Number(e.target.value) } : x)))} aria-label="Target" />}
          </div>
          <input value={o.label ?? ''} placeholder="Label shown to players" onChange={(e) => set('objectives', cfg.objectives.map((x: any, k: number) => (k === i ? { ...x, label: e.target.value } : x)))} />
          <button className="link small" onClick={() => set('objectives', cfg.objectives.filter((_: any, k: number) => k !== i))}>Remove</button>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => set('objectives', [...cfg.objectives, { type: 'work', target: 5, label: 'Work 5 shifts' }])}>Add objective</Button>
      <JsonField label="Automatic events [{ type, everySeconds, params }]" value={cfg.autoEvents} onChange={(v) => set('autoEvents', v)} rows={4} />
      <Field label="Extras’ chat lines (one per line)"><textarea rows={3} value={cfg.botLines.join('\n')} onChange={(e) => set('botLines', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></Field>
    </Sheet>
  );
}

function GameItemsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'game-items'], queryFn: () => api.get<{ items: any[] }>('/api/admin/game/items') });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<any>('/api/game/meta') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  return (
    <>
      <Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New game item</Button>
      <Q q={q}>{(d) => <div className="list card">{d.items.map((i) => <button key={i.id} className="row" onClick={() => setEdit(i)}><div className="row-main"><strong>{i.name}</strong><div className="muted tiny">${i.price} · sold at {i.soldIn ?? '—'} · {JSON.stringify(i.effect)}</div></div></button>)}</div>}</Q>
      {edit && <GameItemEditor item={edit === 'new' ? null : edit} zones={meta.data?.zones ?? []} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'game-items'] }); qc.invalidateQueries({ queryKey: ['game-meta'] }); setEdit(null); }} />}
    </>
  );
}

function GameItemEditor({ item, zones, onClose, onSaved }: { item: any | null; zones: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ key: item?.key ?? '', name: item?.name ?? '', description: item?.description ?? '', icon: item?.icon ?? 'box', price: String(item?.price ?? 10), soldIn: item?.soldIn ?? '' });
  const [effect, setEffect] = useState<any>(item?.effect ?? { energy: 10 });
  const body = () => ({ ...(item ? {} : { key: f.key, icon: f.icon }), name: f.name, description: f.description, price: Number(f.price) || 0, soldIn: f.soldIn || null, effect });
  const save = useAdminMutation(() => (item ? api.patch(`/api/admin/game/items/${item.id}`, body()) : api.post('/api/admin/game/items', body())), onSaved);
  return (
    <Sheet open onClose={onClose} title={item ? `Edit ${item.name}` : 'New game item'} footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>}>
      {!item && <Field label="Key"><input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>}
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Description"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Price ($)"><input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Sold at"><select value={f.soldIn} onChange={(e) => setF({ ...f, soldIn: e.target.value })}><option value="">Not sold</option>{zones.map((z) => <option key={z.key} value={z.key}>{z.name}</option>)}</select></Field>
      </div>
      <JsonField label="Effect (energy, xp, reputation, emote, giftReputation)" value={effect} onChange={setEffect} rows={3} />
    </Sheet>
  );
}
