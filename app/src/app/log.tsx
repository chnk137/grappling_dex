import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SectionLabel, TypeIcon } from '../components/ui';
import { nameOf, techniqueById, techniques, TYPES } from '../data/catalog';
import { KIND_LABEL, localDate, STAGES, type Kind } from '../lib/progress';
import { useProgress, type LogEntry } from '../lib/store';
import { colors, radius, space } from '../theme';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { progress, stage, logMoves } = useProgress();
  const [date, setDate] = useState(localDate());
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<string[] | null>(null);

  const q = query.trim().toLowerCase();
  const pickedIds = new Set(picked.map(p => p.moveId));
  const results = q ? techniques.filter(t => !pickedIds.has(t.id) && t.name.toLowerCase().includes(q)).slice(0, 7) : [];
  const recent = useMemo(
    () => [...new Set([...progress.sessions].reverse().slice(0, 4).flatMap(s => Object.keys(s.items)))].slice(0, 10),
    [progress],
  ).filter(id => !pickedIds.has(id));

  const add = (moveId: string) => { setPicked(p => [...p, { moveId, kind: 'drilled' }]); setQuery(''); Haptics.selectionAsync(); };
  const update = (moveId: string, patch: Partial<LogEntry>) => setPicked(p => p.map(e => (e.moveId === moveId ? { ...e, ...patch } : e)));
  const remove = (moveId: string) => setPicked(p => p.filter(e => e.moveId !== moveId));
  const dateOk = ISO.test(date) && !Number.isNaN(Date.parse(date)) && date <= localDate();

  const save = () => {
    if (!picked.length || !dateOk) return;
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
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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

        {picked.map(e => (
          <View key={e.moveId} style={styles.picked}>
            <View style={styles.pickedHead}>
              <TypeIcon type={techniqueById.get(e.moveId)!.type} size={13} />
              <Text style={styles.pickedName}>{nameOf(e.moveId)}</Text>
              <Pressable onPress={() => remove(e.moveId)} hitSlop={12} accessibilityLabel={`Remove ${nameOf(e.moveId)}`}><Text style={styles.x}>✕</Text></Pressable>
            </View>
            <View style={styles.ctrl}>
              <View style={styles.seg}>
                {(['seen', 'drilled', 'hit'] as Kind[]).map(k => (
                  <Pressable key={k} onPress={() => update(e.moveId, { kind: k })} style={[styles.segBtn, e.kind === k && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: e.kind === k }}>
                    <Text style={[styles.segText, e.kind === k && { color: colors.bg }]}>{KIND_LABEL[k]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={styles.small}>{picked.length ? `${picked.length} move${picked.length > 1 ? 's' : ''} in this session` : 'Nothing added yet'}</Text>
        <Button label="Save session" onPress={save} style={[{ paddingHorizontal: 22 }, (!picked.length || !dateOk) && { opacity: 0.4 }]} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xl },
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
  ctrl: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  seg: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  segBtn: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center' },
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
