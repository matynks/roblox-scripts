// Client copy of the server's collision rules (geometry comes from the server in `init`),
// used to predict the local player's movement so controls feel instant.

export type Rect = { x: number; y: number; w: number; h: number; kind?: string };
export type Zone = Rect & { key: string; name: string; kind: 'building' | 'open'; door?: 'top' | 'bottom'; floor: string; roof?: string; icon: string; station: { x: number; y: number }; doors?: { inside: { x: number; y: number }; outside: { x: number; y: number } } };
export type World = {
  width: number; height: number; zones: Zone[]; walls: Rect[]; obstacles: { x: number; y: number; r: number; kind: string }[];
  roads: Rect[]; props: { kind: string; x: number; y: number }[]; spawn: { x: number; y: number }; playerRadius: number;
};

export const SPEED = 230;

function circleHitsRect(cx: number, cy: number, r: number, w: Rect) {
  const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
  const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function blocked(world: World, x: number, y: number, r = world.playerRadius) {
  if (x < r || y < r || x > world.width - r || y > world.height - r) return true;
  for (const w of world.walls) if (circleHitsRect(x, y, r, w)) return true;
  for (const o of world.obstacles) {
    const dx = x - o.x;
    const dy = y - o.y;
    if (dx * dx + dy * dy < (r + o.r) * (r + o.r)) return true;
  }
  return false;
}

export function move(world: World, p: { x: number; y: number }, dx: number, dy: number) {
  if (dx && !blocked(world, p.x + dx, p.y)) p.x += dx;
  if (dy && !blocked(world, p.x, p.y + dy)) p.y += dy;
}

export function zoneAt(world: World, x: number, y: number): Zone | null {
  return world.zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) ?? null;
}
