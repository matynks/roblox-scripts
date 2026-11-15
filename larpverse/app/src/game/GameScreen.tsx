import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Backpack, ChevronLeft, Copy, Crown, Flag, Hand, LogOut, Map as MapIcon, Megaphone, MessageCircle, Minus, Pause, Play,
  Plus, RotateCcw, Send, Smile, Target, UserPlus, Wifi, WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, openStream } from '../api';
import { Button, Sheet, Spinner, Toggle } from '../components/ui';
import { duration, full } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AccountCard, GameItem, Paged, Role } from '../types';
import { drawFrame, drawMinimap, type Effects, type GameView, type GPlayer, type Pickup } from './render';
import { move, SPEED, zoneAt, type World } from './world';

type Self = {
  cash: number; energy: number; xp: number; level: number; reputation: number; roleId: number; inventory: { id: number; qty: number }[];
  objectives: { key: string; label: string; type: string; target: number; progress: number; done: boolean }[]; stats: any; completed: boolean; cityFund: number;
};
type ChatMsg = { id: string; kind: 'chat' | 'system'; from?: number; name?: string; roleColor?: string; text: string; at: number };
type Banner = { id: string; text: string; kind: string; until: number };
type Scenario = { id: number; key: string; name: string; description: string; lighting: 'day' | 'dusk' | 'night'; timeLimitMinutes: number | null; roles: number[]; objectives: any[] };

const EMOJI: Record<string, string> = { wave: '👋', cheer: '🎉', dance: '💃', clap: '👏', salute: '🫡', shrug: '🤷', laugh: '😂', spin: '🌀', jump: '⬆️', bow: '🙇', victory: '✌️' };
const ITEM_EMOJI: Record<string, string> = { coffee: '☕', donut: '🍩', cup: '🥤', can: '🥫', sandwich: '🥪', flower: '💐', balloon: '🎈', camera: '📷', news: '📰', cross: '🩹', pill: '💊', trophy: '🏆', sparkle: '✨', coin: '🪙' };

const quant = (v: number) => Math.round(v * 10) / 10;

