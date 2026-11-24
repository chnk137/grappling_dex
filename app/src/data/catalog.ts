import raw from './catalog.json';
import { emptyLive, liveRecord, posStage, stageOf, type Live, type Progress } from '../lib/progress';

export type MoveType = 'sub' | 'sweep' | 'pass' | 'move' | 'escape';
export type Tier = 'stand' | 'guard' | 'leg' | 'pass' | 'pin' | 'dom';

export interface Position { id: string; name: string; tier: Tier; x: number; y: number }
export interface Technique { id: string; name: string; type: MoveType; from: string[]; to: string | null; note: string; gi: boolean }

export const TYPES: Record<MoveType, { label: string; plural: string }> = {
  sub: { label: 'Submission', plural: 'Submissions' },
  sweep: { label: 'Sweep', plural: 'Sweeps' },
  pass: { label: 'Guard pass', plural: 'Guard passes' },
  move: { label: 'Transition', plural: 'Transitions' },
  escape: { label: 'Escape', plural: 'Escapes' },
};
export const TIERS: Record<Tier, string> = {
  stand: 'Standing', guard: 'Guard · bottom', leg: 'Leg entanglement', pass: 'Passing · top', pin: 'Pin · top', dom: 'Dominant · top',
};

export const positions = raw.positions as Position[];
export const techniques = raw.techniques as Technique[];
export const positionLinks = raw.positionLinks as [string, string][];
export const chains = raw.chains as string[][];

export const positionById = new Map(positions.map(p => [p.id, p]));
export const techniqueById = new Map(techniques.map(t => [t.id, t]));
export const isPosition = (id: string) => positionById.has(id);
export const nameOf = (id: string) => positionById.get(id)?.name ?? techniqueById.get(id)?.name ?? id;

export const entryNo = new Map<string, string>([
  ...techniques.map((t, i) => [t.id, '#' + String(i + 1).padStart(3, '0')] as [string, string]),
  ...positions.map((p, i) => [p.id, 'P' + String(i + 1).padStart(2, '0')] as [string, string]),
]);

/** Moves chained with this one in a classic combination. */
export function combos(t: Technique): string[] {
  const out = new Set<string>();
  for (const c of chains) if (c.includes(t.id)) for (const id of c) if (id !== t.id) out.add(id);
  return [...out];
}

/** Moves that work from the same positions, most overlap first. */
export function relatedMoves(t: Technique): string[] {
  return techniques.filter(o => o !== t)
    .map(o => ({ id: o.id, s: o.from.filter(h => t.from.includes(h)).length + (o.type === t.type ? 0.5 : 0) }))
    .filter(x => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, 8).map(x => x.id);
}

// ---- Top and bottom -----------------------------------------------------------

export type Side = 'bottom' | 'top';
/** Moves whose attacker isn't on the side the rule below gives. Keyed `moveId@positionId`. */
const SIDE_OVERRIDES: Record<string, Side> = { 'buggy@side': 'bottom' };

/** Positions with no top or bottom (both players standing). */
export const hasSides = (posId: string) => positionById.get(posId)?.tier !== 'stand';

/**
 * Which side the attacker is on when this move starts from this position.
 * Passes come from top; sweeps and escapes from bottom; submissions and
 * transitions from the bottom of guards and leg entanglements, and from the top
 * of pins. Defending credits the other side. `null` when the position has no sides.
 */
export function attackSide(t: Technique, posId: string): Side | null {
  if (!hasSides(posId)) return null;
  const o = SIDE_OVERRIDES[`${t.id}@${posId}`];
  if (o) return o;
  if (t.type === 'pass') return 'top';
  if (t.type === 'sweep' || t.type === 'escape') return 'bottom';
  const tier = positionById.get(posId)?.tier;
  return tier === 'guard' || tier === 'leg' ? 'bottom' : 'top';
}

/** Leg entanglements have no real top: the sides are who attacks the legs. */
export function sideLabel(posId: string, side: Side): string {
  if (positionById.get(posId)?.tier === 'leg') return side === 'bottom' ? 'Attacking' : 'Defending';
  return side === 'bottom' ? 'Bottom' : 'Top';
}

