// Progress rules for the Grappling Dex. Pure functions with no React Native
// imports, so they run under `node --test` and match the web version exactly.

/** What a day's entry counts as for stages. `null` = only defense was logged. */
export type Kind = 'seen' | 'drilled' | 'hit';
/** What you tap when logging. Landed = attacked and hit it (the old "Hit live"). */
export type LogKind = 'seen' | 'drilled' | 'landed' | 'missed' | 'stopped' | 'caught';
export type LiveKind = 'landed' | 'missed' | 'stopped' | 'caught';
export type Stage = 0 | 1 | 2 | 3 | 4;

/**
 * One move from one position on one day. `kind` drives stages; the counts are
 * the live record. `hits` = times landed (older saves have at most 1).
 */
export interface SessionItem { kind: Kind | null; hits: number; missed?: number; stopped?: number; caught?: number }

/** A live record: attacks landed or missed, and defenses that stopped it or got caught. */
export interface Live { landed: number; missed: number; stopped: number; caught: number }
export const emptyLive = (): Live => ({ landed: 0, missed: 0, stopped: 0, caught: 0 });
export const liveOf = (it: SessionItem): Live => ({ landed: it.hits ?? 0, missed: it.missed ?? 0, stopped: it.stopped ?? 0, caught: it.caught ?? 0 });
/**
 * `items` is keyed by `moveId@positionId` (where the move started from).
 * Keys with no `@` come from before positions were logged: they credit every
 * position the move can start from.
 */
export interface Session { id: string; date: string; items: Record<string, SessionItem> }

// ---- Entry keys -------------------------------------------------------------

/**
 * `moveId@positionId`, plus `:top` or `:bottom` for the few moves that can be
 * attacked from either side of the same position (e.g. a kimura from half guard).
 */
export const itemKey = (moveId: string, pos?: string | null, side?: string | null): string =>
  pos ? `${moveId}@${pos}${side ? `:${side}` : ''}` : moveId;

export function splitKey(key: string): { moveId: string; pos: string | null; side: string | null } {
  const i = key.indexOf('@');
  if (i < 0) return { moveId: key, pos: null, side: null };
  const [pos, side] = key.slice(i + 1).split(':');
  return { moveId: key.slice(0, i), pos, side: side ?? null };
}

/**
 * Filters entries to one side of a position. `dflt` is the side entries with no
 * `:side` in their key belong to (the move's usual attacking side there).
 */
export interface SideFilter { side: string; dflt: string }
const onSide = (k: { side: string | null }, f?: SideFilter) => !f || (k.side ?? f.dflt) === f.side;

/** Distinct move ids in a session, in the order they were logged. */
export const movesIn = (s: Session): string[] => [...new Set(Object.keys(s.items).map(k => splitKey(k).moveId))];
export interface Progress { sessions: Session[]; base: Record<string, Stage> }

export const STAGES = ['Unseen', 'Seen', 'Drilled', 'Hit', 'Mastered'] as const;
export const KIND_LABEL: Record<LogKind, string> = { seen: 'Seen', drilled: 'Drilled', landed: 'Landed', missed: 'Missed', stopped: 'Stopped', caught: 'Caught' };
/** Longer labels for screen readers and confirmations. */
export const KIND_LONG: Record<LogKind, string> = {
  seen: 'Seen', drilled: 'Drilled', landed: 'Attacked and landed', missed: 'Attacked and missed', stopped: 'Defended and stopped', caught: 'Defended and got caught',
};
export const LIVE_KINDS: LiveKind[] = ['landed', 'missed', 'stopped', 'caught'];
/** Mastered = hit live on this many different days (sessions). */
export const RULES = { masterDays: 5 } as const;
const KIND_RANK: Record<Kind, number> = { seen: 1, drilled: 2, hit: 3 };

/** How many sessions (training days) a move was logged in, by its best kind that day. */
export interface MoveStats { sessions: number; drillDays: number; hitDays: number; last: string | null; lastHit: string | null }

/** Best kind logged in one session for `moveId`, from `pos` only (plus old entries with no position), or from anywhere. */
function bestKind(session: Session, moveId: string, pos?: string, sf?: SideFilter): Kind | null {
  let best: Kind | null = null;
  for (const [key, it] of Object.entries(session.items)) {
    const k = splitKey(key);
    if (k.moveId !== moveId) continue;
    if (pos !== undefined && k.pos !== null && k.pos !== pos) continue;
    if (!it.kind || !onSide(k, sf)) continue;
    if (!best || KIND_RANK[it.kind] > KIND_RANK[best]) best = it.kind;
  }
  return best;
}

function tally(p: Progress, moveId: string, pos?: string, sf?: SideFilter): MoveStats {
  const s: MoveStats = { sessions: 0, drillDays: 0, hitDays: 0, last: null, lastHit: null };
  for (const session of p.sessions) {
    const kind = bestKind(session, moveId, pos, sf);
    if (!kind) continue;
    s.sessions++;
    if (kind !== 'seen') s.drillDays++;
    if (kind === 'hit') { s.hitDays++; if (!s.lastHit || session.date > s.lastHit) s.lastHit = session.date; }
    if (!s.last || session.date > s.last) s.last = session.date;
  }
  return s;
}

