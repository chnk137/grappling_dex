// Web build of the storage layer, used only for previewing the app in a browser.
// Phones use SQLite (db.ts); Expo picks this file automatically on web. Same API.
import type { Progress, Session, Stage } from './progress';

const KEY = 'grappling-dex-app-v1';
let data: Progress = { sessions: [], base: {} };

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ } };

export async function openDb(): Promise<void> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && Array.isArray(saved.sessions)) data = saved;
  } catch { /* start empty */ }
}

const clone = (): Progress => JSON.parse(JSON.stringify(data));

export function loadProgress(): Progress {
  return { ...clone(), sessions: clone().sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
}

export function saveSession(s: Session): void {
  data.sessions = data.sessions.filter(x => x.id !== s.id);
  if (Object.keys(s.items).length) data.sessions.push(s);
  persist();
}

export function deleteSession(id: string): void {
  data.sessions = data.sessions.filter(x => x.id !== id);
  persist();
}

export function setBaseStage(moveId: string, stage: Stage): void {
  if (stage > 0) data.base[moveId] = stage; else delete data.base[moveId];
  persist();
}

export function replaceAll(p: Progress): void {
  data = JSON.parse(JSON.stringify(p));
  persist();
}
