import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Lock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ExperienceArt } from '../components/Art';
import { Avatar } from '../components/Avatar';
import { Button, Empty, Field, Notice, PageHeader, Q, Section, Sheet, Tabs, Toggle } from '../components/ui';
import { SessionSummaryView } from '../game/GameScreen';
import { dateTime, duration, full } from '../lib/format';
import { useErrorToast, useMe } from '../state';
import type { Experience, Role, SessionSummary } from '../types';

type Character = {
  id: number; name: string; bio: string; appearance: { useAvatar: boolean; look?: any }; look: any;
  stats: { xp: number; level: number; reputation: number; sessions: number; totalEarned: number }; cash: number; favoriteRoleId: number | null;
  inventory: { id: number; key: string; name: string; qty: number }[]; lastPlayedAt: number | null;
};
type Meta = { roles: Role[]; scenarios: { id: number; key: string; name: string; description: string; lighting: string; roles: string[] | 'all'; objectives: any[]; startingCash: number; timeLimitMinutes: number | null }[] };

function CharacterToken({ c, size = 64 }: { c: Character; size?: number }) {
  const me = useMe();
  if (c.appearance.useAvatar !== false) return <Avatar spec={me.account.avatar} crop="upper" size={size} />;
  const L = c.look;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect x="18" y="34" width="28" height="20" rx="8" fill={L.shirt} />
      <rect x="20" y="52" width="10" height="8" rx="3" fill={L.pants} /><rect x="34" y="52" width="10" height="8" rx="3" fill={L.pants} />
      <rect x="16" y="8" width="32" height="28" rx="12" fill={L.skin} />
      {L.hair && <path d="M16 20 Q16 6 32 6 Q48 6 48 20 Q40 12 32 12 Q24 12 16 20Z" fill={L.hair.color} />}
      <circle cx="26" cy="22" r="2.4" fill="#1f2330" /><circle cx="38" cy="22" r="2.4" fill="#1f2330" />
    </svg>
  );
}

function rolesFor(meta: Meta | undefined, scenarioId: number | undefined) {
  if (!meta) return [];
  const s = meta.scenarios.find((x) => x.id === scenarioId);
  return meta.roles.filter((r) => !r.hostOnly && (!s || s.roles === 'all' || (s.roles as string[]).includes(r.key)));
}