/** A move's totals from every position. A training day counts once, by its best kind. */
export const stats = (p: Progress, moveId: string): MoveStats => tally(p, moveId);

/** A move's totals from one position. Old entries with no position count for every position. */
export const posStats = (p: Progress, moveId: string, pos: string, sf?: SideFilter): MoveStats => tally(p, moveId, pos, sf);

/**
 * Each stage asks for one thing: Seen = logged once, Drilled = drilled once,
 * Hit = hit live once, Mastered = hit live on 5 different days.
 * A live hit also counts as drilling, so a move can jump straight to Hit.
 */
export function derivedStage(s: MoveStats): Stage {
  if (s.hitDays >= RULES.masterDays) return 4;
  if (s.hitDays >= 1) return 3;
  if (s.drillDays >= 1) return 2;
  if (s.sessions >= 1) return 1;
  return 0;
}

/** A move's stage: the higher of its logged progress and any starting stage the user set. */
export function stageOf(p: Progress, moveId: string): Stage {
  return Math.max(p.base[moveId] ?? 0, derivedStage(stats(p, moveId))) as Stage;
}

/**
 * A move's stage from one position, for that position's scorecard and gaps.
 * Starting stages say nothing about where, so they count for every position.
 */
export function posStage(p: Progress, moveId: string, pos: string, sf?: SideFilter): Stage {
  return Math.max(p.base[moveId] ?? 0, derivedStage(posStats(p, moveId, pos, sf))) as Stage;
}

/** The position this move was most recently logged from, if any. */
export function lastPosition(p: Progress, moveId: string): string | null {
  for (let i = p.sessions.length - 1; i >= 0; i--) {
    const keys = Object.keys(p.sessions[i].items).map(splitKey).filter(k => k.moveId === moveId && k.pos);
    if (keys.length) return keys[keys.length - 1].pos;
  }
  return null;
}

export function nextStep(p: Progress, moveId: string): string {
  const stage = stageOf(p, moveId);
  if (stage === 0) return 'Log it once to mark it Seen.';
  if (stage === 1) return 'Drill it once to reach Drilled.';
  if (stage === 2) return 'Land it once in live rolling to reach Hit.';
  if (stage === 3) {
    const left = Math.max(1, RULES.masterDays - stats(p, moveId).hitDays);
    return `Hit it live on ${left} more day${left > 1 ? 's' : ''} to reach Mastered.`;
  }
  return 'Mastered. It works on resisting partners.';
}

const STAGE_KIND: Partial<Record<LogKind, Kind>> = { seen: 'seen', drilled: 'drilled', landed: 'hit' };

/**
 * Merge one logged move into a session (one session per training day), under
 * the position it started from. Practice never downgrades within a day
 * (Seen < Drilled < Landed); every live tap adds one to the record.
 * Only Landed moves the stage: missing, stopping or getting caught never does.
 */
export function addItem(session: Session, moveId: string, kind: LogKind, pos?: string | null, side?: string | null): Session {
  const key = itemKey(moveId, pos, side);
  const cur = session.items[key];
  const stageKind = STAGE_KIND[kind] ?? null;
  const live = cur ? liveOf(cur) : emptyLive();
  let k = cur?.kind ?? null;
  if (stageKind && (!k || KIND_RANK[stageKind] > KIND_RANK[k])) k = stageKind;
  else if (kind === 'seen' || kind === 'drilled') return session; // already logged at that level or higher today
  if (kind in live) live[kind as LiveKind]++;
  return { ...session, items: { ...session.items, [key]: makeItem(k, live) } };
}

function makeItem(kind: Kind | null, l: Live): SessionItem {
  const it: SessionItem = { kind, hits: l.landed };
  if (l.missed) it.missed = l.missed;
  if (l.stopped) it.stopped = l.stopped;
  if (l.caught) it.caught = l.caught;
  return it;
}

/** Adds up live records for a move (or every move), optionally from one position. Old entries with no position count everywhere. */
export function liveRecord(p: Progress, moveId?: string, pos?: string, sf?: SideFilter): Live {
  const out = emptyLive();
  for (const s of p.sessions) {
    for (const [key, it] of Object.entries(s.items)) {
      const k = splitKey(key);
      if (moveId !== undefined && k.moveId !== moveId) continue;
      if (pos !== undefined && k.pos !== null && k.pos !== pos) continue;
      if (!onSide(k, sf)) continue;
      const l = liveOf(it);
      out.landed += l.landed; out.missed += l.missed; out.stopped += l.stopped; out.caught += l.caught;
    }
  }
  return out;
}

/** Two entries for the same move, position and day combined: best practice, counts added. */
function mergeItems(a: SessionItem, b: SessionItem): SessionItem {
  const kind = !a.kind ? b.kind : !b.kind ? a.kind : KIND_RANK[a.kind] >= KIND_RANK[b.kind] ? a.kind : b.kind;
  const x = liveOf(a), y = liveOf(b);
  return makeItem(kind, { landed: x.landed + y.landed, missed: x.missed + y.missed, stopped: x.stopped + y.stopped, caught: x.caught + y.caught });
}

