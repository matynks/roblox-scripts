// Larpverse City: the shared roleplay map. The server owns geometry (collision, zones) and sends
// it to clients in the session init message so rendering and simulation always agree.

const WALL = 14;
const DOOR = 96;

const ZONES = [
  // Top row: doors face the main road below.
  { key: 'market', name: 'Corner Market', kind: 'building', x: 80, y: 80, w: 440, h: 340, door: 'bottom', floor: '#f4e3c3', roof: '#e07a5f', icon: 'cart' },
  { key: 'cafe', name: 'Bean Scene Café', kind: 'building', x: 600, y: 80, w: 360, h: 340, door: 'bottom', floor: '#ead7c3', roof: '#9c6644', icon: 'coffee' },
  { key: 'bank', name: 'Larpverse Bank', kind: 'building', x: 1040, y: 80, w: 400, h: 340, door: 'bottom', floor: '#e6edf5', roof: '#3d5a80', icon: 'bank' },
  { key: 'police', name: 'Police HQ', kind: 'building', x: 1520, y: 80, w: 400, h: 340, door: 'bottom', floor: '#dde3ee', roof: '#1d3557', icon: 'shield' },
  { key: 'apartments', name: 'Skyline Apartments', kind: 'building', x: 2000, y: 80, w: 320, h: 340, door: 'bottom', floor: '#efe6f5', roof: '#7b2cbf', icon: 'home' },
  // Middle band: open areas.
  { key: 'park', name: 'Maple Park', kind: 'open', x: 80, y: 600, w: 700, h: 400, floor: '#8fd694', icon: 'tree' },
  { key: 'plaza', name: 'Central Plaza', kind: 'open', x: 900, y: 620, w: 600, h: 360, floor: '#d9d4cf', icon: 'star' },
  { key: 'stage', name: 'Grand Stage', kind: 'open', x: 1620, y: 600, w: 700, h: 400, floor: '#4a3f6b', icon: 'music' },
  // Bottom row: doors face the lower road above.
  { key: 'hospital', name: 'City Hospital', kind: 'building', x: 80, y: 1180, w: 480, h: 340, door: 'top', floor: '#eef7f7', roof: '#2a9d8f', icon: 'cross' },
  { key: 'news', name: 'LVN News Studio', kind: 'building', x: 640, y: 1180, w: 400, h: 340, door: 'top', floor: '#f1eee9', roof: '#e63946', icon: 'mic' },
  { key: 'cityhall', name: 'City Hall', kind: 'building', x: 1120, y: 1180, w: 460, h: 340, door: 'top', floor: '#f3efe0', roof: '#b08968', icon: 'landmark' },
  { key: 'arcade', name: 'Pixel Arcade', kind: 'building', x: 1660, y: 1180, w: 660, h: 340, door: 'top', floor: '#2b2d42', roof: '#ff006e', icon: 'gamepad' },
];

function buildingWalls(z) {
  const walls = [];
  const half = (z.w - DOOR) / 2;
  const top = { x: z.x, y: z.y, w: z.w, h: WALL };
  const bottom = { x: z.x, y: z.y + z.h - WALL, w: z.w, h: WALL };
  const split = (seg) => [
    { x: seg.x, y: seg.y, w: half, h: seg.h },
    { x: seg.x + half + DOOR, y: seg.y, w: half, h: seg.h },
  ];
  walls.push(...(z.door === 'top' ? split(top) : [top]));
  walls.push(...(z.door === 'bottom' ? split(bottom) : [bottom]));
  walls.push({ x: z.x, y: z.y, w: WALL, h: z.h });
  walls.push({ x: z.x + z.w - WALL, y: z.y, w: WALL, h: z.h });
  return walls;
}

function doorPoints(z) {
  const cx = z.x + z.w / 2;
  if (z.door === 'bottom') return { outside: { x: cx, y: z.y + z.h + 40 }, inside: { x: cx, y: z.y + z.h - 60 } };
  return { outside: { x: cx, y: z.y - 40 }, inside: { x: cx, y: z.y + 60 } };
}

function station(z) {
  if (z.kind === 'building') {
    return z.door === 'bottom' ? { x: z.x + z.w / 2, y: z.y + 90 } : { x: z.x + z.w / 2, y: z.y + z.h - 90 };
  }
  return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
}