export function Lobby() {
  const { experienceId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const me = useMe();
  const exp = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.get<Experience & { defaultScenarioId: number | null }>(`/api/experiences/${experienceId}`) });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<Meta>('/api/game/meta'), staleTime: 60_000 });
  const chars = useQuery({ queryKey: ['characters', me.account.id], queryFn: () => api.get<{ characters: Character[] }>('/api/game/characters') });
  const sessions = useQuery({ queryKey: ['sessions', experienceId], queryFn: () => api.get<{ sessions: SessionSummary[] }>(`/api/game/sessions?experienceId=${experienceId}`), refetchInterval: 8000 });
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [joining, setJoining] = useState<SessionSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState(params.get('code') ?? '');
  const [editChar, setEditChar] = useState<Character | 'new' | null>(null);

  useEffect(() => { if (!characterId && chars.data?.characters[0]) setCharacterId(chars.data.characters[0].id); }, [chars.data, characterId]);
  useEffect(() => {
    const sid = Number(params.get('session'));
    if (sid && sessions.data) {
      const s = sessions.data.sessions.find((x) => x.id === sid);
      if (s) setJoining(s);
    }
  }, [params, sessions.data]);

  const join = useMutation({
    mutationFn: ({ s, roleId }: { s: SessionSummary; roleId?: number }) => api.post(`/api/game/sessions/${s.id}/join`, { characterId: characterId ?? undefined, roleId, accessCode: code || undefined }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['home'] }); nav(`/session/${v.s.id}`); },
    onError,
  });
  const joinCode = useMutation({
    mutationFn: () => api.post<SessionSummary>('/api/game/join-code', { code, characterId: characterId ?? undefined }),
    onSuccess: (s) => nav(`/session/${s.id}`),
    onError,
  });

  return (
    <div className="page">
      <PageHeader title={exp.data?.name ?? 'Lobby'} subtitle="LARP lobby" />
      {exp.data && <div className="exp-hero small"><ExperienceArt art={exp.data.art} thumbnail={exp.data.thumbnail} /></div>}

      <Section title="Your character" action={<button className="link small" onClick={() => setEditChar('new')}><Plus size={14} /> New</button>}>
        <Q q={chars}>
          {(d) => d.characters.length === 0 ? (
            <Notice>Your first character is created from your avatar when you join — or <button className="link" onClick={() => setEditChar('new')}>create one now</button>.</Notice>
          ) : (
            <div className="rail">
              {d.characters.map((c) => (
                <button key={c.id} className={`char-card ${characterId === c.id ? 'active' : ''}`} onClick={() => setCharacterId(c.id)}>
                  <CharacterToken c={c} />
                  <strong className="ellipsis">{c.name}</strong>
                  <span className="tiny muted">Lv {c.stats.level ?? 1} · ${full(c.cash)}</span>
                  <span className="char-edit" role="button" aria-label={`Edit ${c.name}`} onClick={(e) => { e.stopPropagation(); setEditChar(c); }}><Pencil size={12} /></span>
                </button>
              ))}
            </div>
          )}
        </Q>
      </Section>

      <div className="row-gap">
        <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Create session</Button>
        <form className="code-form" onSubmit={(e) => { e.preventDefault(); if (code.trim()) joinCode.mutate(); }}>
          <Hash size={16} /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Join code" maxLength={10} aria-label="Join code" />
          <Button size="sm" variant="secondary" loading={joinCode.isPending} disabled={!code.trim()}>Join</Button>
        </form>
      </div>

      <Section title="Open sessions">
        <Q q={sessions}>
          {(d) => d.sessions.length === 0 ? <Empty icon={<Users size={28} />} title="No sessions running" text="Create one and invite your friends." /> : (
            <div className="list card">
              {d.sessions.map((s) => (
                <button key={s.id} className="row" onClick={() => setJoining(s)}>
                  <span className={`status-dot status-${s.status}`} />
                  <div className="row-main">
                    <strong>{s.name} {s.privacy !== 'public' && <Lock size={12} />}</strong>
                    <div className="muted tiny">{s.scenario?.name} · {s.status} · host {s.host?.displayName}{s.elapsedMs ? ` · ${duration(s.elapsedMs)}` : ''}</div>
                  </div>
                  <span className="pill">{s.players}/{s.maxPlayers}</span>
                </button>
              ))}
            </div>
          )}
        </Q>
      </Section>
      <Link to="/game/history" className="link small">Your session history</Link>

      <Sheet open={Boolean(joining)} onClose={() => setJoining(null)} title={joining ? `Join ${joining.name}` : ''}>
        {joining && (
          <>
            <p className="muted small">{joining.scenario?.name} · {joining.players}/{joining.maxPlayers} players · {joining.status}</p>
            {joining.privacy === 'private' && <Field label="Join code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>}
            <div className="field-label">Pick a role</div>
            <div className="list">
              {rolesFor(meta.data, joining.scenario?.id).map((r) => (
                <button key={r.id} className="row role-row" disabled={join.isPending} onClick={() => join.mutate({ s: joining, roleId: r.id })}>
                  <span className="role-dot" style={{ background: r.color }} />
                  <div className="row-main"><strong>{r.name}</strong><div className="muted tiny">{r.description}{r.salary ? ` · $${r.salary}/shift` : ''}{r.maxPerSession ? ` · max ${r.maxPerSession}` : ''}</div></div>
                </button>
              ))}
            </div>
            {join.error && <div className="field-error">{(join.error as ApiError).message}</div>}
          </>
        )}
      </Sheet>

      {creating && exp.data && meta.data && (
        <CreateSession exp={exp.data} meta={meta.data} characterId={characterId} onClose={() => setCreating(false)} onCreated={(id) => nav(`/session/${id}`)} />
      )}
      {editChar && meta.data && <CharacterEditor character={editChar === 'new' ? null : editChar} roles={meta.data.roles} onClose={() => setEditChar(null)} onSaved={(c) => { qc.invalidateQueries({ queryKey: ['characters'] }); setCharacterId(c.id); setEditChar(null); }} />}
    </div>
  );
}

