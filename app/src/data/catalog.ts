import raw from './catalog.json';
import { emptyLive, isRusty, itemKey, liveRecord, posStage, posStats, renameKeys, stageOf, type Live, type Progress, type SideFilter } from '../lib/progress';

export type MoveType = 'sub' | 'sweep' | 'pass' | 'move' | 'escape';
export type Tier = 'stand' | 'guard' | 'leg' | 'pass' | 'pin' | 'dom';

export interface Position { id: string; name: string; tier: Tier; x: number; y: number }
export type Side = 'bottom' | 'top';
/** `sides` lists the attacker's side at a position where it differs from the rule in attackSides. */
/** `lands`: the side you end up on, where it differs from the rule in flow.ts landingSide. */
export interface Technique { id: string; name: string; type: MoveType; from: string[]; to: string | null; note: string; gi: boolean; sides?: Record<string, Side[]>; lands?: Side }

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

/** Positions with no top or bottom (both players standing). */
export const hasSides = (posId: string) => positionById.get(posId)?.tier !== 'stand';

/**
 * Which side(s) the attacker can be on when this move starts from this position.
 * Passes come from top; sweeps and escapes from bottom (escapes from leg entanglements: the defending side); submissions and
 * transitions from the bottom of guards and leg entanglements, and from the top
 * of pins. A move's `sides` overrides this (a kimura works from both sides of
 * half guard). Defending credits the other side. Empty when the position has no sides.
 */
export function attackSides(t: Technique, posId: string): Side[] {
  if (!hasSides(posId)) return [];
  const o = t.sides?.[posId];
  if (o) return o;
  if (t.type === 'pass') return ['top'];
  const tier = positionById.get(posId)?.tier;
  if (t.type === 'escape') return [tier === 'leg' ? 'top' : 'bottom']; // in leg entanglements, the defender escapes
  if (t.type === 'sweep') return ['bottom'];
  return [tier === 'guard' || tier === 'leg' ? 'bottom' : 'top'];
}
export const flipSide = (s: Side): Side => (s === 'top' ? 'bottom' : 'top');

/** Entries only carry a side in their key when the move works from both sides of that position. */
export function sideFilter(t: Technique, posId: string, side: Side): SideFilter | undefined {
  const sides = attackSides(t, posId);
  return sides.length > 1 ? { side, dflt: sides[0] } : undefined;
}

/** Everywhere a move can be logged from: one option per position, or per side where it works from both. */
export interface LogOption { pos: string; side: Side | null }
export function logOptions(t: Technique): LogOption[] {
  return t.from.flatMap<LogOption>(pos => {
    const sides = attackSides(t, pos);
    return sides.length > 1 ? sides.map(side => ({ pos, side })) : [{ pos, side: null }];
  });
}

/** Leg entanglements have no real top: the sides are who attacks the legs. */
export function sideLabel(posId: string, side: Side): string {
  if (positionById.get(posId)?.tier === 'leg') return side === 'bottom' ? 'Attacking' : 'Defending';
  return side === 'bottom' ? 'Bottom' : 'Top';
}

/** The side a position's page opens on: bottom for guards, otherwise where most of its moves are attacked from. */
export function mainSide(posId: string): Side {
  const tier = positionById.get(posId)?.tier;
  if (tier === 'guard' || tier === 'leg') return 'bottom'; // a guard opens on the guard player's side
  const sides = techniques.filter(t => t.from.includes(posId)).flatMap(t => attackSides(t, posId));
  const top = sides.filter(x => x === 'top').length;
  return top > sides.length - top ? 'top' : 'bottom';
}

/**
 * The live record on one side of a position: attacks you made from that side,
 * and attacks from the other side that you defended. `side` null = the whole position.
 */
export function positionRecord(p: Progress, posId: string, side: Side | null): Live {
  const out = emptyLive();
  for (const t of techniques) {
    if (!t.from.includes(posId)) continue;
    const sides = attackSides(t, posId);
    for (const a of sides.length ? sides : [null]) {
      const r = liveRecord(p, t.id, posId, a && sides.length > 1 ? { side: a, dflt: sides[0] } : undefined);
      if (side === null || a === side) { out.landed += r.landed; out.missed += r.missed; }
      if (side === null || a !== side) { out.stopped += r.stopped; out.caught += r.caught; }
    }
  }
  return out;
}

/** `rusty`: of the moves you have, how many haven't been hit live in RUSTY_DAYS. */
export interface ScoreRow { label: 'Attacks' | 'Passes' | 'Escapes' | 'Ways in'; have: number; total: number; rusty: number }

