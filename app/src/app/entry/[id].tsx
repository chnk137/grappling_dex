import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bar, Chips, Pips, SectionLabel, TypeIcon } from '../../components/ui';
import {
  combos, entryNo, MAX_COMBOS, MAX_FROM, positionActive, positionById, positionLinks, relatedMoves, scorecard,
  techniqueById, techniques, TIERS, TYPES, type MoveType, type Technique,
} from '../../data/catalog';
import { KIND_LABEL, lastPosition, localDate, nextStep, posStats, RULES, splitKey, stats, STAGES, derivedStage, type Kind, type Stage } from '../../lib/progress';
import { SPRITES } from '../../data/sprites';
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
  const router = useRouter();
  const { progress, stage, logMoves, clearToday, setBase } = useProgress();
  const s = stage(t.id);
  const st = stats(progress, t.id);
  const todaySession = progress.sessions.find(x => x.date === localDate());
  const today = todaySession
    ? Object.entries(todaySession.items).map(([k, it]) => ({ ...splitKey(k), kind: it.kind })).filter(x => x.moveId === t.id)
    : [];
  const cmb = combos(t);
  // The sprite of the first starting position that has one (sprites are made per position).
  const spritePos = t.from.find(f => SPRITES[f] !== undefined);
  const last = lastPosition(progress, t.id);
  // Quick log asks where it started from, unless the move only has one position.
  const [asking, setAsking] = useState<Kind | null>(null);

  const log = (kind: Kind, pos: string) => {
    setAsking(null);
    const ups = logMoves(localDate(), [{ moveId: t.id, kind, pos }]);
    if (ups.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const quick = (kind: Kind) => {
    if (t.from.length === 1) log(kind, t.from[0]);
    else { setAsking(a => (a === kind ? null : kind)); Haptics.selectionAsync(); }
  };
  // Most recently used position first, so the usual one is the first chip.
  const fromOrder = last && t.from.includes(last) ? [last, ...t.from.filter(f => f !== last)] : t.from;

  return (
    <>
      <View style={styles.kindRow}>
        <Text style={styles.entryNo}>{entryNo.get(t.id)}</Text>
        <Text style={[styles.tag, { color: typeColor(t.type), borderColor: typeColor(t.type) }]}>{TYPES[t.type].label}</Text>
        {t.gi && <Text style={styles.kindText}>Gi only</Text>}
      </View>
      {spritePos ? (
        <View style={[styles.portrait, styles.portraitSprite]}>
          <Image source={SPRITES[spritePos]} style={[styles.sprite, !s && styles.spriteDim]} resizeMode="contain" accessibilityLabel={positionById.get(spritePos)!.name} />
          <View style={styles.badge}><TypeIcon type={t.type} size={16} /></View>
          <Text style={styles.fromTag}>From {positionById.get(spritePos)!.name}{t.to ? ` → ${positionById.get(t.to)!.name}` : ''}</Text>
        </View>
      ) : (
        <View style={styles.portrait}>
          <View style={[styles.glow, { backgroundColor: typeColor(t.type), opacity: s ? 0.18 : 0.05 }]} />
          <TypeIcon type={t.type} size={64} dim={!s} />
        </View>
      )}
      <Text style={styles.h1}>{t.name}</Text>
      <Text style={styles.note}>{t.note}</Text>

      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>{STAGES[s]}</Text><Pips stage={s} /></View>
        <Text style={styles.muted}>{nextStep(progress, t.id)}</Text>
        <View style={styles.qlog}>
          {(['seen', 'drilled', 'hit'] as Kind[]).map(k => (
            <Pressable key={k} onPress={() => quick(k)} style={({ pressed }) => [styles.qbtn, (pressed || asking === k) && { backgroundColor: colors.brassSoft }]} accessibilityRole="button" accessibilityLabel={`Log ${KIND_LABEL[k]} for today`} accessibilityState={{ expanded: asking === k }}>
              <Text style={styles.qtext}>+ {KIND_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        {asking && (
          <View style={styles.ask}>
            <Text style={styles.askLabel}>{`${KIND_LABEL[asking]} from where?`}</Text>
            <View style={styles.posRow}>
              {fromOrder.map(f => (
                <Pressable key={f} onPress={() => log(asking, f)} style={({ pressed }) => [styles.posChip, pressed && { backgroundColor: colors.brassSoft }]} accessibilityRole="button" accessibilityLabel={`${KIND_LABEL[asking]} from ${positionById.get(f)!.name}`}>
                  <Text style={styles.ink}>{positionById.get(f)!.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {today.length > 0 && (
          <View style={styles.todayRow}>
            <Text style={[styles.ink, { flex: 1 }]}>Today: {today.map(x => `${KIND_LABEL[x.kind]}${x.pos ? ` from ${positionById.get(x.pos)?.name ?? x.pos}` : ''}`).join(' · ')}</Text>
            <Pressable onPress={() => clearToday(t.id)} hitSlop={10}><Text style={styles.link}>Undo today</Text></Pressable>
          </View>
        )}
        <View style={styles.daysRow} accessible accessibilityLabel={`Hit live on ${Math.min(st.hitDays, RULES.masterDays)} of ${RULES.masterDays} days`}>
          <View style={styles.dots}>
            {Array.from({ length: RULES.masterDays }, (_, i) => <View key={i} style={[styles.dot, i < st.hitDays && styles.dotOn]} />)}
          </View>
          <Text style={styles.muted}>Hit live on {Math.min(st.hitDays, RULES.masterDays)} of {RULES.masterDays} days</Text>
        </View>
        <Text style={styles.small}>{st.sessions ? `Logged in ${st.sessions} session${st.sessions > 1 ? 's' : ''}` : 'Not logged yet.'}</Text>
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
        <Bar label="Days hit live" value={st.hitDays} max={RULES.masterDays} right={`${Math.min(st.hitDays, RULES.masterDays)}/${RULES.masterDays}`} />
      </View>

      <SectionLabel>{`By position · works from (${t.from.length})`}</SectionLabel>
      <View style={styles.byPos}>
        {t.from.map(f => {
          const ps = posStats(progress, t.id, f);
          const ds = derivedStage(ps);
          const text = ps.hitDays ? `Hit live on ${ps.hitDays} day${ps.hitDays > 1 ? 's' : ''}` : ds === 2 ? 'Drilled' : ds === 1 ? 'Seen' : 'Not logged';
          return (
            <Pressable key={f} onPress={() => router.push({ pathname: '/entry/[id]', params: { id: f } })} style={({ pressed }) => [styles.posLine, pressed && { backgroundColor: colors.line }]} accessibilityRole="link" accessibilityLabel={`${positionById.get(f)!.name}: ${text}`}>
              <Text style={[styles.ink, { flex: 1 }]}>{positionById.get(f)!.name}</Text>
              <Text style={[styles.posStat, ds >= 3 && { color: colors.brass }]}>{text}</Text>
              <Pips stage={ds} />
            </Pressable>
          );
        })}
      </View>
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
      {SPRITES[id] !== undefined && (
        <View style={[styles.portrait, styles.portraitSprite]}>
          <Image source={SPRITES[id]} style={[styles.sprite, !active && styles.spriteDim]} resizeMode="contain" accessibilityLabel={p.name} />
        </View>
      )}
      <Text style={styles.h1}>{p.name}</Text>
      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>Scorecard</Text><Text style={styles.small}>moves at Hit or better</Text></View>
        {rows.map(r => <Bar key={r.label} label={r.label} value={r.have} max={r.total} right={`${r.have}/${r.total}`} warn={active && !r.have && r.label !== 'Ways in'} />)}
        {!active && <Text style={styles.muted}>Log any move from here to start tracking this position.</Text>}
      </View>
      {(Object.keys(TYPES) as MoveType[]).map(k => {
        const ids = techniques.filter(t => t.type === k && t.from.includes(id)).map(t => t.id);
        return ids.length ? <View key={k} style={{ gap: space.sm }}><SectionLabel>{`${TYPES[k].plural} from here (${ids.length})`}</SectionLabel><Chips ids={ids} at={id} /></View> : null;
      })}
      {arrive.length > 0 && <><SectionLabel>{`Ways to get here (${arrive.length})`}</SectionLabel><Chips ids={arrive} /></>}
      {neighbours.length > 0 && <><SectionLabel>Connected positions</SectionLabel><Chips ids={neighbours} /></>}
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  ask: { gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.brassSoft },
  askLabel: { color: colors.brass, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  posChip: { minHeight: 38, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  byPos: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  posLine: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: space.md, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.bg2 },
  posStat: { color: colors.muted, fontSize: 13 },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: colors.brass, opacity: 0.5 },
  dotOn: { backgroundColor: colors.brass, opacity: 1 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryNo: { color: colors.brass, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  kindText: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  portrait: { height: 130, borderRadius: radius.md, borderWidth: 1, borderColor: '#1c3039', backgroundColor: colors.screen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  portraitSprite: { height: 210 },
  sprite: { width: '100%', height: '100%' },
  spriteDim: { opacity: 0.3 },
  badge: { position: 'absolute', top: 8, right: 8 },
  fromTag: { position: 'absolute', left: 8, bottom: 8, color: colors.muted, fontSize: 11.5, backgroundColor: 'rgba(12, 26, 33, 0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
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
