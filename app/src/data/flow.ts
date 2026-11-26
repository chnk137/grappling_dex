// "Map from here": what you can do from one side of a position, and where it leads.
// Step 1 = moves from that side, step 2 = positions (and sides) those moves leave you in,
// step 3 = moves from there (shown on demand).
import { attackSides, hasSides, mainSide, positionById, techniques, TYPES, type MoveType, type Position, type Side, type Technique } from './catalog';

export interface FlowMove { t: Technique; to: Position | null; toSide: Side | null }
export interface FlowGroup { type: MoveType; label: string; moves: FlowMove[] }
export interface Destination { pos: Position; side: Side | null; via: Technique[] }

// Moves that take you somewhere come first; submissions (which finish there) last.
const ORDER: MoveType[] = ['sweep', 'pass', 'move', 'escape', 'sub'];

/** The side a position opens on in the flow (bottom for guards). Null when it has no sides. */
export const startSide = (posId: string): Side | null => (hasSides(posId) ? mainSide(posId) : null);

/**
 * Which side you're on after a move: escapes and moves into guards or leg
 * entanglements leave you underneath; sweeps, passes and takedowns leave you on top.
 */
export function landingSide(t: Technique): Side | null {
  if (!t.to || !hasSides(t.to)) return null;
  if (t.lands) return t.lands;
  const tier = positionById.get(t.to)?.tier;
  if (t.type === 'escape' || tier === 'guard' || tier === 'leg') return 'bottom';
  return 'top';
}

/** Moves you can attack with from one side of a position (all of them when `side` is null), grouped by type. */
export function flowFrom(posId: string, side: Side | null): FlowGroup[] {
  return ORDER.map(type => ({
    type,
    label: TYPES[type].plural,
    moves: techniques
      .filter(t => t.type === type && t.from.includes(posId) && (!side || attackSides(t, posId).includes(side)))
      .map(t => ({ t, to: t.to ? positionById.get(t.to) ?? null : null, toSide: landingSide(t) })),
  })).filter(g => g.moves.length);
}

/** Where the given moves leave you, with which moves get you there. */
export function destinationsOf(moves: FlowMove[]): Destination[] {
  const byKey = new Map<string, Destination>();
  for (const m of moves) {
    if (!m.to) continue;
    const key = `${m.to.id}:${m.toSide ?? ''}`;
    const d = byKey.get(key) ?? { pos: m.to, side: m.toSide, via: [] };
    d.via.push(m.t);
    byKey.set(key, d);
  }
  return [...byKey.values()];
}

/** For a move as the starting point: each position (and side) it's attacked from. */
export interface StartPoint { pos: Position; side: Side | null }
export const startsFrom = (t: Technique): StartPoint[] =>
  t.from.flatMap<StartPoint>(id => {
    const pos = positionById.get(id);
    if (!pos) return [];
    const sides = attackSides(t, id);
    return sides.length ? sides.map(side => ({ pos, side })) : [{ pos, side: null }];
  });
