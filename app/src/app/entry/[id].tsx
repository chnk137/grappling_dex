import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bar, Chips, Pips, SectionLabel, TypeIcon } from '../../components/ui';
import {
  combos, entryNo, MAX_COMBOS, MAX_FROM, positionActive, positionById, positionLinks, relatedMoves, scorecard,
  techniqueById, techniques, TIERS, TYPES, type MoveType, type Technique,
} from '../../data/catalog';
import { KIND_LABEL, localDate, nextStep, RULES, stats, STAGES, type Kind, type Stage } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors, radius, space, typeColor } from '../../theme';

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const move = techniqueById.get(id);
  const pos = positionById.get(id);
  return (
    <>
      <Stack.Screen options={{ title: entryNo.get(id) ?? '' }} />
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.body}>
        {move ? <MoveEntry t={move} /> : pos ? <PositionEntry id={pos.id} /> : <Text style={styles.muted}>{"This entry doesn't exist."}</Text>}
      </ScrollView>
    </>
  );
}

function MoveEntry({ t }: { t: Technique }) {
  const { progress, stage, logMoves, clearToday, setBase } = useProgress();
  const s = stage(t.id);
  const st = stats(progress, t.id);
  const today = progress.sessions.find(x => x.date === localDate())?.items[t.id];
  const cmb = combos(t);

  const quick = (kind: Kind) => {
    const ups = logMoves(localDate(), [{ moveId: t.id, kind, hits: 1 }]);
    if (ups.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <>
      <View style={styles.kindRow}>
        <Text style={styles.entryNo}>{entryNo.get(t.id)}</Text>
        <Text style={[styles.tag, { color: typeColor(t.type), borderColor: typeColor(t.type) }]}>{TYPES[t.type].label}</Text>
        {t.gi && <Text style={styles.kindText}>Gi only</Text>}
      </View>
      <View style={styles.portrait}>
        <View style={[styles.glow, { backgroundColor: typeColor(t.type), opacity: s ? 0.18 : 0.05 }]} />
        <TypeIcon type={t.type} size={64} dim={!s} />
      </View>
      <Text style={styles.h1}>{t.name}</Text>
      <Text style={styles.note}>{t.note}</Text>

      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>{STAGES[s]}</Text><Pips stage={s} /></View>
        <Text style={styles.muted}>{nextStep(progress, t.id)}</Text>
        <View style={styles.qlog}>
          {(['seen', 'drilled', 'hit'] as Kind[]).map(k => (
            <Pressable key={k} onPress={() => quick(k)} style={({ pressed }) => [styles.qbtn, pressed && { backgroundColor: colors.brassSoft }]} accessibilityRole="button" accessibilityLabel={`Log ${KIND_LABEL[k]} for today`}>
              <Text style={styles.qtext}>+ {KIND_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        {today && (
          <View style={styles.todayRow}>
            <Text style={styles.ink}>Today: {KIND_LABEL[today.kind]}{today.kind === 'hit' ? ` ×${today.hits}` : ''}</Text>
            <Pressable onPress={() => clearToday(t.id)} hitSlop={10}><Text style={styles.link}>Undo today</Text></Pressable>
          </View>
        )}
        <Text style={styles.muted}>
          {st.seenSessions ? `Logged in ${st.seenSessions} session${st.seenSessions > 1 ? 's' : ''} · ${st.hits} live hit${st.hits === 1 ? '' : 's'}` : 'Not logged yet.'}
        </Text>
        <SectionLabel>Already know it? Starting stage</SectionLabel>
        <View style={styles.baseRow}>
          {([0, 1, 2, 3, 4] as Stage[]).map(i => {
            const on = (progress.base[t.id] ?? 0) === i;
            return (
              <Pressable key={i} onPress={() => setBase(t.id, i)} style={[styles.baseBtn, on && styles.baseOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <Text style={[styles.baseText, on && { color: colors.bg }]}>{i ? STAGES[i] : 'None'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionLabel>Stats</SectionLabel>
      <View style={styles.bars}>
        <Bar label="Positions" value={t.from.length} max={MAX_FROM} />
        <Bar label="Combos" value={cmb.length} max={MAX_COMBOS} />
        <Bar label="Live hits" value={st.hits} max={RULES.masterHits} />
        <Bar label="Sessions" value={st.seenSessions} max={RULES.masterSessions + RULES.drillSessions} />
      </View>

      <SectionLabel>{`Related positions · works from (${t.from.length})`}</SectionLabel>
      <Chips ids={t.from} />
      {t.to && <><SectionLabel>Leads to</SectionLabel><Chips ids={[t.to]} /></>}
      {cmb.length > 0 && <><SectionLabel>Combos with</SectionLabel><Chips ids={cmb} /></>}
      <SectionLabel>Related moves</SectionLabel>
      <Chips ids={relatedMoves(t)} />
    </>
  );
}

function PositionEntry({ id }: { id: string }) {
  const { progress } = useProgress();
  const p = positionById.get(id)!;
  const rows = scorecard(progress, id);
  const active = positionActive(progress, id);
  const arrive = techniques.filter(t => t.to === id).map(t => t.id);
  const neighbours = positionLinks.filter(l => l.includes(id)).map(l => (l[0] === id ? l[1] : l[0]));

  return (
    <>
      <View style={styles.kindRow}>
        <Text style={styles.entryNo}>{entryNo.get(id)}</Text>
        <Text style={styles.kindText}>Position · {TIERS[p.tier]}</Text>
      </View>
      <Text style={styles.h1}>{p.name}</Text>
      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>Scorecard</Text><Text style={styles.small}>moves at Hit or better</Text></View>
        {rows.map(r => <Bar key={r.label} label={r.label} value={r.have} max={r.total} right={`${r.have}/${r.total}`} warn={active && !r.have && r.label !== 'Ways in'} />)}
        {!active && <Text style={styles.muted}>Log any move from here to start tracking this position.</Text>}
      </View>
      {(Object.keys(TYPES) as MoveType[]).map(k => {
        const ids = techniques.filter(t => t.type === k && t.from.includes(id)).map(t => t.id);
        return ids.length ? <View key={k} style={{ gap: space.sm }}><SectionLabel>{`${TYPES[k].plural} from here (${ids.length})`}</SectionLabel><Chips ids={ids} /></View> : null;
      })}
      {arrive.length > 0 && <><SectionLabel>{`Ways to get here (${arrive.length})`}</SectionLabel><Chips ids={arrive} /></>}
      {neighbours.length > 0 && <><SectionLabel>Connected positions</SectionLabel><Chips ids={neighbours} /></>}
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryNo: { color: colors.brass, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  kindText: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  portrait: { height: 130, borderRadius: radius.md, borderWidth: 1, borderColor: '#1c3039', backgroundColor: colors.screen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  h1: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  note: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  box: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, padding: space.md, gap: space.sm },
  boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stage: { color: colors.brass, fontSize: 18, fontWeight: '800' },
  small: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  ink: { color: colors.ink, fontSize: 14 },
  link: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
  qlog: { flexDirection: 'row', gap: 6 },
  qbtn: { flex: 1, minHeight: 46, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.brass, alignItems: 'center', justifyContent: 'center' },
  qtext: { color: colors.brass, fontSize: 14, fontWeight: '700' },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  baseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  baseBtn: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  baseOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  baseText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  bars: { gap: 10 },
});