export function GameScreen() {
  const { id } = useParams();
  const sessionId = Number(id);
  const me = useMe();
  const { setMe } = useSession();
  const nav = useNavigate();
  const onError = useErrorToast();
  const { push } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<GameView | null>(null);
  const keys = useRef<Set<string>>(new Set());
  const stick = useRef({ x: 0, y: 0 });
  const zoomUser = useRef(1);
  const cam = useRef({ x: 0, y: 0 });

  const [ready, setReady] = useState(false);
  const [conn, setConn] = useState<'connecting' | 'open' | 'retrying' | 'closed'>('connecting');
  const [fatal, setFatal] = useState<string | null>(null);
  const [self, setSelf] = useState<Self | null>(null);
  const [status, setStatus] = useState<string>('lobby');
  const [hostId, setHostId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [experienceId, setExperienceId] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [privacy, setPrivacy] = useState('public');
  const [accessCode, setAccessCode] = useState<string | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [items, setItems] = useState<GameItem[]>([]);
  const [emotes, setEmotes] = useState<string[]>(['wave']);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [feed, setFeed] = useState<{ text: string; at: number }[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [effects, setEffects] = useState<Effects>({});
  const [summary, setSummary] = useState<any>(null);
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  const [nearby, setNearby] = useState<GPlayer[]>([]);
  const [rosterVersion, setRosterVersion] = useState(0);
  const [sheet, setSheet] = useState<null | 'shop' | 'interact' | 'bag' | 'emote' | 'chat' | 'host' | 'role' | 'objectives'>(null);
  const [showMap, setShowMap] = useState(true);
  const [showObjectives, setShowObjectives] = useState(true);

  const detail = useQuery({ queryKey: ['session', sessionId, me.account.id], queryFn: () => api.get<any>(`/api/game/sessions/${sessionId}`) });

  // Redirect non-participants to the lobby to pick a character and role.
  useEffect(() => {
    if (detail.data && !detail.data.isParticipant && detail.data.status !== 'ended') nav(`/play/${detail.data.experienceId}?session=${sessionId}`, { replace: true });
    if (detail.data?.status === 'ended') setSummary(detail.data.summary ?? {});
    if (detail.data) setExperienceId(detail.data.experienceId);
  }, [detail.data, nav, sessionId]);

  const upsertPlayer = useCallback((p: any) => {
    const v = view.current;
    if (!v) return;
    const cur = v.players.get(p.id);
    const now = performance.now();
    if (cur) {
      Object.assign(cur, { name: p.name, roleKey: p.roleKey, roleName: p.roleName, roleColor: p.roleColor, look: p.look, level: p.level, isBot: p.isBot, connected: p.connected, completed: p.completed, emote: p.emote ?? cur.emote, bubble: p.bubble ?? cur.bubble });
    } else {
      v.players.set(p.id, { ...p, moving: false, fromX: p.x, fromY: p.y, toX: p.x, toY: p.y, t0: now, t1: now });
    }
  }, []);

  const onMessage = useCallback((m: any) => {
    const v = view.current;
    switch (m.type) {
      case 'init': {
        const world: World = m.world;
        const players = new Map<number, GPlayer>();
        const now = performance.now();
        for (const p of m.players) players.set(p.id, { ...p, moving: false, fromX: p.x, fromY: p.y, toX: p.x, toY: p.y, t0: now, t1: now });
        const myRole = m.roles.find((r: Role) => r.id === m.self?.roleId);
        view.current = {
          world, players, pickups: new Map(m.pickups.map((pk: Pickup) => [pk.id, pk])), effects: m.effects ?? {}, you: m.you,
          lighting: m.scenario.lighting, myWorkZone: myRole?.workZone ?? null, zoom: 1,
        };
        const mine = players.get(m.you);
        if (mine) cam.current = { x: mine.x, y: mine.y };
        setRoles(m.roles); setItems(m.gameItems); setScenario(m.scenario); setSelf(m.self); setStatus(m.status); setHostId(m.hostId);
        setSessionName(m.session.name); setExperienceId(m.session.experienceId); setSettings(m.settings); setPrivacy(m.privacy); setAccessCode(m.session.accessCode);
        setElapsed(m.elapsedMs); setChat(m.chat); setFeed(m.feed); setBanners(m.banners); setEffects(m.effects ?? {}); setEmotes(m.emotes);
        setReady(true);
        setRosterVersion((x) => x + 1);
        break;
      }
      case 'tick': {
        if (!v) return;
        const now = performance.now();
        for (const [pid, x, y, facing, moving] of m.p as number[][]) {
          const p = v.players.get(pid);
          if (!p) continue;
          if (pid === v.you) {
            const dx = x - p.x;
            const dy = y - p.y;
            const d = Math.hypot(dx, dy);
            // Reconcile prediction with the authoritative position.
            if (d > 90) { p.x = x; p.y = y; } else if (!(stick.current.x || stick.current.y || keys.current.size)) { p.x += dx * 0.35; p.y += dy * 0.35; } else { p.x += dx * 0.08; p.y += dy * 0.08; }
          } else {
            p.fromX = p.x; p.fromY = p.y; p.toX = x; p.toY = y; p.t0 = now; p.t1 = now + 110; p.facing = facing; p.moving = Boolean(moving);
          }
        }
        if (m.s) setStatus(m.s);
        if (typeof m.e === 'number' && Math.abs(m.e - elapsedRef.current) > 900) { elapsedRef.current = m.e; setElapsed(m.e); }
        break;
      }
      case 'player': upsertPlayer(m.player); setRosterVersion((x) => x + 1); break;
      case 'player_left': v?.players.delete(m.id); setRosterVersion((x) => x + 1); break;
      case 'pickups':
        if (!v) return;
        for (const pk of m.add ?? []) v.pickups.set(pk.id, pk);
        for (const pid of m.remove ?? []) v.pickups.delete(pid);
        break;
      case 'self': setSelf(m.self); break;
      case 'chat': setChat((c) => [...c.slice(-80), m.message]); break;
      case 'bubble': { const p = v?.players.get(m.id); if (p) p.bubble = m.bubble; break; }
      case 'emote': { const p = v?.players.get(m.id); if (p) p.emote = m.emote; break; }
      case 'feed': setFeed((f) => [...f.slice(-20), m.item]); break;
      case 'banner': setBanners((b) => [...b.filter((x) => x.until > Date.now()), m.banner].slice(-3)); break;
      case 'status':
        setStatus(m.status); setHostId(m.hostId); setSessionName(m.name); setSettings(m.settings); setPrivacy(m.privacy); setEffects(m.effects ?? {});
        if (v) v.effects = m.effects ?? {};
        elapsedRef.current = m.elapsedMs; setElapsed(m.elapsedMs);
        break;
      case 'reset':
        if (!v) return;
        v.pickups = new Map(m.pickups.map((pk: Pickup) => [pk.id, pk]));
        for (const p of m.players) { const cur = v.players.get(p.id); if (cur) { cur.x = p.x; cur.y = p.y; cur.toX = p.x; cur.toY = p.y; cur.fromX = p.x; cur.fromY = p.y; } }
        break;
      case 'scenario': setScenario(m.scenario); if (v) v.lighting = m.scenario.lighting; break;
      case 'catalog': setRoles(m.roles); setItems(m.gameItems); break;
      case 'ended': setSummary(m.summary); break;
      case 'kicked': setFatal('You were removed from this session by the host.'); break;
      case 'left': break;
      default: break;
    }
  }, [upsertPlayer]);
  const elapsedRef = useRef(0);

  // Open the live stream once we know we're a participant.
  useEffect(() => {
    if (!detail.data?.isParticipant) return;
    const close = openStream(`/api/game/sessions/${sessionId}/stream`, onMessage, (s, err) => {
      setConn(s);
      if (s === 'closed' && err) setFatal(err.message);
    });
    return close;
  }, [detail.data?.isParticipant, sessionId, onMessage]);

  // My role → work zone highlight
  const myRole = roles.find((r) => r.id === self?.roleId) ?? null;
  useEffect(() => { if (view.current) view.current.myWorkZone = myRole?.workZone ?? null; }, [myRole]);
  useEffect(() => { if (view.current) view.current.effects = effects; }, [effects]);

  // Keyboard controls
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.current.add(k); e.preventDefault(); }
      if (k === 'enter') setSheet('chat');
      if (k === 'e') primaryRef.current?.();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const inputVec = () => {
    const k = keys.current;
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    if (!x && !y) { x = stick.current.x; y = stick.current.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  };

  // Send input changes to the server (throttled), with a keepalive while moving.
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    if (!ready) return;
    let last = { x: 0, y: 0 };
    let lastAt = 0;
    const t = setInterval(() => {
      const v = inputVec();
      const q = { x: quant(v.x), y: quant(v.y) };
      const changed = q.x !== last.x || q.y !== last.y;
      const moving = q.x || q.y;
      if (changed || (moving && Date.now() - lastAt > 900)) {
        last = q;
        lastAt = Date.now();
        api.post(`/api/game/sessions/${sessionId}/input`, q).catch(() => {});
      }
    }, 70);
    return () => clearInterval(t);
  }, [ready, sessionId]);

  // Render loop
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let lastT = performance.now();
    let hudT = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      const v = view.current;
      const canvas = canvasRef.current;
      if (v && canvas) {
        const mine = v.players.get(v.you);
        const st = statusRef.current;
        if (mine && (st === 'active' || st === 'lobby')) {
          const iv = inputVec();
          if (iv.x || iv.y) {
            move(v.world, mine, iv.x * SPEED * dt, iv.y * SPEED * dt);
            if (iv.x) mine.facing = iv.x > 0 ? 1 : -1;
            mine.moving = true;
          } else mine.moving = false;
        }
        for (const p of v.players.values()) {
          if (p.id === v.you) continue;
          const k = p.t1 > p.t0 ? Math.min(1, (t - p.t0) / (p.t1 - p.t0)) : 1;
          p.x = p.fromX + (p.toX - p.fromX) * k;
          p.y = p.fromY + (p.toY - p.fromY) * k;
        }
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        v.zoom = Math.max(0.35, Math.min(1.6, (Math.min(w, h) / 640) * 1.15 * zoomUser.current));
        if (mine) { cam.current.x += (mine.x - cam.current.x) * Math.min(1, dt * 8); cam.current.y += (mine.y - cam.current.y) * Math.min(1, dt * 8); }
        drawFrame(ctx, v, w, h, cam.current.x, cam.current.y);
        if (miniRef.current) drawMinimap(miniRef.current.getContext('2d')!, v, miniRef.current.width);
        if (t - hudT > 250 && mine) {
          hudT = t;
          const z = zoneAt(v.world, mine.x, mine.y);
          setZoneKey(z?.key ?? null);
          const near = [...v.players.values()].filter((p) => p.id !== v.you && Math.hypot(p.x - mine.x, p.y - mine.y) < 120).sort((a, b) => Math.hypot(a.x - mine.x, a.y - mine.y) - Math.hypot(b.x - mine.x, b.y - mine.y));
          setNearby((prev) => (prev.map((p) => p.id).join() === near.map((p) => p.id).join() ? prev : near));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const vis = () => { if (document.visibilityState === 'hidden') cancelAnimationFrame(raf); else { lastT = performance.now(); raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); };
  }, [ready]);

  // ───── Actions ─────
  const act = useMutation({
    mutationFn: (body: any) => api.post<any>(`/api/game/sessions/${sessionId}/action`, body),
    onSuccess: (r, body) => {
      if (r?.self) setSelf(r.self);
      if (body.type === 'work') push({ kind: 'success', title: `+$${r.earned} for your shift` });
      if (body.type === 'perform') push({ kind: 'success', title: `+$${r.tips} in tips from ${r.audience} fan(s)` });
      if (body.type === 'buy') push({ title: `Bought for $${r.price}${r.clerk ? ` (served by ${r.clerk})` : ''}` });
    },
    onError: (e: ApiError) => push({ kind: e.code === 'cooldown' ? 'info' : 'error', title: e.message }),
  });
  const control = useMutation({ mutationFn: (action: string) => api.post(`/api/game/sessions/${sessionId}/control`, { action }), onError });
  const sendChat = useMutation({ mutationFn: (text: string) => api.post(`/api/game/sessions/${sessionId}/chat`, { text }), onError: (e: ApiError) => push({ kind: 'error', title: e.message }) });
  const leave = useMutation({
    mutationFn: () => api.post(`/api/game/sessions/${sessionId}/leave`),
    onSuccess: () => { api.get('/api/me').then(setMe).catch(() => {}); nav(experienceId ? `/play/${experienceId}` : '/', { replace: true }); },
    onError,
  });

  const zone = view.current?.world.zones.find((z) => z.key === zoneKey) ?? null;
  const shopItems = items.filter((i) => i.soldIn && i.soldIn === zoneKey);
  const atWork = Boolean(myRole?.workZone && myRole.workZone === zoneKey);
  const canPerform = Boolean(myRole?.permissions.includes('perform') && zoneKey === 'stage');
  const primary = canPerform ? { label: 'Perform', icon: '🎤', run: () => act.mutate({ type: 'perform' }) }
    : atWork ? { label: 'Work', icon: '💼', run: () => act.mutate({ type: 'work' }) }
      : shopItems.length ? { label: 'Shop', icon: '🛒', run: () => setSheet('shop') } : null;
  const primaryRef = useRef<(() => void) | null>(null);
  primaryRef.current = primary?.run ?? null;
  const isHost = hostId === me.account.id;
  const salePct = effects.sale && effects.sale.until > Date.now() ? effects.sale.multiplier : 1;
  const players = useMemo(() => [...(view.current?.players.values() ?? [])], [rosterVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const timeLimit = scenario?.timeLimitMinutes ? scenario.timeLimitMinutes * 60_000 : null;

  if (detail.isLoading) return <div className="game-screen"><Spinner label="Joining session…" /></div>;
  if (detail.error) return <div className="game-screen center-col"><p>{(detail.error as ApiError).message}</p><Button onClick={() => nav('/')}>Home</Button></div>;

  return (
    <div className="game-screen">
      <canvas ref={canvasRef} className="game-canvas" />
      {!ready && !summary && !fatal && <div className="game-loading"><Spinner label={conn === 'retrying' ? 'Reconnecting…' : 'Entering the city…'} /></div>}

      {/* Top HUD */}
      <div className="hud-top">
        <button className="hud-btn" aria-label="Back" onClick={() => nav(-1)}><ChevronLeft size={20} /></button>
        <div className="hud-title">
          <strong className="ellipsis">{sessionName}</strong>
          <span className="tiny">{scenario?.name} · <span className={`status-${status}`}>{status}</span> · {duration(elapsed)}{timeLimit ? ` / ${duration(timeLimit)}` : ''}</span>
        </div>
        {conn !== 'open' && ready && <span className="hud-pill warn"><WifiOff size={14} /> reconnecting</span>}
        {conn === 'open' && <span className="hud-pill ok" title="Connected"><Wifi size={14} /></span>}
        {isHost && <button className="hud-btn host" aria-label="Host controls" onClick={() => setSheet('host')}><Crown size={18} /></button>}
      </div>

      {self && (
        <div className="hud-stats">
          <span className="hud-cash">${full(self.cash)}</span>
          <div className="energy" title={`Energy ${self.energy}`}><div style={{ width: `${self.energy}%` }} /></div>
          <span className="tiny">Lv {self.level} · ⭐ {self.reputation}</span>
          <button className="role-pill" style={{ background: myRole?.color }} onClick={() => setSheet('role')}>{myRole?.name ?? 'Role'}</button>
          {salePct < 1 && <span className="hud-pill sale">SALE −{Math.round((1 - salePct) * 100)}%</span>}
        </div>
      )}

      {showMap && <canvas ref={miniRef} className="minimap" width={150} height={100} onClick={() => setShowMap(false)} />}
      {!showMap && <button className="hud-btn map-toggle" aria-label="Show map" onClick={() => setShowMap(true)}><MapIcon size={18} /></button>}

      {self && showObjectives && self.objectives.length > 0 && (
        <div className="objectives" onClick={() => setShowObjectives(false)}>
          <strong className="tiny">{self.completed ? '🏅 All objectives complete!' : 'Objectives'}</strong>
          {self.objectives.map((o) => (
            <div key={o.key} className={`obj ${o.done ? 'done' : ''}`}>
              <span>{o.done ? '✔' : '○'} {o.label}</span>
              {!o.done && o.target > 1 && <span className="tiny">{o.progress}/{o.target}</span>}
            </div>
          ))}
        </div>
      )}
      {!showObjectives && <button className="hud-btn obj-toggle" aria-label="Objectives" onClick={() => setShowObjectives(true)}><Target size={18} /></button>}

      <div className="banners">
        {banners.filter((b) => b.until > Date.now()).map((b) => <div key={b.id} className={`banner banner-${b.kind}`}>{b.text}</div>)}
      </div>

      <div className="feed">
        {feed.slice(-3).map((f, i) => <div key={`${f.at}-${i}`} className="feed-line">{f.text}</div>)}
        {chat.slice(-3).map((c) => <div key={c.id} className={`feed-line chat ${c.kind}`}>{c.kind === 'chat' ? <><b style={{ color: c.roleColor }}>{c.name}:</b> {c.text}</> : <i>{c.text}</i>}</div>)}
      </div>

      {zone && <div className="zone-label">{zone.name}{atWork ? ' · your workplace' : ''}</div>}

      {status === 'lobby' && ready && (
        <div className="lobby-overlay card">
          <strong>{isHost ? 'Your session is ready' : 'Waiting for the host to start'}</strong>
          <span className="muted small">{players.length} in the city · explore while you wait</span>
          {isHost && <Button icon={<Play size={16} />} onClick={() => control.mutate('start')} loading={control.isPending}>Start session</Button>}
        </div>
      )}
      {status === 'paused' && <div className="lobby-overlay card"><strong>Paused by the host</strong>{isHost && <Button icon={<Play size={16} />} onClick={() => control.mutate('resume')}>Resume</Button>}</div>}

      <Joystick onChange={(x, y) => { stick.current = { x, y }; }} />

      <div className="action-pad">
        {primary && <button className="act primary" onClick={primary.run} disabled={act.isPending}><span>{primary.icon}</span>{primary.label}</button>}
        <div className="act-row">
          <button className="act" aria-label="Interact" onClick={() => setSheet('interact')}><Hand size={20} />{nearby.length > 0 && <span className="count">{nearby.length}</span>}</button>
          <button className="act" aria-label="Bag" onClick={() => setSheet('bag')}><Backpack size={20} /></button>
          <button className="act" aria-label="Emotes" onClick={() => setSheet('emote')}><Smile size={20} /></button>
          <button className="act" aria-label="Chat" onClick={() => setSheet('chat')}><MessageCircle size={20} /></button>
        </div>
        <div className="act-row zoom">
          <button className="act sm" aria-label="Zoom out" onClick={() => { zoomUser.current = Math.max(0.5, zoomUser.current - 0.15); }}><Minus size={16} /></button>
          <button className="act sm" aria-label="Zoom in" onClick={() => { zoomUser.current = Math.min(1.8, zoomUser.current + 0.15); }}><Plus size={16} /></button>
        </div>
      </div>

      {/* Sheets */}
      <Sheet open={sheet === 'shop'} onClose={() => setSheet(null)} title={zone ? `${zone.name}` : 'Shop'}>
        {salePct < 1 && <div className="notice notice-rp">Flash sale: {Math.round((1 - salePct) * 100)}% off!</div>}
        <div className="list">
          {shopItems.map((i) => {
            const price = Math.round(i.price * salePct);
            return (
              <div key={i.id} className="row">
                <span className="emoji">{ITEM_EMOJI[i.icon] ?? '📦'}</span>
                <div className="row-main"><strong>{i.name}</strong><div className="muted tiny">{i.description}</div></div>
                <Button size="sm" disabled={!self || self.cash < price} onClick={() => act.mutate({ type: 'buy', itemId: i.id })}>${price}</Button>
              </div>
            );
          })}
        </div>
        <p className="muted tiny">In-game cash is part of the roleplay session economy.</p>
      </Sheet>

      <Sheet open={sheet === 'interact'} onClose={() => setSheet(null)} title="Interact">
        <RoleActions role={myRole} onAct={(b) => act.mutate(b)} cityFund={self?.cityFund ?? 0} />
        {nearby.length === 0 ? <p className="muted">Walk up to someone to interact.</p> : nearby.map((p) => (
          <div key={p.id} className="interact-card card">
            <div className="row-between"><strong>{p.name}</strong><span className="role-pill sm" style={{ background: p.roleColor }}>{p.roleName}</span></div>
            <div className="row-gap wrap">
              {myRole?.permissions.includes('heal') && <Button size="sm" onClick={() => act.mutate({ type: 'heal', targetId: p.id })}>🩺 Treat</Button>}
              {myRole?.permissions.includes('cite') && <Button size="sm" variant="secondary" onClick={() => act.mutate({ type: 'cite', targetId: p.id, reason: 'disturbing the peace' })}>📝 Cite</Button>}
              {myRole?.permissions.includes('interview') && <Button size="sm" onClick={() => act.mutate({ type: 'interview', targetId: p.id })}>🎙️ Interview</Button>}
              {[5, 20, 50].map((amt) => <Button key={amt} size="sm" variant="ghost" disabled={!self || self.cash < amt} onClick={() => act.mutate({ type: 'give_cash', targetId: p.id, amount: amt })}>Give ${amt}</Button>)}
              {self?.inventory.map((inv) => { const it = items.find((x) => x.id === inv.id); return it ? <Button key={inv.id} size="sm" variant="ghost" onClick={() => act.mutate({ type: 'give_item', targetId: p.id, itemId: inv.id })}>Give {ITEM_EMOJI[it.icon] ?? ''} {it.name}</Button> : null; })}
            </div>
          </div>
        ))}
      </Sheet>

      <Sheet open={sheet === 'bag'} onClose={() => setSheet(null)} title="Your bag">
        <div className="kv"><span>Cash</span><strong>${full(self?.cash ?? 0)}</strong></div>
        <div className="kv"><span>Energy</span><strong>{self?.energy ?? 0}/100</strong></div>
        <div className="kv"><span>Level / XP</span><strong>{self?.level} · {self?.xp} XP</strong></div>
        {(self?.inventory.length ?? 0) === 0 ? <p className="muted">Your bag is empty. Visit shops around the city.</p> : (
          <div className="list">
            {self!.inventory.map((inv) => {
              const it = items.find((x) => x.id === inv.id);
              if (!it) return null;
              return (
                <div key={inv.id} className="row">
                  <span className="emoji">{ITEM_EMOJI[it.icon] ?? '📦'}</span>
                  <div className="row-main"><strong>{it.name} ×{inv.qty}</strong><div className="muted tiny">{it.description}</div></div>
                  <Button size="sm" onClick={() => act.mutate({ type: 'use', itemId: it.id })}>Use</Button>
                </div>
              );
            })}
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === 'emote'} onClose={() => setSheet(null)} title="Emotes">
        <div className="emote-grid">
          {emotes.map((e) => <button key={e} className="emote-btn" onClick={() => { act.mutate({ type: 'emote', emote: e }); setSheet(null); }}><span>{EMOJI[e] ?? '✨'}</span>{e}</button>)}
        </div>
        <p className="muted tiny">Equip more emotes in the Avatar editor.</p>
      </Sheet>

      <ChatSheet open={sheet === 'chat'} onClose={() => setSheet(null)} chat={chat} send={(t) => sendChat.mutate(t)} disabled={!settings.chatEnabled && !isHost} />

      <Sheet open={sheet === 'role'} onClose={() => setSheet(null)} title="Choose a role">
        {!settings.allowRoleSwitch && status !== 'lobby' && !isHost && <p className="muted">The host has locked roles for this session.</p>}
        <div className="list">
          {roles.filter((r) => scenario?.roles.includes(r.id) && (!r.hostOnly || isHost)).map((r) => (
            <button key={r.id} className={`row role-row ${r.id === self?.roleId ? 'active' : ''}`} disabled={!settings.allowRoleSwitch && status !== 'lobby' && !isHost}
              onClick={() => api.post(`/api/game/sessions/${sessionId}/role`, { roleId: r.id }).then(() => setSheet(null)).catch((e) => push({ kind: 'error', title: e.message }))}>
              <span className="role-dot" style={{ background: r.color }} />
              <div className="row-main"><strong>{r.name}</strong><div className="muted tiny">{r.description}{r.salary ? ` · $${r.salary}/shift` : ''}</div></div>
            </button>
          ))}
        </div>
      </Sheet>

      {isHost && (
        <HostPanel
          open={sheet === 'host'} onClose={() => setSheet(null)} sessionId={sessionId} status={status} roles={roles} scenario={scenario}
          players={players} me={me.account.id} settings={settings} privacy={privacy} accessCode={accessCode} onControl={(a) => control.mutate(a)}
        />
      )}

      <Sheet open={Boolean(summary)} onClose={() => nav(experienceId ? `/play/${experienceId}` : '/')} title="Session complete">
        {summary && <SessionSummaryView summary={summary} />}
        <div className="row-gap">
          <Button onClick={() => nav(experienceId ? `/play/${experienceId}` : '/', { replace: true })}>Back to lobby</Button>
          <Button variant="secondary" onClick={() => nav('/', { replace: true })}>Home</Button>
        </div>
      </Sheet>

      <Sheet open={Boolean(fatal)} onClose={() => nav('/')} title="Disconnected">
        <p>{fatal}</p>
        <Button onClick={() => nav(experienceId ? `/play/${experienceId}` : '/', { replace: true })}>Back to lobby</Button>
      </Sheet>

      <button className="hud-btn leave" aria-label="Leave session" onClick={() => { if (confirm('Leave this session? Your character keeps its progress.')) leave.mutate(); }}><LogOut size={18} /></button>
    </div>
  );
}

function RoleActions({ role, onAct, cityFund }: { role: Role | null; onAct: (b: any) => void; cityFund: number }) {
  const [text, setText] = useState('');
  if (!role) return null;
  const perms = role.permissions;
  if (!perms.some((p) => ['broadcast', 'announce', 'grant_bonus'].includes(p))) return null;
  return (
    <div className="card pad role-actions">
      <strong>{role.name} actions</strong>
      {(perms.includes('broadcast') || perms.includes('announce')) && (
        <div className="compose">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder={perms.includes('broadcast') ? 'Breaking news headline' : 'City announcement'} aria-label="Announcement text" />
          <button className="icon-btn" aria-label="Send" onClick={() => { if (text.trim()) { onAct({ type: perms.includes('broadcast') ? 'broadcast' : 'announce', text }); setText(''); } }}><Megaphone size={18} /></button>
        </div>
      )}
      {perms.includes('grant_bonus') && <Button size="sm" variant="secondary" onClick={() => onAct({ type: 'grant_bonus' })}>Pay city bonus (fund ${cityFund})</Button>}
    </div>
  );
}

function ChatSheet({ open, onClose, chat, send, disabled }: { open: boolean; onClose: () => void; chat: ChatMsg[]; send: (t: string) => void; disabled: boolean }) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [chat, open]);
  return (
    <Sheet open={open} onClose={onClose} title="Chat" tall footer={
      <form className="compose" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send(text.trim()); setText(''); } }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={disabled ? 'Chat is turned off' : 'Say something…'} disabled={disabled} aria-label="Chat message" autoFocus />
        <button className="icon-btn" aria-label="Send" disabled={disabled}><Send size={18} /></button>
      </form>
    }>
      <div className="chat-log">
        {chat.map((c) => <div key={c.id} className={`chat-line ${c.kind}`}>{c.kind === 'chat' ? <><b style={{ color: c.roleColor }}>{c.name}</b> {c.text}</> : <i>{c.text}</i>}</div>)}
        <div ref={end} />
      </div>
    </Sheet>
  );
}