/**
 * How much of your game exists at a position, counted at Hit or better.
 * Moves from here only count when logged from here; ways in count from anywhere.
 * With `side`, only moves attacked from that side (and no ways in).
 */
export function scorecard(p: Progress, posId: string, side?: Side): ScoreRow[] {
  const at = (list: Technique[]) => {
    const sf = (t: Technique) => (side ? sideFilter(t, posId, side) : undefined);
    const have = list.filter(t => posStage(p, t.id, posId, sf(t)) >= 3);
    return { have: have.length, total: list.length, rusty: have.filter(t => isRusty(posStats(p, t.id, posId, sf(t)))).length };
  };
  const into = (list: Technique[]) => ({ have: list.filter(t => stageOf(p, t.id) >= 3).length, total: list.length, rusty: 0 });
  const rows: ScoreRow[] = [];
  const from = techniques.filter(t => t.from.includes(posId) && (!side || attackSides(t, posId).includes(side)));
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

/** A position, or one side of it, e.g. "Closed guard (top)". */
export function placeLabel(posId: string, side: Side | null): string {
  const name = positionById.get(posId)?.name ?? posId;
  return side && hasSides(posId) ? `${name} (${sideLabel(posId, side).toLowerCase()})` : name;
}

/**
 * Whether you play this side of a position: you logged a move attacked from
 * that side, or defended there. `side` null = anywhere at the position.
 */
export function sideActive(p: Progress, posId: string, side: Side | null): boolean {
  if (!side) return positionActive(p, posId);
  const attacked = techniques.some(t => t.from.includes(posId) && attackSides(t, posId).includes(side) && posStage(p, t.id, posId, sideFilter(t, posId, side)) >= 1);
  if (attacked) return true;
  const r = positionRecord(p, posId, side);
  return r.landed + r.missed + r.stopped + r.caught > 0;
}

/**
 * Something to work on. `moveId` is set when a move keeps catching you; otherwise
 * it's a missing kind of move at `positionId` (on `side`).
 */
export interface Gap { positionId: string; side: Side | null; moveId?: string; text: string; weight: number }

/** Caught by the same move this many times (more than you stopped it) makes it a gap. */
export const CAUGHT_GAP = 2;

export function gaps(p: Progress, limit = 5): Gap[] {
  const out: Gap[] = [];
  // Moves that keep catching you: the most honest signal, so they rank first.
  for (const t of techniques) {
    for (const pos of t.from) {
      const sides = attackSides(t, pos);
      for (const a of sides.length ? sides : [null]) {
        const r = liveRecord(p, t.id, pos, a && sides.length > 1 ? { side: a, dflt: sides[0] } : undefined);
        if (r.caught < CAUGHT_GAP || r.caught <= r.stopped) continue;
        const mine = a ? flipSide(a) : null;
        out.push({
          positionId: pos, side: mine, moveId: t.id, weight: 10 + r.caught - r.stopped,
          text: `${placeLabel(pos, mine)}: caught in ${t.name} ${r.caught}×${r.stopped ? `, stopped it ${r.stopped}×` : ''}`,
        });
      }
    }
  }
  // Sides you play with nothing you can hit yet. Only sides you've logged count.
  for (const pos of positions) {
    for (const side of hasSides(pos.id) ? (['bottom', 'top'] as Side[]) : [null]) {
      if (!sideActive(p, pos.id, side)) continue;
      for (const r of scorecard(p, pos.id, side ?? undefined)) {
        if (r.have || r.label === 'Ways in') continue;
        const where = placeLabel(pos.id, side);
        if (r.label === 'Escapes') out.push({ positionId: pos.id, side, weight: 3, text: pos.tier === 'guard' ? `${where}: no way to keep your guard you can hit yet` : `${where}: no escape you can hit yet` });
        else if (r.label === 'Attacks') out.push({ positionId: pos.id, side, weight: 2, text: `${where}: no attack you can hit yet` });
        else if (r.label === 'Passes') out.push({ positionId: pos.id, side, weight: 1, text: `${where}: no pass you can hit yet` });
      }
    }
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/** Positions merged into others: older logs from them move over (e.g. Top half guard → half guard, top). */
const merged = (raw as { merged?: Record<string, { into: string; side: Side }> }).merged ?? {};

/** Moves logs from merged positions to where they belong now. Returns `p` itself when nothing changed. */
export function migrateProgress(p: Progress): Progress {
  return renameKeys(p, k => {
    const m = k.pos ? merged[k.pos] : undefined;
    const t = techniqueById.get(k.moveId);
    if (!m || !t) return null;
    return itemKey(k.moveId, m.into, attackSides(t, m.into).length > 1 ? m.side : null);
  });
}