function makeWorld() {
  const width = 2400;
  const height = 1600;
  const zones = ZONES.map((z) => ({ ...z, station: station(z), ...(z.kind === 'building' ? { doors: doorPoints(z) } : {}) }));
  const walls = [];
  for (const z of zones) if (z.kind === 'building') walls.push(...buildingWalls(z));
  // Stage platform and fountain are solid; trees too.
  const obstacles = [
    { x: 1200, y: 800, r: 56, kind: 'fountain' },
  ];
  const trees = [[160, 680], [300, 900], [460, 700], [620, 920], [700, 660], [240, 790], [540, 840], [380, 650]];
  for (const [x, y] of trees) obstacles.push({ x, y, r: 26, kind: 'tree' });
  walls.push({ x: 1800, y: 620, w: 340, h: 90, kind: 'platform' });

  const roads = [
    { x: 0, y: 470, w: width, h: 110 },
    { x: 0, y: 1040, w: width, h: 110 },
    { x: 820, y: 580, w: 60, h: 460 },
    { x: 1540, y: 580, w: 60, h: 460 },
  ];
  const props = [
    ...[[960, 660], [1440, 660], [960, 940], [1440, 940]].map(([x, y]) => ({ kind: 'lamp', x, y })),
    ...[[1000, 720], [1400, 720], [1000, 880], [1400, 880]].map(([x, y]) => ({ kind: 'bench', x, y })),
    { kind: 'speakers', x: 1760, y: 660 }, { kind: 'speakers', x: 2180, y: 660 },
  ];
  return { width, height, zones, walls, obstacles, roads, props, spawn: { x: 1200, y: 980 }, playerRadius: 16 };
}

export const WORLD = makeWorld();

export function zoneAt(x, y) {
  return WORLD.zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) ?? null;
}

export function zoneByKey(key) {
  return WORLD.zones.find((z) => z.key === key) ?? null;
}

export function inZone(p, key) {
  const z = zoneByKey(key);
  return Boolean(z) && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
}

function circleHitsRect(cx, cy, r, w) {
  const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
  const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function blocked(x, y, r = WORLD.playerRadius) {
  if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
  for (const w of WORLD.walls) if (circleHitsRect(x, y, r, w)) return true;
  for (const o of WORLD.obstacles) {
    const dx = x - o.x;
    const dy = y - o.y;
    if (dx * dx + dy * dy < (r + o.r) * (r + o.r)) return true;
  }
  return false;
}

/** Axis-separated movement so players slide along walls instead of sticking. */
export function moveWithCollision(p, dx, dy) {
  const r = WORLD.playerRadius;
  if (dx && !blocked(p.x + dx, p.y, r)) p.x += dx;
  if (dy && !blocked(p.x, p.y + dy, r)) p.y += dy;
}

/** Random free point, optionally inside a zone (for pickups/spawns). */
export function randomFreePoint(rand = Math.random, zoneKey = null, r = 14) {
  const z = zoneKey ? zoneByKey(zoneKey) : null;
  for (let i = 0; i < 200; i++) {
    const x = z ? z.x + 30 + rand() * (z.w - 60) : 30 + rand() * (WORLD.width - 60);
    const y = z ? z.y + 30 + rand() * (z.h - 60) : 30 + rand() * (WORLD.height - 60);
    if (!blocked(x, y, r)) {
      if (!z) {
        const at = zoneAt(x, y);
        if (at && at.kind === 'building') continue; // open-air points only unless a zone was asked for
      }
      return { x, y };
    }
  }
  return { ...WORLD.spawn };
}

/** Waypoints from p to target that pass through building doors. */
export function routeTo(p, target) {
  const from = zoneAt(p.x, p.y);
  const to = zoneAt(target.x, target.y);
  const pts = [];
  if (from?.kind === 'building' && from.key !== to?.key) pts.push(from.doors.inside, from.doors.outside);
  if (to?.kind === 'building' && from?.key !== to.key) pts.push(to.doors.outside, to.doors.inside);
  pts.push(target);
  return pts.map((q) => ({ x: q.x, y: q.y }));
}
