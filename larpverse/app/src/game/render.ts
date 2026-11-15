import type { World, Zone } from './world';

export type Look = {
  skin: string; shirt: string; pants: string;
  hair: { style: string; color: string } | null; hat: { style: string; color: string } | null;
  back: { style: string; color: string } | null; aura: string | null;
};

export type GPlayer = {
  id: number; name: string; roleKey?: string; roleName?: string; roleColor?: string; look: Look; level: number; isBot: boolean; connected: boolean;
  completed: boolean; emote: { key: string; until: number } | null; bubble: { text: string; until: number } | null;
  x: number; y: number; facing: number; moving: boolean;
  fromX: number; fromY: number; toX: number; toY: number; t0: number; t1: number;
};

export type Pickup = { id: number; type: 'spark' | 'clue'; x: number; y: number; value: number };

export type Effects = {
  rain?: { kind: string; until: number }; sale?: { multiplier: number; until: number }; blackout?: { until: number };
  weather?: { kind: string; until: number }; spotlight?: { accountId: number; until: number; title?: string };
};

export type GameView = {
  world: World; players: Map<number, GPlayer>; pickups: Map<number, Pickup>; effects: Effects; you: number;
  lighting: 'day' | 'dusk' | 'night'; myWorkZone: string | null; zoom: number;
};

const EMOTE_ICON: Record<string, string> = {
  wave: '👋', cheer: '🎉', dance: '💃', clap: '👏', salute: '🫡', shrug: '🤷', laugh: '😂', spin: '🌀', jump: '⬆️', bow: '🙇', victory: '✌️',
};
const ZONE_ICON: Record<string, string> = {
  cart: '🛒', coffee: '☕', bank: '🏦', shield: '🚓', home: '🏢', tree: '🌳', star: '⭐', music: '🎤', cross: '🏥', mic: '📺', landmark: '🏛️', gamepad: '🕹️',
};

