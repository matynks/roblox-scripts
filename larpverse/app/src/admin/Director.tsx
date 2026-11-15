import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Clapperboard, Coins, Play, RotateCcw, Sparkles, Users, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button, Field, Headshot, Name, Sheet, Sparks } from '../components/ui';
import { full } from '../lib/format';
import { useCinematic, useErrorToast, useSession, useToast } from '../state';
import type { AccountCard } from '../types';
import { isElevated } from './common';

const POS_KEY = 'lv.director.pos';

/** Floating recording-director button + panel. Visible only to staff while cinematic mode is on. */
export function Director() {
  const cine = useCinematic();
  const { me, isStaff } = useSession();
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { return JSON.parse(localStorage.getItem(POS_KEY) ?? '') ?? { x: 12, y: 180 }; } catch { return { x: 12, y: 180 }; }
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  if (!cine.enabled || !isStaff || !me) return null;
  return (
    <>
      {!cine.directorHidden && (
        <button
          className="director-dot"
          style={{ left: pos.x, top: pos.y }}
          aria-label="Director panel"
          onPointerDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const x = Math.max(4, Math.min(window.innerWidth - 48, e.clientX - drag.current.dx));
            const y = Math.max(4, Math.min(window.innerHeight - 48, e.clientY - drag.current.dy));
            if (Math.abs(x - pos.x) + Math.abs(y - pos.y) > 3) drag.current.moved = true;
            setPos({ x, y });
          }}
          onPointerUp={() => {
            const moved = drag.current?.moved;
            drag.current = null;
            try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
            if (!moved) cine.setPanelOpen(true);
          }}
        >
          <Clapperboard size={20} />
        </button>
      )}
      {cine.panelOpen && <DirectorPanel onClose={() => cine.setPanelOpen(false)} />}
    </>
  );
}

