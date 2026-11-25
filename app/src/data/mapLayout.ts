// Layout for the Map tab: the same ring layout as the web dex's map. Each position is a
// hub with its own ring of moves. A move that works from several positions gets a copy
// in each ring (a "satellite"), linked only to that hub, so no lines cross the map.
import { positionLinks, positions, techniques, type MoveType, type Position, type Technique } from './catalog';

/** Spreads the catalog's position coordinates out to make room for the rings. */
const SCALE = 1.7;
const PAD = 260;
const TYPE_ORDER: MoveType[] = ['sub', 'sweep', 'pass', 'move', 'escape'];

export interface Hub { p: Position; x: number; y: number; ring: number }
export interface Sat { t: Technique; hub: Hub; key: string; x: number; y: number; angle: number }
export interface Link { a: Hub; b: Hub; x1: number; y1: number; x2: number; y2: number }

const raw = positions.map(p => ({ p, x: p.x * SCALE, y: p.y * SCALE, ring: 0 }));
const minX = Math.min(...raw.map(h => h.x)) - PAD;
const minY = Math.min(...raw.map(h => h.y)) - PAD;

export const hubs: Hub[] = raw.map(h => ({ ...h, x: h.x - minX, y: h.y - minY }));
export const hubById = new Map(hubs.map(h => [h.p.id, h]));

export const sats: Sat[] = hubs.flatMap(hub => {
  const ts = techniques.filter(t => t.from.includes(hub.p.id)).sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  const r = Math.max(64, (ts.length * 26) / (2 * Math.PI));
  hub.ring = ts.length ? r : 0;
  return ts.map((t, i) => {
    const angle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / ts.length;
    return { t, hub, key: `${t.id}@${hub.p.id}`, angle, x: hub.x + Math.cos(angle) * r, y: hub.y + Math.sin(angle) * r };
  });
});

/** Position links run from ring edge to ring edge so they don't cut through the rings. */
export const links: Link[] = positionLinks.map(([ia, ib]) => {
  const a = hubById.get(ia)!, b = hubById.get(ib)!;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ra = (a.ring || 30) + 14, rb = (b.ring || 30) + 14;
  return { a, b, x1: a.x + (dx / len) * ra, y1: a.y + (dy / len) * ra, x2: b.x - (dx / len) * rb, y2: b.y - (dy / len) * rb };
});

export const WORLD = {
  width: Math.max(...hubs.map(h => h.x)) + PAD,
  height: Math.max(...hubs.map(h => h.y)) + PAD,
};

/** What a tap at world point (x, y) hits, if anything: a move copy first (they sit on top), then a position. */
export function hitTest(x: number, y: number, scale: number): { sat?: Sat; hub?: Hub } | null {
  const slop = 6 / scale;
  let best: Sat | undefined, bestD = 16 + slop;
  for (const s of sats) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) { best = s; bestD = d; }
  }
  if (best) return { sat: best };
  for (const h of hubs) if (Math.hypot(h.x - x, h.y - y) < 30 + slop) return { hub: h };
  return null;
}
