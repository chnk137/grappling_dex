// Progress rules for the Grappling Dex. Pure functions with no React Native
// imports, so they run under `node --test` and match the web version exactly.

export type Kind = 'seen' | 'drilled' | 'hit';
export type Stage = 0 | 1 | 2 | 3 | 4;

/** `hits` is kept for older saved data and backups; stages no longer use it. */
export interface SessionItem { kind: Kind; hits: number }
export interface Session { id: string; date: string; items: Record<string, SessionItem> }
export interface Progress { sessions: Session[]; base: Record<string, Stage> }

export const STAGES = ['Unseen', 'Seen', 'Drilled', 'Hit', 'Mastered'] as const;
export const KIND_LABEL: Record<Kind, string> = { seen: 'Seen', drilled: 'Drilled', hit: 'Hit live' };
/** Mastered = hit live on this many different days (sessions). */
export const RULES = { masterDays: 5 } as const;
const KIND_RANK: Record<Kind, number> = { seen: 1, drilled: 2, hit: 3 };

/** How many sessions (training days) a move was logged in, by its best kind that day. */
export interface MoveStats { sessions: number; drillDays: number; hitDays: number; last: string | null }

export function stats(p: Progress, moveId: string): MoveStats {
  const s: MoveStats = { sessions: 0, drillDays: 0, hitDays: 0, last: null };
  for (const session of p.sessions) {
    const it = session.items[moveId];
    if (!it) continue;
    s.sessions++;
    if (it.kind !== 'seen') s.drillDays++;
    if (it.kind === 'hit') s.hitDays++;
    if (!s.last || session.date > s.last) s.last = session.date;
  }
  return s;
}

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

/**
 * Merge one logged move into a session (one session per training day).
 * Logging never downgrades a move within the same session: Seen < Drilled < Hit live.
 */
export function addItem(session: Session, moveId: string, kind: Kind): Session {
  const cur = session.items[moveId];
  if (cur && KIND_RANK[cur.kind] >= KIND_RANK[kind]) return session;
  return { ...session, items: { ...session.items, [moveId]: { kind, hits: kind === 'hit' ? 1 : 0 } } };
}

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Backup files -----------------------------------------------------------

export const BACKUP_FORMAT = 'grappling-dex-backup';

/** The JSON written to a backup file. */
export function toBackup(p: Progress, exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt, sessions: p.sessions, base: p.base }, null, 1);
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
  if (typeof o.version !== 'number' || o.version > 1) throw new Error('This backup is from a newer version of the app. Update the app, then try again.');

  const sessions: Session[] = [];
  const ids = new Set<string>();
  for (const s of o.sessions as unknown[]) {
    const x = s as Partial<Session>;
    if (!x || typeof x.id !== 'string' || !x.id || ids.has(x.id) || !isDate(x.date) || !x.items || typeof x.items !== 'object') continue;
    const items: Record<string, SessionItem> = {};
    for (const [moveId, it] of Object.entries(x.items as Record<string, Partial<SessionItem>>)) {
      if (!it || typeof it.kind !== 'string' || !KINDS.includes(it.kind)) continue;
      const hits = Number.isFinite(it.hits) ? Math.max(0, Math.floor(it.hits as number)) : 0;
      items[moveId] = { kind: it.kind as Kind, hits: it.kind === 'hit' ? Math.max(1, hits) : 0 };
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