function DirectorPanel({ onClose }: { onClose: () => void }) {
  const { me, refresh, switchAccount } = useSession();
  const cine = useCinematic();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const onError = useErrorToast();
  const { push } = useToast();
  const [tab, setTab] = useState<'scene' | 'notify' | 'events' | 'wallet'>('scene');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const sessionMatch = /^\/session\/(\d+)/.exec(loc.pathname);
  const sessionId = sessionMatch ? Number(sessionMatch[1]) : null;
  const elevated = me ? isElevated(me) : false;
  const done = async (msg?: string) => { await refresh(); qc.invalidateQueries(); if (msg) push({ kind: 'success', title: msg }); };

  const unlock = useMutation({ mutationFn: () => api.post('/api/security/elevate', { password, code: code || undefined }), onSuccess: () => { setPassword(''); setCode(''); refresh(); }, onError });
  const presets = useQuery({ queryKey: ['admin', 'presets'], queryFn: () => api.get<{ presets: any[] }>('/api/admin/presets'), enabled: elevated });
  const accounts = useQuery({ queryKey: ['switchable', ''], queryFn: () => api.get<{ own: AccountCard[]; fictional: AccountCard[] }>('/api/me/switchable') });
  const events = useQuery({ queryKey: ['admin', 'events'], queryFn: () => api.get<{ events: any[] }>('/api/admin/events'), enabled: elevated && tab === 'events' });
  const purchases = useQuery({ queryKey: ['director', 'purchases', me?.account.id], queryFn: () => api.get<any>('/api/wallet/purchases?limit=5'), enabled: tab === 'wallet' });

  const apply = useMutation({ mutationFn: (id: number) => api.post<any>(`/api/admin/presets/${id}/apply`, { accountId: me!.account.id }), onSuccess: (r) => { done('Preset loaded'); if (r.report.session) nav(`/session/${r.report.session.id}`); }, onError });
  const sw = useMutation({ mutationFn: (id: number) => switchAccount(id), onSuccess: () => { push({ title: 'Switched account' }); nav('/'); }, onError });
  const runEvent = useMutation({
    mutationFn: (ev: any) => api.post(`/api/admin/events/${ev.id}/run`, ev.scope === 'game' ? { sessionId } : { accountIds: [me!.account.id] }),
    onSuccess: () => done('Event triggered'), onError,
  });
  const wallet = useMutation({
    mutationFn: (b: { op: string; amount: number }) => api.post(`/api/admin/accounts/${me!.account.id}/wallet`, { ...b, description: b.op === 'add' ? 'Group payout' : 'Balance update', scripted: b.op === 'add' }),
    onSuccess: () => done(), onError,
  });
  const resetItem = useMutation({ mutationFn: (itemId: number) => api.post(`/api/admin/accounts/${me!.account.id}/reset-item`, { itemId }), onSuccess: () => done('Purchase undone — ready to film again'), onError });

  if (!me) return null;
  return (
    <Sheet open onClose={onClose} title={<><Clapperboard size={16} /> Director</>} tall>
      <div className="director-head">
        <Headshot account={me.account} size={36} presence={false} />
        <div className="row-main"><Name account={me.account} /><div className="muted tiny">@{me.account.username} · <Sparks amount={me.wallet.balance} size={10} /></div></div>
        <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => cine.setEnabled(false)}>Exit</Button>
      </div>
      {!elevated ? (
        <form className="card pad" onSubmit={(e) => { e.preventDefault(); unlock.mutate(); }}>
          <p className="small">Unlock staff tools to use the director panel.</p>
          <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {me.user.mfaEnabled && <Field label="2-step code"><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" /></Field>}
          <Button loading={unlock.isPending}>Unlock</Button>
        </form>
      ) : (
        <>
          <div className="tabs">
            {([['scene', 'Scene', Sparkles], ['notify', 'Notify', Bell], ['events', 'Events', Wand2], ['wallet', 'Wallet', Coins]] as const).map(([v, l, I]) => (
              <button key={v} className={`tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}><I size={14} /> {l}</button>
            ))}
          </div>
          {tab === 'scene' && (
            <>
              <h4>Load a preset on this account</h4>
              <div className="director-grid">
                {presets.data?.presets.map((p) => <button key={p.id} className="event-btn" disabled={apply.isPending} onClick={() => apply.mutate(p.id)}>{p.name}</button>)}
              </div>
              <h4><Users size={14} /> Switch account</h4>
              <div className="list card scroll-list">
                {[...(accounts.data?.own ?? []), ...(accounts.data?.fictional ?? [])].map((a) => (
                  <button key={a.id} className={`row ${a.id === me.account.id ? 'active' : ''}`} onClick={() => a.id !== me.account.id && sw.mutate(a.id)}>
                    <Headshot account={a} size={30} presence={false} />
                    <div className="row-main"><Name account={a} /><div className="muted tiny">@{a.username}</div></div>
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === 'notify' && <QuickNotify accountId={me.account.id} />}
          {tab === 'events' && (
            <>
              {sessionId ? <p className="muted small">LARP events run in session #{sessionId}.</p> : <p className="muted small">Open a LARP session to use game events.</p>}
              <div className="director-grid">
                {events.data?.events.filter((e) => e.scope === 'platform' || sessionId).map((e) => (
                  <button key={e.id} className="event-btn" disabled={runEvent.isPending} onClick={() => runEvent.mutate(e)}><Play size={12} /> {e.name}</button>
                ))}
              </div>
            </>
          )}
          {tab === 'wallet' && (
            <>
              <div className="kv"><span>Balance</span><Sparks amount={me.wallet.balance} tag /></div>
              <div className="director-grid">
                {[1000, 10000, 100000].map((n) => <button key={n} className="event-btn" onClick={() => wallet.mutate({ op: 'add', amount: n })}>+{full(n)}</button>)}
                {[0, 25000, 1000000, 2500000].map((n) => <button key={`s${n}`} className="event-btn" onClick={() => wallet.mutate({ op: 'set', amount: n })}>Set {full(n)}</button>)}
              </div>
              <h4><RotateCcw size={14} /> Repeatable purchases</h4>
              <div className="list card">
                {purchases.data?.items.filter((p: any) => p.status === 'completed').map((p: any) => (
                  <div key={p.id} className="row"><div className="row-main"><strong>{p.item.name}</strong><div className="muted tiny">{full(p.pricePaid)} Sparks</div></div><Button size="sm" variant="secondary" onClick={() => resetItem.mutate(p.item.id)}>Reset</Button></div>
                ))}
                {purchases.data?.items.length === 0 && <p className="muted pad">No purchases on this account yet.</p>}
              </div>
            </>
          )}
        </>
      )}
      <p className="muted tiny">Long-press the logo to hide this button. Everything here is audit-logged.</p>
    </Sheet>
  );
}

function QuickNotify({ accountId }: { accountId: number }) {
  const { push } = useToast();
  const onError = useErrorToast();
  const accounts = useQuery({ queryKey: ['admin', 'accounts', '', '1'], queryFn: () => api.get<any>('/api/admin/accounts?fictional=1&limit=60') });
  const [actor, setActor] = useState<number | ''>('');
  const [delay, setDelay] = useState(3);
  const [title, setTitle] = useState('');
  const actorName = accounts.data?.items.find((a: any) => a.id === actor)?.displayName ?? 'Someone';
  const send = useMutation({
    mutationFn: (b: { type: string; title: string; body?: string }) => api.post('/api/admin/notifications', { accountIds: [accountId], ...b, actorAccountId: actor || null, delaySeconds: delay }),
    onSuccess: () => push({ title: delay ? `Arrives in ${delay}s` : 'Sent' }), onError,
  });
  useEffect(() => { if (!actor && accounts.data?.items[0]) setActor(accounts.data.items[0].id); }, [accounts.data, actor]);
  const templates = [
    { type: 'friend_request', title: `${actorName} sent you a friend request` },
    { type: 'follow', title: `${actorName} started following you` },
    { type: 'reward', title: 'You received 5,000 Sparks', body: 'Group payout · fictional roleplay currency' },
    { type: 'sale', title: 'Someone bought your Neon Hoodie!', body: '+350 Sparks (fictional)' },
    { type: 'badge', title: 'You earned the Roleplay Verified badge', body: 'Larpverse roleplay verification' },
    { type: 'game_invite', title: `${actorName} invited you to Larpverse City RP` },
  ];
  return (
    <>
      <div className="two-col">
        <Field label="From"><select value={actor} onChange={(e) => setActor(Number(e.target.value) || '')}><option value="">Nobody</option>{accounts.data?.items.map((a: any) => <option key={a.id} value={a.id}>{a.displayName}</option>)}</select></Field>
        <Field label="Delay (s)"><input type="number" min={0} max={600} value={delay} onChange={(e) => setDelay(Number(e.target.value))} /></Field>
      </div>
      <div className="director-grid">{templates.map((t) => <button key={t.title} className="event-btn" onClick={() => send.mutate(t)}>{t.title}</button>)}</div>
      <div className="compose"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom notification" aria-label="Custom notification" /><Button size="sm" disabled={!title} onClick={() => send.mutate({ type: 'system', title })}>Send</Button></div>
    </>
  );
}
