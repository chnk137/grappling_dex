import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, LogFab, Pips, SectionLabel } from '../../components/ui';
import { gaps, techniques } from '../../data/catalog';
import { pickBackup, shareBackup } from '../../lib/backup';
import { RULES, STAGES, type Progress } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors, radius, space } from '../../theme';

const fmtDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function ProgressScreen() {
  const router = useRouter();
  const { progress, stage, removeSession, restore } = useProgress();
  const [armed, setArmed] = useState<string | null>(null);
  const [pending, setPending] = useState<Progress | null>(null);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const fail = (e: unknown) => setNote({ text: e instanceof Error ? e.message : String(e), bad: true });

  const backUp = () => { setNote(null); shareBackup(progress).catch(fail); };
  const choose = () => {
    setNote(null);
    pickBackup().then(p => { if (p) setPending(p); }).catch(fail);
  };
  const confirmRestore = () => {
    if (!pending) return;
    restore(pending);
    setNote({ text: `Restored ${pending.sessions.length} session${pending.sessions.length === 1 ? '' : 's'}.` });
    setPending(null);
  };
  const counts = [1, 2, 3, 4].map(k => techniques.filter(t => stage(t.id) >= k).length);
  const total = techniques.length * 4;
  const pct = Math.round((100 * techniques.reduce((a, t) => a + stage(t.id), 0)) / total);
  const g = gaps(progress);
  const recent = [...progress.sessions].reverse().slice(0, 8);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.pctRow}>
          <Text style={styles.pct}>{pct}%</Text>
          <Text style={styles.pctLabel}>of the dex complete</Text>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>

        <View style={styles.tiles}>
          {counts.map((c, i) => (
            <View key={i} style={styles.tile}>
              <Text style={styles.tileNum}>{c}</Text>
              <View style={styles.tileFoot}><Pips stage={i + 1} /><Text style={styles.tileLabel}>{STAGES[i + 1]}{i < 3 ? '+' : ''}</Text></View>
            </View>
          ))}
        </View>

        <Button label="Log a session" onPress={() => router.push('/log')} />

        {g.length > 0 && (
          <View style={styles.gaps}>
            <Text style={styles.gapsTitle}>Gaps in your game</Text>
            {g.map(x => (
              <Pressable key={x.text} onPress={() => router.push({ pathname: '/entry/[id]', params: { id: x.positionId } })} style={styles.gapRow} accessibilityRole="link">
                <Text style={styles.gapText}>{x.text}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        <SectionLabel>Recent sessions</SectionLabel>
        {recent.length ? recent.map(s => (
          <View key={s.id} style={styles.sess}>
            <Text style={styles.sessDate}>{fmtDate(s.date)} <Text style={styles.muted}>· {Object.keys(s.items).length} moves</Text></Text>
            <Pressable onPress={() => (armed === s.id ? (removeSession(s.id), setArmed(null)) : setArmed(s.id))} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.remove, armed === s.id && { color: colors.gap }]}>{armed === s.id ? 'Tap again to remove' : 'Remove'}</Text>
            </Pressable>
          </View>
        )) : <Text style={styles.muted}>No sessions yet. Log your first class and it shows up here.</Text>}

        <SectionLabel>Your data</SectionLabel>
        <Text style={styles.help}>Your progress is stored only on this phone. Save a backup now and then (to Files, Drive or email) so a new phone can pick up where you left off.</Text>
        {pending ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>
              Restore {pending.sessions.length} session{pending.sessions.length === 1 ? '' : 's'} from this backup? It replaces the {progress.sessions.length} on this phone.
            </Text>
            <View style={styles.row}>
              <Button label="Replace" onPress={confirmRestore} style={styles.flex} />
              <Button label="Cancel" kind="outline" onPress={() => setPending(null)} style={styles.flex} />
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Button label="Back up" kind="outline" onPress={backUp} style={styles.flex} />
            <Button label="Restore" kind="outline" onPress={choose} style={styles.flex} />
          </View>
        )}
        {note && <Text style={[styles.note, note.bad && { color: colors.gap }]} accessibilityLiveRegion="polite">{note.text}</Text>}
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.remove}>Privacy policy</Text>
        </Pressable>

        <SectionLabel>How stages work</SectionLabel>
        <Text style={styles.help}>
          <Text style={styles.b}>Seen</Text> when you watch it · <Text style={styles.b}>Drilled</Text> when you drill it · <Text style={styles.b}>Hit</Text> when you land it live · <Text style={styles.b}>Mastered</Text> when you&apos;ve hit it live on {RULES.masterDays} different days.
        </Text>
      </ScrollView>
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 110 },
  pctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  pct: { color: colors.brass, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pctLabel: { color: colors.muted, fontSize: 14 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brass },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexGrow: 1, flexBasis: '45%', padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, gap: 6 },
  tileNum: { color: colors.ink, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileLabel: { color: colors.muted, fontSize: 12 },
  gaps: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 3, borderLeftColor: colors.gap, backgroundColor: colors.bg2, padding: space.md, gap: 2 },
  gapsTitle: { color: colors.gap, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 },
  gapRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: 8 },
  gapText: { flex: 1, color: colors.ink, fontSize: 15 },
  chev: { color: colors.muted, fontSize: 20 },
  sess: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.line },
  sessDate: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  muted: { color: colors.muted, fontWeight: '400', fontSize: 14 },
  remove: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  help: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  b: { color: colors.ink, fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  confirm: { gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.brassSoft },
  confirmText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  note: { color: colors.sweep, fontSize: 14 },
});