function CreateSession({ exp, meta, characterId, onClose, onCreated }: { exp: Experience & { defaultScenarioId: number | null }; meta: Meta; characterId: number | null; onClose: () => void; onCreated: (id: number) => void }) {
  const onError = useErrorToast();
  const me = useMe();
  const [scenarioId, setScenarioId] = useState<number>(exp.defaultScenarioId ?? meta.scenarios[0]?.id);
  const [name, setName] = useState(`${me.account.displayName}'s city`);
  const [privacy, setPrivacy] = useState('public');
  const [maxPlayers, setMaxPlayers] = useState(exp.maxPlayers);
  const [roleId, setRoleId] = useState<number | undefined>();
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [s, setS] = useState({ allowRoleSwitch: true, chatEnabled: true, hostEvents: true, allowBots: true });
  const scen = meta.scenarios.find((x) => x.id === scenarioId);
  const hostRoles = meta.roles.filter((r) => !scen || scen.roles === 'all' || (scen.roles as string[]).includes(r.key));
  const create = useMutation({
    mutationFn: () => api.post<SessionSummary>('/api/game/sessions', {
      experienceId: exp.id, scenarioId, name, privacy, maxPlayers, roleId, characterId: characterId ?? undefined,
      settings: { ...s, timeLimitMinutes: timeLimit ? Number(timeLimit) : null },
    }),
    onSuccess: (r) => onCreated(r.id),
    onError,
  });
  return (
    <Sheet open onClose={onClose} title="Create a session" tall footer={<Button block size="lg" loading={create.isPending} onClick={() => create.mutate()}>Create & enter</Button>}>
      <Field label="Session name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} /></Field>
      <div className="field-label">Scenario</div>
      <div className="list">
        {meta.scenarios.map((x) => (
          <button key={x.id} className={`row scenario-row ${x.id === scenarioId ? 'active' : ''}`} onClick={() => setScenarioId(x.id)}>
            <div className="row-main"><strong>{x.name}</strong><div className="muted tiny">{x.description}</div>
              {x.objectives.length > 0 && <div className="tiny accent">{x.objectives.map((o: any) => o.label).join(' · ')}</div>}</div>
          </button>
        ))}
      </div>
      <Field label="Your role"><select value={roleId ?? ''} onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : undefined)}><option value="">Default</option>{hostRoles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.hostOnly ? ' (host only)' : ''}</option>)}</select></Field>
      <div className="two-col">
        <Field label="Privacy"><select value={privacy} onChange={(e) => setPrivacy(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Private (code)</option></select></Field>
        <Field label="Max players"><input type="number" min={1} max={50} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} /></Field>
      </div>
      <Field label="Time limit (minutes)" hint="Leave empty for no limit"><input type="number" min={1} max={600} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} /></Field>
      <Toggle label="Players can switch roles" checked={s.allowRoleSwitch} onChange={(v) => setS({ ...s, allowRoleSwitch: v })} />
      <Toggle label="Chat enabled" checked={s.chatEnabled} onChange={(v) => setS({ ...s, chatEnabled: v })} />
      <Toggle label="Host can trigger events" checked={s.hostEvents} onChange={(v) => setS({ ...s, hostEvents: v })} />
    </Sheet>
  );
}

const PALETTE = ['#f2c9a0', '#c68642', '#8d5524', '#ffdbac', '#e63946', '#4f7cff', '#2a9d8f', '#7b2cbf', '#ffd166', '#1f2330', '#f5f5f7', '#ff6b9a'];

