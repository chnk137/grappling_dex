// Layout for the Map tab: a skill-tree style map that grows outward from one side of one
// position. Ring 1 = the moves you can do from there. Moves that take you somewhere
// lead out to ring 2 = the positions (and sides) you land in. Around each of those,
// a fan of their own moves (step 3). Submissions stay on ring 1 as finishes.
import type { Position, Side, Technique } from './catalog';
import { flowFrom, type FlowMove } from './flow';

export type NodeKind = 'root' | 'move' | 'dest' | 'next';
export interface MapNode {
  key: string; kind: NodeKind; x: number; y: number; angle: number;
  t?: Technique; pos?: Position; side?: Side | null;
  /** For moves: the position they're done from (for progress pips). For next moves: their dest key. */
  at?: string; parent?: string; finishes?: boolean;
}
export interface MapEdge { key: string; from: MapNode; to: MapNode; kind: 'spoke' | 'lead' | 'branch' }
export interface FlowMapLayout { nodes: MapNode[]; edges: MapEdge[]; r1: number; r2: number; radius: number }

const SLOT = 46;       // spacing between moves on ring 1
const MIN_BLOCK = 3;   // each destination gets at least this many slots, so branches don't crowd
const GAP = 160;       // ring 1 → ring 2

/** `keep` filters moves (e.g. "my game only"); it gets the move and the position it's done from. */
export function layoutFlowMap(posId: string, side: Side | null, keep: (t: Technique, at: string) => boolean = () => true): FlowMapLayout {
  const moves = flowFrom(posId, side).flatMap(g => g.moves).filter(m => keep(m.t, posId));
  // Group by where each move leaves you; finishes (no destination) form their own block.
  const blocks = new Map<string, { to: Position | null; side: Side | null; moves: FlowMove[] }>();
  for (const m of moves) {
    const k = m.to ? `${m.to.id}:${m.toSide ?? ''}` : 'finish';
    if (!blocks.has(k)) blocks.set(k, { to: m.to, side: m.toSide, moves: [] });
    blocks.get(k)!.moves.push(m);
  }
  const dests = [...blocks.entries()].filter(([k]) => k !== 'finish').sort((a, b) => b[1].moves.length - a[1].moves.length);
  const finish = blocks.get('finish');
  // Spread the finishes into the gaps between branches, so the branches fan out all the
  // way around instead of bunching on one side.
  const order: [string, { to: Position | null; side: Side | null; moves: FlowMove[] }][] = [];
  const chunks = Math.max(dests.length, 1);
  const fm = finish?.moves ?? [];
  dests.forEach((d, i) => {
    order.push(d);
    const part = fm.slice(Math.round((i * fm.length) / chunks), Math.round(((i + 1) * fm.length) / chunks));
    if (part.length) order.push([`finish${i}`, { to: null, side: null, moves: part }]);
  });
  if (!dests.length && fm.length) order.push(['finish0', { to: null, side: null, moves: fm }]);
  const total = order.reduce((n, [, b]) => n + (b.to ? Math.max(MIN_BLOCK, b.moves.length) : b.moves.length), 0);

  const root: MapNode = { key: 'root', kind: 'root', x: 0, y: 0, angle: 0, pos: undefined, side };
  const nodes: MapNode[] = [root];
  const edges: MapEdge[] = [];
  const r1 = Math.max(120, (total * SLOT) / (2 * Math.PI));
  const r2 = r1 + GAP;
  const slotAngle = (i: number) => -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / Math.max(total, 1);
  let slot = 0;
  let radius = r1;

  for (const [k, b] of order) {
    const width = b.to ? Math.max(MIN_BLOCK, b.moves.length) : b.moves.length;
    const offset = Math.floor((width - b.moves.length) / 2);
    const ring1 = b.moves.map((m, i) => {
      const a = slotAngle(slot + offset + i);
      const n: MapNode = { key: `m:${m.t.id}`, kind: 'move', angle: a, x: Math.cos(a) * r1, y: Math.sin(a) * r1, t: m.t, at: posId, finishes: !m.to };
      nodes.push(n);
      edges.push({ key: `s:${m.t.id}`, from: root, to: n, kind: 'spoke' });
      return n;
    });
    if (b.to) {
      const a = slotAngle(slot + (width - 1) / 2);
      const dest: MapNode = { key: `d:${k}`, kind: 'dest', angle: a, x: Math.cos(a) * r2, y: Math.sin(a) * r2, pos: b.to, side: b.side };
      nodes.push(dest);
      ring1.forEach(n => edges.push({ key: `l:${n.key}`, from: n, to: dest, kind: 'lead' }));
      // Step 3: that position's moves, fanned outward around it.
      const next = flowFrom(b.to.id, b.side).flatMap(g => g.moves).filter(m => keep(m.t, b.to!.id));
      const spread = Math.min(Math.PI * 1.15, Math.max(0.6, next.length * 0.28));
      const rr = Math.max(78, (next.length * 30) / spread);
      next.forEach((m, i) => {
        const na = a - spread / 2 + (next.length === 1 ? spread / 2 : (i * spread) / (next.length - 1));
        const n: MapNode = { key: `n:${k}:${m.t.id}`, kind: 'next', angle: na, x: dest.x + Math.cos(na) * rr, y: dest.y + Math.sin(na) * rr, t: m.t, at: b.to!.id, parent: dest.key, finishes: !m.to };
        nodes.push(n);
        edges.push({ key: `b:${n.key}`, from: dest, to: n, kind: 'branch' });
      });
      radius = Math.max(radius, r2 + rr + 40);
    }
    slot += width;
  }
  return { nodes, edges, r1, r2, radius };
}
