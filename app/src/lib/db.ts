// On-device storage. Every log is written here first, so the app works with no
// signal at the gym. Account sync (Supabase) will read from these tables later.
import * as SQLite from 'expo-sqlite';
import type { Kind, Progress, Session, SessionItem, Stage } from './progress';

let db: SQLite.SQLiteDatabase;

/**
 * Opens the database once at startup. On web, SQLite runs in a worker that loads
 * asynchronously; after this resolves, the sync calls below work on every platform.
 */
export async function openDb(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync('grappling-dex.db');
  await db.execAsync(SCHEMA);
  // Live record columns (added with Attacked/Defended logging).
  const cols = new Set((await db.getAllAsync<{ name: string }>('PRAGMA table_info(session_items)')).map(c => c.name));
  for (const c of ['missed', 'stopped', 'caught']) {
    if (!cols.has(c)) await db.execAsync(`ALTER TABLE session_items ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`);
  }
}

type ItemRow = { session_id: string; move_id: string; kind: string; hits: number; missed: number; stopped: number; caught: number };
// kind is NOT NULL in the table, so a defense-only entry is stored as ''.
const fromRow = (r: ItemRow): SessionItem => {
  const it: SessionItem = { kind: (r.kind || null) as Kind | null, hits: r.hits };
  if (r.missed) it.missed = r.missed;
  if (r.stopped) it.stopped = r.stopped;
  if (r.caught) it.caught = r.caught;
  return it;
};
const ITEM_SQL = 'INSERT INTO session_items (session_id, move_id, kind, hits, missed, stopped, caught) VALUES (?, ?, ?, ?, ?, ?, ?)';
const insertItem = (sessionId: string, moveId: string, it: SessionItem) =>
  db.runSync(ITEM_SQL, sessionId, moveId, it.kind ?? '', it.hits, it.missed ?? 0, it.stopped ?? 0, it.caught ?? 0);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session_items (
    session_id TEXT NOT NULL,
    move_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    hits INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, move_id)
  );
  CREATE TABLE IF NOT EXISTS base_stages (
    move_id TEXT PRIMARY KEY NOT NULL,
    stage INTEGER NOT NULL
  );
`;

export function loadProgress(): Progress {
  const sessions = db.getAllSync<{ id: string; date: string }>('SELECT id, date FROM sessions ORDER BY date, created_at');
  const items = db.getAllSync<ItemRow>('SELECT * FROM session_items');
  const byId = new Map<string, Session>(sessions.map(s => [s.id, { id: s.id, date: s.date, items: {} }]));
  for (const it of items) {
    const s = byId.get(it.session_id);
    if (s) s.items[it.move_id] = fromRow(it);
  }
  const base: Progress['base'] = {};
  for (const b of db.getAllSync<{ move_id: string; stage: number }>('SELECT * FROM base_stages')) base[b.move_id] = b.stage as Stage;
  return { sessions: [...byId.values()], base };
}

/** Writes a whole session, replacing what was stored for it. */
export function saveSession(s: Session): void {
  db.runSync('INSERT OR IGNORE INTO sessions (id, date, created_at) VALUES (?, ?, ?)', s.id, s.date, Date.now());
  db.runSync('DELETE FROM session_items WHERE session_id = ?', s.id);
  for (const [moveId, it] of Object.entries(s.items)) insertItem(s.id, moveId, it);
  if (!Object.keys(s.items).length) deleteSession(s.id);
}

export function deleteSession(id: string): void {
  db.runSync('DELETE FROM session_items WHERE session_id = ?', id);
  db.runSync('DELETE FROM sessions WHERE id = ?', id);
}

export function setBaseStage(moveId: string, stage: Stage): void {
  if (stage > 0) db.runSync('INSERT OR REPLACE INTO base_stages (move_id, stage) VALUES (?, ?)', moveId, stage);
  else db.runSync('DELETE FROM base_stages WHERE move_id = ?', moveId);
}

/** Replaces everything stored with `p` (used when restoring a backup). All or nothing. */
export function replaceAll(p: Progress): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM session_items');
    db.runSync('DELETE FROM sessions');
    db.runSync('DELETE FROM base_stages');
    p.sessions.forEach((s, i) => {
      db.runSync('INSERT INTO sessions (id, date, created_at) VALUES (?, ?, ?)', s.id, s.date, i);
      for (const [moveId, it] of Object.entries(s.items)) insertItem(s.id, moveId, it);
    });
    for (const [moveId, st] of Object.entries(p.base)) db.runSync('INSERT INTO base_stages (move_id, stage) VALUES (?, ?)', moveId, st);
  });
}
