import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SectionLabel, TypeIcon } from '../components/ui';
import { logOptions, nameOf, sideLabel, techniqueById, techniques, TYPES, type LogOption } from '../data/catalog';
import { KIND_LABEL, KIND_LONG, lastPosition, localDate, movesIn, STAGES, type LogKind } from '../lib/progress';
import { useProgress, type LogEntry } from '../lib/store';
import { colors, radius, space } from '../theme';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const KIND_GROUPS: { label: string; kinds: LogKind[] }[] = [
  { label: 'Practice', kinds: ['seen', 'drilled'] },
  { label: 'Attacked', kinds: ['landed', 'missed'] },
  { label: 'Defended', kinds: ['stopped', 'caught'] },
];

/** A picked row. The same move can be added again from another position. */
type Row = LogEntry & { uid: number };
let nextUid = 1;

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { progress, stage, logMoves } = useProgress();
  const [date, setDate] = useState(localDate());
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Row[]>([]);
  const [result, setResult] = useState<string[] | null>(null);
  // Set when Save is tapped with a position missing: those moves get outlined.
  const [flagged, setFlagged] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const rowY = useRef(new Map<number, number>());

  const q = query.trim().toLowerCase();
  const pickedIds = new Set(picked.map(p => p.moveId));
  const results = q ? techniques.filter(t => !pickedIds.has(t.id) && t.name.toLowerCase().includes(q)).slice(0, 7) : [];
  const recent = useMemo(
    () => [...new Set([...progress.sessions].reverse().slice(0, 4).flatMap(movesIn))].slice(0, 10),
    [progress],
  ).filter(id => !pickedIds.has(id));

  // Starts on the position this move was last logged from (or its only option); otherwise you pick.
  const defaultOption = (moveId: string): Partial<LogOption> => {
    const opts = logOptions(techniqueById.get(moveId)!);
    const last = lastPosition(progress, moveId);
    const lastOpts = opts.filter(o => o.pos === last);
    return opts.length === 1 ? opts[0] : lastOpts.length === 1 ? lastOpts[0] : {};
  };
  const add = (moveId: string) => {
    setPicked(p => [...p, { uid: nextUid++, moveId, kind: 'drilled', pos: null, side: null, ...defaultOption(moveId) }]);
    setQuery('');
    Haptics.selectionAsync();
  };
  const optKey = (o: { pos?: string | null; side?: string | null }) => `${o.pos}:${o.side ?? ''}`;
  const addAnother = (e: Row) => {
    const used = new Set(picked.filter(x => x.moveId === e.moveId).map(optKey));
    const free = logOptions(techniqueById.get(e.moveId)!).filter(o => !used.has(optKey(o)));
    setPicked(p => [...p, { uid: nextUid++, moveId: e.moveId, kind: e.kind, pos: null, side: null, ...(free.length === 1 ? free[0] : {}) }]);
  };
  const update = (uid: number, patch: Partial<LogEntry>) => setPicked(p => p.map(e => (e.uid === uid ? { ...e, ...patch } : e)));
  const remove = (uid: number) => setPicked(p => p.filter(e => e.uid !== uid));
  const dateOk = ISO.test(date) && !Number.isNaN(Date.parse(date)) && date <= localDate();
  const missing = picked.filter(e => !e.pos);
  const missingPos = missing.length;

  const save = () => {
    if (!picked.length || !dateOk) return;
    if (missingPos) {
      // Point at the first move that still needs a position instead of doing nothing.
      setFlagged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const y = rowY.current.get(missing[0].uid);
      if (y !== undefined) scroller.current?.scrollTo({ y: Math.max(0, y - space.lg), animated: true });
      return;
    }
    const ups = logMoves(date, picked);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (ups.length) setResult(ups); else router.back();
  };

  if (result) {
    return (
      <View style={[styles.done, { paddingBottom: insets.bottom + space.lg }]}>
        <Text style={styles.doneTitle}>Session saved</Text>
        <Text style={styles.muted}>{result.length} move{result.length > 1 ? 's' : ''} levelled up</Text>
        <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
          {result.map(id => (
            <View key={id} style={styles.upRow}>
              <TypeIcon type={techniqueById.get(id)!.type} size={14} />
              <Text style={styles.upName}>{nameOf(id)}</Text>
              <Text style={styles.upStage}>{STAGES[stage(id)]}</Text>
            </View>
          ))}
        </View>
        <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroller} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SectionLabel>Date</SectionLabel>
        <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted}
          style={[styles.input, !dateOk && { borderColor: colors.gap }]} autoCorrect={false} keyboardType="numbers-and-punctuation" accessibilityLabel="Session date" />
        {!dateOk && <Text style={styles.err}>Use a date like {localDate()}, today or earlier.</Text>}

        <SectionLabel>Add what you trained</SectionLabel>
        <TextInput value={query} onChangeText={setQuery} placeholder="Type a move: triangle, knee slice…" placeholderTextColor={colors.muted}
          style={styles.input} autoCorrect={false} returnKeyType="done" onSubmitEditing={() => results[0] && add(results[0].id)} accessibilityLabel="Search moves to add" />
        {results.map(t => (
          <Pressable key={t.id} onPress={() => add(t.id)} style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.line }]} accessibilityRole="button">
            <TypeIcon type={t.type} size={13} />
            <Text style={styles.resultName}>{t.name}</Text>
            <Text style={styles.small}>{TYPES[t.type].label}</Text>
          </Pressable>
        ))}
        {!q && recent.length > 0 && (
          <>
            <SectionLabel>Recent</SectionLabel>
            <View style={styles.recent}>
              {recent.map(id => (
                <Pressable key={id} onPress={() => add(id)} style={styles.recentChip} accessibilityRole="button">
                  <TypeIcon type={techniqueById.get(id)!.type} size={11} /><Text style={styles.ink}>{nameOf(id)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {picked.map(e => {
          const opts = logOptions(techniqueById.get(e.moveId)!);
          const used = new Set(picked.filter(x => x.moveId === e.moveId && x.uid !== e.uid).map(optKey));
          const free = opts.filter(o => !used.has(optKey(o)));
          return (
          <View key={e.uid} style={[styles.picked, flagged && !e.pos && styles.pickedNeed]} onLayout={ev => rowY.current.set(e.uid, ev.nativeEvent.layout.y)}>
            <View style={styles.pickedHead}>
              <TypeIcon type={techniqueById.get(e.moveId)!.type} size={13} />
              <Text style={styles.pickedName}>{nameOf(e.moveId)}</Text>
              <Pressable onPress={() => remove(e.uid)} hitSlop={12} accessibilityLabel={`Remove ${nameOf(e.moveId)}`}><Text style={styles.x}>✕</Text></Pressable>
            </View>
            <View style={styles.ctrl}>
              {KIND_GROUPS.map(g => (
                <View key={g.label} style={styles.group}>
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  <View style={styles.seg}>
                    {g.kinds.map(k => (
                      <Pressable key={k} onPress={() => update(e.uid, { kind: k })} style={[styles.segBtn, e.kind === k && styles.segOn]} accessibilityRole="radio" accessibilityLabel={KIND_LONG[k]} accessibilityState={{ selected: e.kind === k }}>
                        <Text style={[styles.segText, e.kind === k && { color: colors.bg }]}>{KIND_LABEL[k]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <Text style={[styles.fromLabel, !e.pos && { color: colors.brass }]}>{e.pos ? 'From' : 'From where?'}</Text>
            <View style={styles.posRow} accessibilityRole="radiogroup" accessibilityLabel={`Where ${nameOf(e.moveId)} started from`}>
              {free.map(o => {
                const on = e.pos === o.pos && (e.side ?? null) === o.side;
                const label = `${nameOf(o.pos)}${o.side ? ` · ${sideLabel(o.pos, o.side)}` : ''}`;
                return (
                  <Pressable key={optKey(o)} onPress={() => update(e.uid, { pos: o.pos, side: o.side })} style={[styles.posChip, on && styles.posOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Text style={[styles.posText, on && { color: colors.bg }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {free.length > 1 && (
              <Pressable onPress={() => addAnother(e)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.another}>+ Also from another position</Text>
              </Pressable>
            )}
          </View>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={[styles.small, { flex: 1 }, flagged && missingPos > 0 && styles.warn]} accessibilityLiveRegion="polite">
          {!picked.length ? 'Nothing added yet' : missingPos ? `Pick where ${missingPos === 1 ? nameOf(missing[0].moveId) : `${missingPos} moves`} started` : `${picked.length} ${picked.length > 1 ? 'entries' : 'entry'} in this session`}
        </Text>
        <Button label="Save session" onPress={save} style={[{ paddingHorizontal: 22 }, (!picked.length || !dateOk) && { opacity: 0.4 }]} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xl },
  fromLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickedNeed: { borderColor: colors.brass, borderWidth: 2 },
  warn: { color: colors.brass, fontWeight: '700' },
  posChip: { minHeight: 34, paddingHorizontal: 10, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  posOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  posText: { color: colors.ink, fontSize: 13.5 },
  another: { color: colors.brass, fontSize: 13.5, fontWeight: '600', paddingVertical: 4 },
  input: { height: 46, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, color: colors.ink, paddingHorizontal: 12, fontSize: 16 },
  err: { color: colors.gap, fontSize: 13 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 8, borderRadius: radius.sm },
  resultName: { flex: 1, color: colors.ink, fontSize: 16 },
  recent: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  picked: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm, marginTop: space.xs },
  pickedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickedName: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  x: { color: colors.muted, fontSize: 16 },
  ctrl: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: space.sm },
  group: { gap: 4 },
  groupLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  seg: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  segBtn: { minHeight: 40, paddingHorizontal: 11, justifyContent: 'center' },
  segOn: { backgroundColor: colors.brass },
  segText: { color: colors.muted, fontSize: 13.5, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.panel },
  small: { color: colors.muted, fontSize: 12, letterSpacing: 0.5 },
  muted: { color: colors.muted, fontSize: 15 },
  ink: { color: colors.ink, fontSize: 14 },
  done: { flex: 1, padding: space.xl, gap: space.lg, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: colors.brass, fontSize: 26, fontWeight: '800' },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.brassSoft },
  upName: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '600' },
  upStage: { color: colors.brass, fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
});
