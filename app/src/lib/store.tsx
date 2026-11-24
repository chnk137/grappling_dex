import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { techniques } from '../data/catalog';
import { colors } from '../theme';
import * as db from './db';
import { addItem, localDate, removeMove, stageOf, type LogKind, type Progress, type Session, type Stage } from './progress';

/** One logged move. `pos` is the position it started from. */
export interface LogEntry { moveId: string; kind: LogKind; pos?: string | null }

interface Store {
  progress: Progress;
  stage: (moveId: string) => Stage;
  /** Logs moves into the session for `date`. Returns the ids of moves that moved up a stage. */
  logMoves: (date: string, entries: LogEntry[]) => string[];
  clearToday: (moveId: string) => void;
  setBase: (moveId: string, stage: Stage) => void;
  removeSession: (id: string) => void;
  /** Replaces all progress with a restored backup. */
  restore: (p: Progress) => void;
}

const Ctx = createContext<Store | null>(null);

const newSession = (date: string): Session => ({ id: `${date}-${Math.random().toString(36).slice(2, 8)}`, date, items: {} });

/** Opens the on-device database, then provides progress to the app. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initial, setInitial] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    db.openDb().then(() => setInitial(db.loadProgress())).catch(e => setError(String(e?.message ?? e)));
  }, []);
  if (error) return <View style={styles.center}><Text style={styles.err}>{`Couldn't open your saved progress: ${error}`}</Text></View>;
  if (!initial) return <View style={styles.center}><ActivityIndicator color={colors.brass} /></View>;
  return <LoadedProvider initial={initial}>{children}</LoadedProvider>;
}

function LoadedProvider({ initial, children }: { initial: Progress; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(initial);

  const stages = useMemo(() => new Map(techniques.map(t => [t.id, stageOf(progress, t.id)])), [progress]);
  const stage = useCallback((id: string) => (stages.get(id) ?? 0) as Stage, [stages]);

  const logMoves = useCallback((date: string, entries: LogEntry[]) => {
    const before = new Map(entries.map(e => [e.moveId, stageOf(progress, e.moveId)]));
    let s = progress.sessions.find(x => x.date === date) ?? newSession(date);
    for (const e of entries) s = addItem(s, e.moveId, e.kind, e.pos);
    db.saveSession(s);
    const next = db.loadProgress();
    setProgress(next);
    return entries.filter(e => stageOf(next, e.moveId) > (before.get(e.moveId) ?? 0)).map(e => e.moveId);
  }, [progress]);

  const clearToday = useCallback((moveId: string) => {
    const s = progress.sessions.find(x => x.date === localDate());
    if (!s) return;
    db.saveSession(removeMove(s, moveId));
    setProgress(db.loadProgress());
  }, [progress]);

  const setBase = useCallback((moveId: string, st: Stage) => { db.setBaseStage(moveId, st); setProgress(db.loadProgress()); }, []);
  const removeSession = useCallback((id: string) => { db.deleteSession(id); setProgress(db.loadProgress()); }, []);

  const restore = useCallback((p: Progress) => { db.replaceAll(p); setProgress(db.loadProgress()); }, []);

  const value = useMemo(() => ({ progress, stage, logMoves, clearToday, setBase, removeSession, restore }), [progress, stage, logMoves, clearToday, setBase, removeSession, restore]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  err: { color: colors.gap, fontSize: 15, textAlign: 'center' },
});

export function useProgress(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress must be used inside ProgressProvider');
  return v;
}
