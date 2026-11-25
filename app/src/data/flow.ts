// "Map from here": what you can do from one position, and where it leads.
// Step 1 = moves from the position, step 2 = positions those moves leave you in,
// step 3 = moves from those positions (shown on demand).
import { attackSides, hasSides, positionById, sideLabel, techniques, TYPES, type MoveType, type Position, type Side, type Technique } from './catalog';

export interface FlowMove { t: Technique; side: Side | null; to: Position | null }
export interface FlowGroup { type: MoveType; label: string; moves: FlowMove[] }
export interface Destination { pos: Position; via: Technique[]; moves: number }

// Moves that take you somewhere come first; submissions (which finish there) last.
const ORDER: MoveType[] = ['sweep', 'pass', 'move', 'escape', 'sub'];

/** Moves from a position, grouped by type, each with where it leaves you (null = it finishes there). */
export function flowFrom(posId: string): FlowGroup[] {
  return ORDER.map(type => {
    const moves = techniques.filter(t => t.type === type && t.from.includes(posId)).map(t => ({
      t, side: attackSides(t, posId)[0] ?? null, to: t.to ? positionById.get(t.to) ?? null : null,
    }));
    // A group that's all one side says so, e.g. "Guard passes · Top".
    const sides = new Set(moves.map(m => m.side));
    const one = sides.size === 1 ? [...sides][0] : null;
    const label = TYPES[type].plural + (one && hasSides(posId) ? ` · ${sideLabel(posId, one)}` : '');
    return { type, label, moves };
  }).filter(g => g.moves.length);
}

/** The positions the given moves leave you in, with which moves get you there and how many moves each has. */
export function destinationsOf(moves: FlowMove[]): Destination[] {
  const byPos = new Map<string, Destination>();
  for (const m of moves) {
    if (!m.to) continue;
    const d = byPos.get(m.to.id) ?? { pos: m.to, via: [], moves: techniques.filter(t => t.from.includes(m.to!.id)).length };
    d.via.push(m.t);
    byPos.set(m.to.id, d);
  }
  return [...byPos.values()];
}

/** For a move as the starting point: the positions it works from. */
export const startsFrom = (t: Technique): Position[] => t.from.map(id => positionById.get(id)!).filter(Boolean);