const QUICK_EVENTS: { type: string; label: string; params: any; ask?: string }[] = [
  { type: 'coin_rain', label: '✨ Spark shower', params: { count: 25 } },
  { type: 'market_sale', label: '🏷️ Flash sale', params: { multiplier: 0.5, durationSeconds: 60 } },
  { type: 'breaking_news', label: '📰 Breaking news', params: {}, ask: 'Headline' },
  { type: 'announcement', label: '📣 Announcement', params: {}, ask: 'Announcement' },
  { type: 'blackout', label: '🌑 Blackout', params: { durationSeconds: 30 } },
  { type: 'weather_rain', label: '🌧️ Rain', params: { durationSeconds: 60 } },
  { type: 'cash_bonus', label: '💵 Cash bonus', params: { amount: 50 } },
  { type: 'clue_hunt', label: '🔎 Clue hunt', params: { count: 5 } },
  { type: 'award_ceremony', label: '🏆 Award ceremony', params: { winner: 'top_earner' }, ask: 'Award title' },
];

function HostPanel({ open, onClose, sessionId, status, roles, scenario, players, me, settings, privacy, accessCode, onControl }: {
  open: boolean; onClose: () => void; sessionId: number; status: string; roles: Role[]; scenario: Scenario | null; players: GPlayer[]; me: number;
  settings: any; privacy: string; accessCode?: string; onControl: (a: string) => void;
}) {
  const onError = useErrorToast();
  const { push } = useToast();
  const [tab, setTab] = useState<'session' | 'events' | 'players' | 'invite'>('session');
  const meta = useQuery({ queryKey: ['game-meta'], queryFn: () => api.get<any>('/api/game/meta'), enabled: open });
  const friends = useQuery({ queryKey: ['friends', me, 'invite'], queryFn: () => api.get<Paged<AccountCard>>(`/api/accounts/${me}/friends?limit=100`), enabled: open && tab === 'invite' });
  const ev = useMutation({ mutationFn: (b: any) => api.post(`/api/game/sessions/${sessionId}/event`, b), onSuccess: () => push({ title: 'Event triggered' }), onError });
  const upd = useMutation({ mutationFn: (b: any) => api.patch(`/api/game/sessions/${sessionId}/settings`, b), onError });
  const assign = useMutation({ mutationFn: (b: any) => api.post(`/api/game/sessions/${sessionId}/assign-role`, b), onError });
  const kick = useMutation({ mutationFn: (accountId: number) => api.post(`/api/game/sessions/${sessionId}/kick`, { accountId }), onError });
  const scen = useMutation({ mutationFn: (scenarioId: number) => api.post(`/api/game/sessions/${sessionId}/scenario`, { scenarioId }), onError });
  const invite = useMutation({ mutationFn: (accountId: number) => api.post(`/api/game/sessions/${sessionId}/invite`, { accountId }), onSuccess: () => push({ title: 'Invite sent' }), onError });
  return (
    <Sheet open={open} onClose={onClose} title="Host controls" tall>
      <div className="tabs">{(['session', 'events', 'players', 'invite'] as const).map((t) => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
      {tab === 'session' && (
        <>
          <div className="row-gap wrap">
            {status === 'lobby' && <Button icon={<Play size={16} />} onClick={() => onControl('start')}>Start</Button>}
            {status === 'active' && <Button variant="secondary" icon={<Pause size={16} />} onClick={() => onControl('pause')}>Pause</Button>}
            {status === 'paused' && <Button icon={<Play size={16} />} onClick={() => onControl('resume')}>Resume</Button>}
            <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => { if (confirm('Reset the scenario? Cash, objectives and pickups restart.')) onControl('reset'); }}>Reset scenario</Button>
            <Button variant="danger" icon={<Flag size={16} />} onClick={() => { if (confirm('End the session for everyone?')) onControl('end'); }}>End session</Button>
          </div>
          {status === 'lobby' && meta.data && (
            <label className="field"><span className="field-label">Scenario</span>
              <select value={scenario?.id} onChange={(e) => scen.mutate(Number(e.target.value))}>{meta.data.scenarios.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
          )}
          <label className="field"><span className="field-label">Privacy</span>
            <select value={privacy} onChange={(e) => upd.mutate({ privacy: e.target.value })}><option value="public">Public</option><option value="friends">Friends of host</option><option value="private">Private (join code)</option></select>
          </label>
          {accessCode && <div className="kv"><span>Join code</span><span><code>{accessCode}</code> <button className="icon-btn" aria-label="Copy code" onClick={() => navigator.clipboard?.writeText(accessCode)}><Copy size={14} /></button> <button className="link small" onClick={() => upd.mutate({ regenerateCode: true })}>new</button></span></div>}
          <Toggle label="Chat enabled" checked={settings.chatEnabled !== false} onChange={(v) => upd.mutate({ settings: { chatEnabled: v } })} />
          <Toggle label="Players can switch roles" checked={settings.allowRoleSwitch !== false} onChange={(v) => upd.mutate({ settings: { allowRoleSwitch: v } })} />
          <Toggle label="Host can trigger events" checked={settings.hostEvents !== false} onChange={(v) => upd.mutate({ settings: { hostEvents: v } })} />
        </>
      )}
      {tab === 'events' && (
        <div className="event-grid">
          {QUICK_EVENTS.map((q) => (
            <button key={q.type} className="event-btn" disabled={status !== 'active'} onClick={() => {
              const params = { ...q.params };
              if (q.ask) { const t = prompt(q.ask); if (!t) return; if (q.type === 'award_ceremony') params.title = t; else params.text = t; }
              ev.mutate({ type: q.type, params });
            }}>{q.label}</button>
          ))}
          {status !== 'active' && <p className="muted small">Start the session to trigger events.</p>}
        </div>
      )}
      {tab === 'players' && (
        <div className="list">
          {players.map((p) => (
            <div key={p.id} className="row">
              <div className="row-main"><strong>{p.name}{p.isBot ? ' · extra' : ''}</strong><div className="muted tiny">{p.connected ? 'connected' : 'away'}</div></div>
              <select className="select-sm" value={roles.find((r) => r.key === p.roleKey)?.id} onChange={(e) => assign.mutate({ accountId: p.id, roleId: Number(e.target.value) })} aria-label="Role">
                {roles.filter((r) => scenario?.roles.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {p.id !== me && <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remove ${p.name}?`)) kick.mutate(p.id); }}>Kick</Button>}
            </div>
          ))}
        </div>
      )}
      {tab === 'invite' && (
        <div className="list">
          {friends.data?.items.length === 0 && <p className="muted">Add friends to invite them.</p>}
          {friends.data?.items.map((f) => (
            <div key={f.id} className="row"><div className="row-main"><strong>{f.displayName}</strong><div className="muted tiny">@{f.username}</div></div><Button size="sm" icon={<UserPlus size={14} />} onClick={() => invite.mutate(f.id)}>Invite</Button></div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function SessionSummaryView({ summary }: { summary: any }) {
  if (!summary?.participants) return <p className="muted">This session has ended.</p>;
  const sorted = [...summary.participants].sort((a: any, b: any) => (b.earned ?? 0) - (a.earned ?? 0));
  return (
    <div className="summary">
      <div className="kv"><span>Scenario</span><strong>{summary.scenario?.name}</strong></div>
      <div className="kv"><span>Duration</span><strong>{duration(summary.durationMs)}</strong></div>
      {summary.topEarner && <div className="kv"><span>Top earner</span><strong>🏆 {summary.topEarner.name} (${full(summary.topEarner.earned)})</strong></div>}
      <div className="list">
        {sorted.map((p: any) => (
          <div key={p.accountId} className="row">
            <div className="row-main"><strong>{p.name ?? 'Player'}{p.isBot ? ' · extra' : ''}</strong><div className="muted tiny">{p.role}{p.completed ? ' · 🏅 all objectives' : ''}</div></div>
            <span>${full(p.earned ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const pid = useRef<number | null>(null);
  const R = 52;
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy, active: true });
    const mag = Math.min(1, d / R);
    onChange(mag < 0.15 ? 0 : (dx / R), mag < 0.15 ? 0 : (dy / R));
  };
  const end = () => { pid.current = null; setKnob({ x: 0, y: 0, active: false }); onChange(0, 0); };
  return (
    <div ref={base} className={`joystick ${knob.active ? 'active' : ''}`}
      onPointerDown={(e) => { pid.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => { if (pid.current === e.pointerId) update(e); }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