/** The side a position's page opens on: where most of its moves are attacked from. */
export function mainSide(posId: string): Side {
  const from = techniques.filter(t => t.from.includes(posId));
  const top = from.filter(t => attackSide(t, posId) === 'top').length;
  return top > from.length - top ? 'top' : 'bottom';
}

/**
 * The live record on one side of a position: attacks you made from that side,
 * and attacks from the other side that you defended. `side` null = the whole position.
 */
export function positionRecord(p: Progress, posId: string, side: Side | null): Live {
  const out = emptyLive();
  for (const t of techniques) {
    if (!t.from.includes(posId)) continue;
    const r = liveRecord(p, t.id, posId);
    const a = attackSide(t, posId);
    if (side === null || a === side) { out.landed += r.landed; out.missed += r.missed; }
    if (side === null || a !== side) { out.stopped += r.stopped; out.caught += r.caught; }
  }
  return out;
}

export interface ScoreRow { label: 'Attacks' | 'Passes' | 'Escapes' | 'Ways in'; have: number; total: number }

/**
 * How much of your game exists at a position, counted at Hit or better.
 * Moves from here only count when logged from here; ways in count from anywhere.
 * With `side`, only moves attacked from that side (and no ways in).
 */
export function scorecard(p: Progress, posId: string, side?: Side): ScoreRow[] {
  const at = (list: Technique[]) => ({ have: list.filter(t => posStage(p, t.id, posId) >= 3).length, total: list.length });
  const into = (list: Technique[]) => ({ have: list.filter(t => stageOf(p, t.id) >= 3).length, total: list.length });
  const rows: ScoreRow[] = [];
  const from = techniques.filter(t => t.from.includes(posId) && (!side || attackSide(t, posId) === side));
  const attacks = from.filter(t => t.type === 'sub' || t.type === 'sweep' || t.type === 'move');
  const passes = from.filter(t => t.type === 'pass');
  const escapes = from.filter(t => t.type === 'escape');
  const waysIn = techniques.filter(t => t.to === posId);
  if (attacks.length) rows.push({ label: 'Attacks', ...at(attacks) });
  if (passes.length) rows.push({ label: 'Passes', ...at(passes) });
  if (escapes.length) rows.push({ label: 'Escapes', ...at(escapes) });
  if (waysIn.length && !side) rows.push({ label: 'Ways in', ...into(waysIn) });
  return rows;
}

/** A position counts as part of your game once a move is logged from it, or a move into it is logged. */
export const positionActive = (p: Progress, posId: string) =>
  techniques.some(t => (t.from.includes(posId) && posStage(p, t.id, posId) >= 1) || (t.to === posId && stageOf(p, t.id) >= 1));

/** Whether an unlogged entry sits next to something you already train. */
export function nearby(p: Progress, id: string): boolean {
  const pos = positionById.get(id);
  if (pos) {
    if (id === 'standing') return true;
    if (positionLinks.some(([a, b]) => (a === id && positionActive(p, b)) || (b === id && positionActive(p, a)))) return true;
    return techniques.some(t => t.to === id && stageOf(p, t.id) >= 2);
  }
  const t = techniqueById.get(id);
  return !!t && t.from.some(h => h === 'standing' || positionActive(p, h));
}

export interface Gap { positionId: string; text: string; weight: number }

export function gaps(p: Progress, limit = 4): Gap[] {
  const out: Gap[] = [];
  for (const pos of positions) {
    if (!positionActive(p, pos.id)) continue;
    for (const r of scorecard(p, pos.id)) {
      if (r.have) continue;
      if (r.label === 'Escapes') out.push({ positionId: pos.id, weight: 3, text: `No escape from bottom of ${pos.name} at Hit yet` });
      else if (r.label === 'Attacks') out.push({ positionId: pos.id, weight: 2, text: `No attack from ${pos.name} at Hit yet` });
      else if (r.label === 'Passes') out.push({ positionId: pos.id, weight: 1, text: `No pass for ${pos.name} at Hit yet` });
    }
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, limit);
}