function CharacterEditor({ character, roles, onClose, onSaved }: { character: Character | null; roles: Role[]; onClose: () => void; onSaved: (c: Character) => void }) {
  const onError = useErrorToast();
  const [name, setName] = useState(character?.name ?? '');
  const [bio, setBio] = useState(character?.bio ?? '');
  const [useAvatar, setUseAvatar] = useState(character?.appearance.useAvatar ?? true);
  const [look, setLook] = useState({ skin: '#f2c9a0', shirt: '#4f7cff', pants: '#2f3b52', ...(character?.appearance.look ?? {}) });
  const [roleId, setRoleId] = useState<number | null>(character?.favoriteRoleId ?? null);
  const save = useMutation({
    mutationFn: () => {
      const body = { name, bio, useAvatar, look: { skin: look.skin, shirt: look.shirt, pants: look.pants }, favoriteRoleId: roleId };
      return character ? api.patch<Character>(`/api/game/characters/${character.id}`, body) : api.post<Character>('/api/game/characters', body);
    },
    onSuccess: onSaved,
    onError,
  });
  const del = useMutation({ mutationFn: () => api.del(`/api/game/characters/${character!.id}`), onSuccess: () => onClose(), onError });
  return (
    <Sheet open onClose={onClose} title={character ? 'Edit character' : 'New character'} tall footer={<Button block loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate()}>Save character</Button>}>
      <Field label="Character name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="e.g. Detective Rae" /></Field>
      <Field label="Backstory"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} /></Field>
      <Field label="Favorite role"><select value={roleId ?? ''} onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}><option value="">None</option>{roles.filter((r) => !r.hostOnly).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
      <Toggle label="Look like my avatar" hint="Or pick custom colors for this character" checked={useAvatar} onChange={setUseAvatar} />
      {!useAvatar && (['skin', 'shirt', 'pants'] as const).map((k) => (
        <div key={k}>
          <div className="field-label">{k[0].toUpperCase() + k.slice(1)}</div>
          <div className="swatches">{PALETTE.map((c) => <button key={c} className={`swatch ${look[k] === c ? 'on' : ''}`} style={{ background: c }} aria-label={`${k} ${c}`} onClick={() => setLook({ ...look, [k]: c })} />)}</div>
        </div>
      ))}
      {character && (
        <>
          <div className="kv"><span>Level</span><strong>{character.stats.level ?? 1} ({character.stats.xp} XP)</strong></div>
          <div className="kv"><span>Savings</span><strong>${full(character.cash)}</strong></div>
          <div className="kv"><span>Sessions played</span><strong>{character.stats.sessions ?? 0}</strong></div>
          {character.inventory.length > 0 && <div className="kv"><span>Roleplay items</span><span>{character.inventory.map((i) => `${i.name} ×${i.qty}`).join(', ')}</span></div>}
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => { if (confirm(`Delete ${character.name}?`)) del.mutate(); }}>Delete character</Button>
        </>
      )}
    </Sheet>
  );
}

export function Characters() {
  const me = useMe();
  const qc = useQueryClient();
  const chars = useQuery({ queryKey: ['characters', me.account.id], queryFn: () => api.get<{ characters: Character[] }>('/api/game/characters') });
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<Meta>('/api/game/meta') });
  const [edit, setEdit] = useState<Character | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeader title="LARP characters" right={<button className="icon-btn" aria-label="New character" onClick={() => setEdit('new')}><Plus size={20} /></button>} />
      <Q q={chars}>
        {(d) => d.characters.length === 0 ? <Empty title="No characters yet" action={<Button onClick={() => setEdit('new')}>Create a character</Button>} /> : (
          <div className="list card">
            {d.characters.map((c) => (
              <button key={c.id} className="row" onClick={() => setEdit(c)}>
                <CharacterToken c={c} size={48} />
                <div className="row-main"><strong>{c.name}</strong><div className="muted tiny">Level {c.stats.level ?? 1} · {c.stats.xp} XP · ⭐ {c.stats.reputation} · ${full(c.cash)} saved · {c.stats.sessions ?? 0} sessions</div></div>
              </button>
            ))}
          </div>
        )}
      </Q>
      {edit && meta.data && <CharacterEditor character={edit === 'new' ? null : edit} roles={meta.data.roles} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['characters'] }); setEdit(null); }} />}
    </div>
  );
}

export function SessionHistory() {
  const me = useMe();
  const [tab, setTab] = useState<'all' | 'ended'>('all');
  const [open, setOpen] = useState<any>(null);
  const q = useQuery({ queryKey: ['game-history', me.account.id], queryFn: () => api.get<{ items: (SessionSummary & { mine: any })[] }>('/api/game/history?limit=50') });
  return (
    <div className="page">
      <PageHeader title="Session history" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All' }, { value: 'ended', label: 'Finished' }]} />
      <Q q={q}>
        {(d) => {
          const items = d.items.filter((s) => tab === 'all' || s.status === 'ended');
          return items.length === 0 ? <Empty title="No sessions yet" text="Play a LARP experience to build your history." /> : (
            <div className="list card">
              {items.map((s) => (
                <button key={s.id} className="row" onClick={() => (s.status === 'ended' ? setOpen(s) : (window.location.hash = `#/session/${s.id}`))}>
                  <span className={`status-dot status-${s.status}`} />
                  <div className="row-main"><strong>{s.name}</strong><div className="muted tiny">{s.scenario?.name} · {dateTime(s.mine.joinedAt)} · earned ${full(s.mine.stats?.session?.earned ?? 0)}</div></div>
                  <span className="pill">{s.status}</span>
                </button>
              ))}
            </div>
          );
        }}
      </Q>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name}>{open && <SessionSummaryView summary={open.summary} />}</Sheet>
    </div>
  );
}