/**
 * Rewrites entry keys, e.g. when a position is merged into another. `rename`
 * returns the new key, or null to keep it. Entries that land on the same key are
 * combined. Returns `p` itself when nothing changed.
 */
export function renameKeys(p: Progress, rename: (k: ReturnType<typeof splitKey>) => string | null): Progress {
  let changed = false;
  const sessions = p.sessions.map(s => {
    const items: Record<string, SessionItem> = {};
    for (const [key, it] of Object.entries(s.items)) {
      const next = rename(splitKey(key)) ?? key;
      if (next !== key) changed = true;
      items[next] = items[next] ? mergeItems(items[next], it) : it;
    }
    return { ...s, items };
  });
  return changed ? { ...p, sessions } : p;
}

/** What one day's entry says, e.g. "Drilled · Landed ×2 · Caught". */
export function describeItem(it: SessionItem): string {
  const parts: string[] = [];
  if (it.kind === 'seen' || it.kind === 'drilled') parts.push(KIND_LABEL[it.kind]);
  const l = liveOf(it);
  for (const k of LIVE_KINDS) if (l[k]) parts.push(l[k] > 1 ? `${KIND_LABEL[k]} ×${l[k]}` : KIND_LABEL[k]);
  return parts.join(' · ');
}

/** Removes every entry for `moveId` from a session. */
export function removeMove(session: Session, moveId: string): Session {
  const items = Object.fromEntries(Object.entries(session.items).filter(([k]) => splitKey(k).moveId !== moveId));
  return { ...session, items };
}

/** A move you can hit but haven't hit live in this many days is getting rusty. */
export const RUSTY_DAYS = 90;

/** Whole days from `date` (YYYY-MM-DD) to `today`. */
export function daysSince(date: string, today = localDate()): number {
  const t = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(today) - t(date)) / 86400000);
}

/** "today", "3 days ago", "2 weeks ago", "4 months ago". */
export function ago(date: string, today = localDate()): string {
  const d = daysSince(date, today);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 730) return `${Math.round(d / 30.4)} months ago`;
  return `${Math.round(d / 365)} years ago`;
}

/** Hit live before, but not in the last RUSTY_DAYS days. */
export const isRusty = (s: MoveStats, today = localDate()) => !!s.lastHit && daysSince(s.lastHit, today) >= RUSTY_DAYS;

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Backup files -----------------------------------------------------------

export const BACKUP_FORMAT = 'grappling-dex-backup';

/** The JSON written to a backup file. */
export function toBackup(p: Progress, exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 2, exportedAt, sessions: p.sessions, base: p.base }, null, 1);
}

const KINDS: readonly string[] = ['seen', 'drilled', 'hit'];
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/**
 * Reads a backup file and returns its progress, or throws an Error with a
 * message fit to show the user. Bad entries are dropped rather than trusted.
 */
export function parseBackup(text: string): Progress {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("That file isn't a Grappling Dex backup."); }
  const o = raw as { format?: unknown; version?: unknown; sessions?: unknown; base?: unknown };
  if (!o || typeof o !== 'object' || o.format !== BACKUP_FORMAT || !Array.isArray(o.sessions)) throw new Error("That file isn't a Grappling Dex backup.");
  if (typeof o.version !== 'number' || o.version > 2) throw new Error('This backup is from a newer version of the app. Update the app, then try again.');

  const sessions: Session[] = [];
  const ids = new Set<string>();
  for (const s of o.sessions as unknown[]) {
    const x = s as Partial<Session>;
    if (!x || typeof x.id !== 'string' || !x.id || ids.has(x.id) || !isDate(x.date) || !x.items || typeof x.items !== 'object') continue;
    const items: Record<string, SessionItem> = {};
    for (const [moveId, it] of Object.entries(x.items as Record<string, Partial<SessionItem>>)) {
      if (!it || typeof it !== 'object') continue;
      const kind = typeof it.kind === 'string' && KINDS.includes(it.kind) ? (it.kind as Kind) : null;
      const n = (v: unknown) => (Number.isFinite(v) ? Math.max(0, Math.floor(v as number)) : 0);
      const live = { landed: n(it.hits), missed: n(it.missed), stopped: n(it.stopped), caught: n(it.caught) };
      if (kind === 'hit') live.landed = Math.max(1, live.landed);
      if (!kind && !live.landed && !live.missed && !live.stopped && !live.caught) continue;
      items[moveId] = makeItem(kind, live);
    }
    if (!Object.keys(items).length) continue;
    ids.add(x.id);
    sessions.push({ id: x.id, date: x.date, items });
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const base: Record<string, Stage> = {};
  if (o.base && typeof o.base === 'object') {
    for (const [moveId, st] of Object.entries(o.base as Record<string, unknown>)) {
      if (st === 1 || st === 2 || st === 3 || st === 4) base[moveId] = st;
    }
  }
  return { sessions, base };
}