let rainDrops: { x: number; y: number; s: number }[] = [];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawZone(ctx: CanvasRenderingContext2D, z: Zone, mine: boolean, t: number) {
  ctx.fillStyle = z.floor;
  if (z.kind === 'open') {
    roundRect(ctx, z.x, z.y, z.w, z.h, 24);
    ctx.fill();
    if (z.key === 'plaza') {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2;
      for (let x = z.x + 40; x < z.x + z.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, z.y); ctx.lineTo(x, z.y + z.h); ctx.stroke(); }
      for (let y = z.y + 40; y < z.y + z.h; y += 40) { ctx.beginPath(); ctx.moveTo(z.x, y); ctx.lineTo(z.x + z.w, y); ctx.stroke(); }
    }
    if (z.key === 'park') {
      ctx.fillStyle = 'rgba(0,80,0,0.08)';
      for (let i = 0; i < 40; i++) ctx.fillRect(z.x + ((i * 97) % z.w), z.y + ((i * 53) % z.h), 6, 6);
    }
    if (z.key === 'stage') {
      ctx.fillStyle = '#2d2544';
      roundRect(ctx, z.x + 180, z.y + 20, 340, 90, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(z.x + 200 + i * 38, z.y + 112, 5, 0, Math.PI * 2); ctx.fill(); }
    }
  } else {
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = z.x + 30; x < z.x + z.w; x += 30) { ctx.beginPath(); ctx.moveTo(x, z.y); ctx.lineTo(x, z.y + z.h); ctx.stroke(); }
    // Counter / station
    const s = z.station;
    ctx.fillStyle = z.roof ?? '#555';
    roundRect(ctx, s.x - 70, s.y - 16, 140, 32, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, s.x - 64, s.y - 12, 128, 10, 5);
    ctx.fill();
  }
  if (mine) {
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.55 + Math.sin(t / 300) * 0.25})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 12]);
    roundRect(ctx, z.x + 6, z.y + 6, z.w - 12, z.h - 12, 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSign(ctx: CanvasRenderingContext2D, z: Zone) {
  const label = `${ZONE_ICON[z.icon] ?? ''} ${z.name}`;
  ctx.font = '600 20px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 28;
  const x = z.x + z.w / 2 - w / 2;
  const y = z.kind === 'building' ? (z.door === 'bottom' ? z.y + z.h + 6 : z.y - 40) : z.y + 8;
  ctx.fillStyle = z.kind === 'building' ? (z.roof ?? '#333') : 'rgba(20,16,40,0.7)';
  roundRect(ctx, x, y, w, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, z.x + z.w / 2, y + 17);
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: GPlayer, isYou: boolean, t: number, spotlight: boolean) {
  const L = p.look;
  const bob = p.moving ? Math.sin(t / 90 + p.id) * 2.5 : Math.sin(t / 600 + p.id) * 1;
  const x = p.x;
  const y = p.y + bob;
  if (L.aura) {
    const g = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, 46);
    const c = L.aura === 'shadow' ? '20,0,40' : L.aura === 'frost' ? '180,220,255' : L.aura === 'flame' ? '255,120,40' : '255,210,90';
    g.addColorStop(0, `rgba(${c},0.55)`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - 10, 46, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (isYou) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 24, 10, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (L.back) {
    ctx.fillStyle = L.back.color;
    if (['wings', 'angelwings', 'batwings'].includes(L.back.style)) {
      ctx.beginPath(); ctx.ellipse(x - 20, y - 4, 14, 22, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 20, y - 4, 14, 22, 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (L.back.style === 'cape') {
      ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x + 18, y + 18); ctx.lineTo(x - 18, y + 18); ctx.fill();
    } else {
      roundRect(ctx, x - 14, y - 6, 28, 20, 6); ctx.fill();
    }
  }
  // legs
  ctx.fillStyle = L.pants;
  const step = p.moving ? Math.sin(t / 80 + p.id) * 4 : 0;
  roundRect(ctx, x - 10, y + 4 + step, 8, 12, 3); ctx.fill();
  roundRect(ctx, x + 2, y + 4 - step, 8, 12, 3); ctx.fill();
  // body
  ctx.fillStyle = L.shirt;
  roundRect(ctx, x - 14, y - 12, 28, 22, 8); ctx.fill();
  // arms
  ctx.fillStyle = L.skin;
  roundRect(ctx, x - 19, y - 10 - step / 2, 6, 16, 3); ctx.fill();
  roundRect(ctx, x + 13, y - 10 + step / 2, 6, 16, 3); ctx.fill();
  // head
  ctx.fillStyle = L.skin;
  roundRect(ctx, x - 16, y - 42, 32, 30, 12); ctx.fill();
  // hair
  if (L.hair) {
    ctx.fillStyle = L.hair.color;
    ctx.beginPath();
    ctx.ellipse(x, y - 36, 17, 9, 0, Math.PI, 0);
    ctx.fill();
    if (['long', 'wavy', 'bob'].includes(L.hair.style)) { roundRect(ctx, x - 18, y - 38, 6, 22, 3); ctx.fill(); roundRect(ctx, x + 12, y - 38, 6, 22, 3); ctx.fill(); }
    if (L.hair.style === 'afro' || L.hair.style === 'curly') { ctx.beginPath(); ctx.arc(x, y - 40, 15, Math.PI, 0); ctx.fill(); }
    if (L.hair.style === 'mohawk') { ctx.fillRect(x - 3, y - 52, 6, 14); }
    if (L.hair.style === 'bun') { ctx.beginPath(); ctx.arc(x, y - 47, 6, 0, Math.PI * 2); ctx.fill(); }
  }
  // eyes (facing)
  ctx.fillStyle = '#1f2330';
  const ex = p.facing * 3;
  ctx.beginPath(); ctx.arc(x - 6 + ex, y - 27, 2.4, 0, Math.PI * 2); ctx.arc(x + 6 + ex, y - 27, 2.4, 0, Math.PI * 2); ctx.fill();
  // hat
  if (L.hat) {
    ctx.fillStyle = L.hat.color;
    const s = L.hat.style;
    if (s === 'crown' || s === 'tiara') {
      ctx.beginPath(); ctx.moveTo(x - 12, y - 42); ctx.lineTo(x - 12, y - 52); ctx.lineTo(x - 6, y - 46); ctx.lineTo(x, y - 55); ctx.lineTo(x + 6, y - 46); ctx.lineTo(x + 12, y - 52); ctx.lineTo(x + 12, y - 42); ctx.fill();
    } else if (s === 'tophat') {
      ctx.fillRect(x - 10, y - 60, 20, 18); ctx.fillRect(x - 16, y - 44, 32, 4);
    } else if (s === 'halo') {
      ctx.strokeStyle = L.hat.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 52, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (s === 'wizard' || s === 'partyhat') {
      ctx.beginPath(); ctx.moveTo(x - 14, y - 40); ctx.lineTo(x, y - 68); ctx.lineTo(x + 14, y - 40); ctx.fill();
    } else if (s === 'helmet') {
      ctx.globalAlpha = 0.85; roundRect(ctx, x - 19, y - 46, 38, 36, 14); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(180,230,255,0.5)'; roundRect(ctx, x - 12, y - 36, 24, 16, 6); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(x, y - 41, 17, 8, 0, Math.PI, 0); ctx.fill();
    }
  }
  // labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 13px system-ui, sans-serif';
  const label = p.name;
  const w = Math.max(ctx.measureText(label).width, 30) + 14;
  ctx.fillStyle = 'rgba(15,10,35,0.72)';
  roundRect(ctx, x - w / 2, y - 84, w, 20, 8); ctx.fill();
  ctx.fillStyle = spotlight ? '#ffd166' : '#fff';
  ctx.fillText(label, x, y - 69);
  if (p.roleName) {
    ctx.font = '700 10px system-ui, sans-serif';
    const rw = ctx.measureText(p.roleName).width + 10;
    ctx.fillStyle = p.roleColor ?? '#64748b';
    roundRect(ctx, x - rw / 2, y - 64, rw, 14, 6); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(p.roleName, x, y - 53.5);
  }
  if (p.completed) { ctx.font = '16px system-ui'; ctx.fillText('🏅', x + w / 2 + 8, y - 70); }
  if (!p.connected) { ctx.globalAlpha = 0.5; ctx.font = '12px system-ui'; ctx.fillText('💤', x + 18, y - 40); ctx.globalAlpha = 1; }
  if (p.emote && p.emote.until > Date.now()) {
    const k = (p.emote.until - Date.now()) / 3000;
    ctx.font = '28px system-ui';
    ctx.fillText(EMOTE_ICON[p.emote.key] ?? '✨', x, y - 92 - (1 - k) * 14);
  }
  if (p.bubble && p.bubble.until > Date.now()) {
    ctx.font = '600 13px system-ui, sans-serif';
    const text = p.bubble.text.length > 42 ? `${p.bubble.text.slice(0, 40)}…` : p.bubble.text;
    const bw = ctx.measureText(text).width + 18;
    const by = y - 118;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x - bw / 2, by, bw, 26, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6, by + 26); ctx.lineTo(x, by + 33); ctx.lineTo(x + 6, by + 26); ctx.fill();
    ctx.fillStyle = '#1f2330';
    ctx.fillText(text, x, by + 18);
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup, t: number) {
  const bob = Math.sin(t / 250 + pk.id) * 3;
  const x = pk.x;
  const y = pk.y + bob;
  if (pk.type === 'clue') {
    ctx.fillStyle = 'rgba(155, 93, 229, 0.25)';
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9b5de5';
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 1);
    return;
  }
  const r = 11 + Math.sin(t / 180 + pk.id) * 1.2;
  ctx.fillStyle = 'rgba(255, 201, 77, 0.25)';
  ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffc94d';
  ctx.strokeStyle = '#e08a00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

export function drawFrame(ctx: CanvasRenderingContext2D, v: GameView, w: number, h: number, camX: number, camY: number) {
  const t = performance.now();
  const now = Date.now();
  const { world } = v;
  ctx.save();
  ctx.fillStyle = '#76c27a';
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-camX, -camY);

  // ground details
  ctx.fillStyle = '#6cb870';
  for (let i = 0; i < 160; i++) ctx.fillRect((i * 313) % world.width, (i * 197) % world.height, 10, 4);
  ctx.strokeStyle = '#4f9a54';
  ctx.lineWidth = 12;
  ctx.strokeRect(0, 0, world.width, world.height);

  // roads
  for (const r of world.roads) {
    ctx.fillStyle = '#3b3f4e';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#f5f5f7';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    if (r.w > r.h) { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); } else { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const z of world.zones) drawZone(ctx, z, z.key === v.myWorkZone, t);
  ctx.fillStyle = '#2b2440';
  for (const wall of world.walls) {
    if (wall.kind === 'platform') continue;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  for (const pr of world.props) {
    if (pr.kind === 'lamp') {
      ctx.fillStyle = '#2b2f3f'; ctx.fillRect(pr.x - 3, pr.y - 30, 6, 30);
      ctx.fillStyle = '#ffe8a3'; ctx.beginPath(); ctx.arc(pr.x, pr.y - 32, 8, 0, Math.PI * 2); ctx.fill();
    } else if (pr.kind === 'bench') {
      ctx.fillStyle = '#7f5539'; roundRect(ctx, pr.x - 26, pr.y - 6, 52, 12, 4); ctx.fill();
    } else if (pr.kind === 'speakers') {
      ctx.fillStyle = '#1b1530'; roundRect(ctx, pr.x - 16, pr.y - 24, 32, 48, 6); ctx.fill();
      ctx.fillStyle = '#9b5de5'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const o of world.obstacles) {
    if (o.kind === 'fountain') {
      ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r - 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(o.x, o.y, 10 + Math.sin(t / 300) * 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#2d6a4f'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#40916c'; ctx.beginPath(); ctx.arc(o.x - 4, o.y - 4, o.r - 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const z of world.zones) drawSign(ctx, z);

  for (const pk of v.pickups.values()) drawPickup(ctx, pk, t);
  const spotlightId = v.effects.spotlight && v.effects.spotlight.until > now ? v.effects.spotlight.accountId : null;
  const sorted = [...v.players.values()].sort((a, b) => a.y - b.y);
  for (const p of sorted) drawPlayer(ctx, p, p.id === v.you, t, p.id === spotlightId);

  // Lighting: night, dusk, blackouts and the spotlight.
  const blackout = v.effects.blackout && v.effects.blackout.until > now;
  const darkness = blackout ? 0.86 : v.lighting === 'night' ? 0.6 : v.lighting === 'dusk' ? 0.28 : 0;
  ctx.restore();
  if (darkness > 0 || spotlightId) {
    const lights: { x: number; y: number; r: number }[] = [];
    for (const p of v.players.values()) lights.push({ x: p.x, y: p.y - 10, r: blackout ? 90 : 150 });
    if (!blackout) for (const pr of world.props) if (pr.kind === 'lamp') lights.push({ x: pr.x, y: pr.y - 30, r: 130 });
    const toScreen = (x: number, y: number) => ({ x: (x - camX) * v.zoom + w / 2, y: (y - camY) * v.zoom + h / 2 });
    ctx.save();
    const alpha = spotlightId ? Math.max(darkness, 0.55) : darkness;
    ctx.fillStyle = `rgba(6, 4, 24, ${alpha})`;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    if (spotlightId) {
      const sp = v.players.get(spotlightId);
      if (sp) { const s = toScreen(sp.x, sp.y - 20); ctx.moveTo(s.x + 120 * v.zoom, s.y); ctx.arc(s.x, s.y, 120 * v.zoom, 0, Math.PI * 2, true); }
    } else {
      for (const l of lights) { const s = toScreen(l.x, l.y); ctx.moveTo(s.x + l.r * v.zoom, s.y); ctx.arc(s.x, s.y, l.r * v.zoom, 0, Math.PI * 2, true); }
    }
    ctx.fill('evenodd');
    ctx.restore();
  }
  // Rain overlay (screen space)
  const raining = v.effects.weather && v.effects.weather.until > now;
  if (raining) {
    if (rainDrops.length === 0) rainDrops = Array.from({ length: 140 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 6 + Math.random() * 6 }));
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const d of rainDrops) {
      d.y += d.s * 2; d.x -= d.s * 0.4;
      if (d.y > h) { d.y = -10; d.x = Math.random() * w; }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 12);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(20, 30, 60, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }
}

export function drawMinimap(ctx: CanvasRenderingContext2D, v: GameView, size: number) {
  const { world } = v;
  const s = size / world.width;
  const hgt = world.height * s;
  ctx.clearRect(0, 0, size, hgt);
  ctx.fillStyle = 'rgba(20, 16, 40, 0.75)';
  ctx.fillRect(0, 0, size, hgt);
  ctx.fillStyle = '#4a4f63';
  for (const r of world.roads) ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
  for (const z of world.zones) {
    ctx.fillStyle = z.key === v.myWorkZone ? '#ffd166' : z.kind === 'building' ? (z.roof ?? '#666') : z.floor;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(z.x * s, z.y * s, z.w * s, z.h * s);
  }
  ctx.globalAlpha = 1;
  for (const p of v.players.values()) {
    ctx.fillStyle = p.id === v.you ? '#ffffff' : p.roleColor ?? '#ccc';
    ctx.beginPath(); ctx.arc(p.x * s, p.y * s, p.id === v.you ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
  }
}
