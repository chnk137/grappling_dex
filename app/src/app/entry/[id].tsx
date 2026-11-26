import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowList } from '../../components/FlowList';
import { Bar, Button, Chips, Pips, SectionLabel, TypeIcon } from '../../components/ui';
import {
  attackSides, combos, flipSide, logOptions, entryNo, hasSides, mainSide, positionActive, positionById, positionLinks, positionRecord, relatedMoves, scorecard,
  sideLabel, techniqueById, techniques, TIERS, TYPES, type Side, type Technique,
} from '../../data/catalog';
import {
  ago, describeItem, isRusty, KIND_LABEL, RUSTY_DAYS, KIND_LONG, lastPosition, liveRecord, localDate, nextStep, posStats, RULES, splitKey, stats, STAGES, derivedStage,
  type Live, type LogKind, type Stage,
} from '../../lib/progress';
import { SPRITES } from '../../data/sprites';
import { useProgress } from '../../lib/store';
import { colors, radius, space, typeColor } from '../../theme';

export default function EntryScreen() {
  const { id, side } = useLocalSearchParams<{ id: string; side?: string }>();
  const move = techniqueById.get(id);
  const pos = positionById.get(id);
  return (
    <>
      <Stack.Screen options={{ title: entryNo.get(id) ?? '' }} />
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.body}>
        {move ? <MoveEntry t={move} /> : pos ? <PositionEntry key={`${pos.id}:${side ?? ''}`} id={pos.id} side={side === 'top' || side === 'bottom' ? side : undefined} /> : <Text style={styles.muted}>{"This entry doesn't exist."}</Text>}
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
    ? Object.entries(todaySession.items).map(([k, it]) => ({ ...splitKey(k), text: describeItem(it) })).filter(x => x.moveId === t.id)
    : [];
  const cmb = combos(t);
  const rec = liveRecord(progress, t.id);
  // The sprite of the first starting position that has one (sprites are made per position).
  const spritePos = t.from.find(f => SPRITES[f] !== undefined);
  const last = lastPosition(progress, t.id);
  // Quick log asks where it started from, unless the move only has one position.
  const [asking, setAsking] = useState<LogKind | null>(null);

  const log = (kind: LogKind, pos: string, side: Side | null) => {
    setAsking(null);
    const ups = logMoves(localDate(), [{ moveId: t.id, kind, pos, side }]);
    if (ups.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const quick = (kind: LogKind) => {
    if (options.length === 1) log(kind, options[0].pos, options[0].side);
    else { setAsking(a => (a === kind ? null : kind)); Haptics.selectionAsync(); }
  };
  const qbtn = (k: LogKind, label: string, fail = false) => (
    <Pressable key={k} onPress={() => quick(k)} style={({ pressed }) => [styles.qbtn, fail && styles.qbtnFail, (pressed || asking === k) && { backgroundColor: colors.brassSoft }]} accessibilityRole="button" accessibilityLabel={`Log ${KIND_LONG[k]} for today`} accessibilityState={{ expanded: asking === k }}>
      <Text style={[styles.qtext, fail && styles.qtextFail]}>{label}</Text>
    </Pressable>
  );
  // Most recently used position first, so the usual one is the first chip.
  const options = logOptions(t);
  const ordered = last ? [...options.filter(o => o.pos === last), ...options.filter(o => o.pos !== last)] : options;

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
      <Button label="See it on the map ›" kind="outline" onPress={() => router.navigate({ pathname: '/map', params: { start: lastPosition(progress, t.id) ?? t.from[0], focus: t.id } })} />

      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>{STAGES[s]}</Text><Pips stage={s} /></View>
        <Text style={styles.muted}>{nextStep(progress, t.id)}</Text>
        <Text style={styles.groupLabel}>Practice</Text>
        <View style={styles.qlog}>
          {qbtn('seen', '+ Seen')}
          {qbtn('drilled', '+ Drilled')}
        </View>
        <Text style={styles.groupLabel}>Live roll</Text>
        <View style={styles.qlog}>
          <Text style={styles.liveLabel}>Attacked</Text>
          {qbtn('landed', '✓ Landed')}
          {qbtn('missed', '✗ Missed', true)}
        </View>
        <View style={styles.qlog}>
          <Text style={styles.liveLabel}>Defended</Text>
          {qbtn('stopped', '✓ Stopped')}
          {qbtn('caught', '✗ Caught', true)}
        </View>
        {asking && (
          <View style={styles.ask}>
            <Text style={styles.askLabel}>{`${KIND_LABEL[asking]} from where?`}</Text>
            <View style={styles.posRow}>
              {ordered.map(({ pos: f, side }) => {
                // Which side you were on: the attacker's side, or the other one when defending.
                const a = side ?? attackSides(t, f)[0] ?? null;
                const mine: Side | null = a && (asking === 'stopped' || asking === 'caught') ? flipSide(a) : a;
                return (
                  <Pressable key={`${f}:${side}`} onPress={() => log(asking, f, side)} style={({ pressed }) => [styles.posChip, pressed && { backgroundColor: colors.brassSoft }]} accessibilityRole="button" accessibilityLabel={`${KIND_LONG[asking]} from ${positionById.get(f)!.name}${mine ? `, you on ${sideLabel(f, mine).toLowerCase()}` : ''}`}>
                    <Text style={styles.ink}>{positionById.get(f)!.name}</Text>
                    {mine && <Text style={styles.chipSide}>{sideLabel(f, mine)}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {today.length > 0 && (
          <View style={styles.todayRow}>
            <Text style={[styles.ink, { flex: 1 }]}>Today: {today.map(x => `${x.text}${x.pos ? ` from ${positionById.get(x.pos)?.name ?? x.pos}${x.side ? ` (${x.side})` : ''}` : ''}`).join('; ')}</Text>
            <Pressable onPress={() => clearToday(t.id)} hitSlop={10}><Text style={styles.link}>Undo today</Text></Pressable>
          </View>
        )}
        <View style={styles.daysRow} accessible accessibilityLabel={`Hit live on ${Math.min(st.hitDays, RULES.masterDays)} of ${RULES.masterDays} days`}>
          <View style={styles.dots}>
            {Array.from({ length: RULES.masterDays }, (_, i) => <View key={i} style={[styles.dot, i < st.hitDays && styles.dotOn]} />)}
          </View>
          <Text style={styles.muted}>Hit live on {Math.min(st.hitDays, RULES.masterDays)} of {RULES.masterDays} days</Text>
        </View>
        {st.lastHit && <Text style={[styles.muted, isRusty(st) && styles.rusty]}>{`Last hit live ${ago(st.lastHit)}${isRusty(st) ? '. Hit it again to keep it sharp.' : ''}`}</Text>}
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

      <SectionLabel>Live record</SectionLabel>
      <LiveBars rec={rec} empty="No live rolls logged yet. Use Attacked or Defended above after you roll." />

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

const rustyNote = (n: number) => `${n} move${n > 1 ? 's' : ''} here ${n > 1 ? "haven't" : "hasn't"} been hit live in ${Math.round(RUSTY_DAYS / 30)}+ months`;

/** Offense = landed of attempts; defense = stopped of times they tried it. */
function LiveBars({ rec, empty }: { rec: Live; empty: string }) {
  const att = rec.landed + rec.missed;
  const def = rec.stopped + rec.caught;
  if (!att && !def) return <Text style={styles.muted}>{empty}</Text>;
  return (
    <View style={styles.bars}>
      <Bar label="Offense" value={rec.landed} max={att} right={`${rec.landed}/${att}`} />
      <Text style={styles.barNote}>{att ? `Landed ${rec.landed} · Missed ${rec.missed}` : 'No attacks logged'}</Text>
      <Bar label="Defense" value={rec.stopped} max={def} right={`${rec.stopped}/${def}`} />
      <Text style={styles.barNote}>{def ? `Stopped ${rec.stopped} · Caught ${rec.caught}` : 'No defenses logged'}</Text>
    </View>
  );
}

function PositionEntry({ id, side: startSide }: { id: string; side?: Side }) {
  const router = useRouter();
  const { progress } = useProgress();
  const p = positionById.get(id)!;
  const sided = hasSides(id);
  const [side, setSide] = useState<Side>(() => startSide ?? mainSide(id));
  const cur = sided ? side : undefined;
  const rows = scorecard(progress, id, cur);
  const waysIn = sided ? scorecard(progress, id).find(r => r.label === 'Ways in') : undefined;
  const rec = positionRecord(progress, id, cur ?? null);
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
      <Button label="Map from here ›" kind="outline" onPress={() => router.navigate({ pathname: '/map', params: { start: id, ...(cur ? { side: cur } : {}) } })} />
      {sided && (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['bottom', 'top'] as Side[]).map(sd => (
            <Pressable key={sd} onPress={() => setSide(sd)} style={[styles.tab, side === sd && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: side === sd }}>
              <Text style={[styles.tabText, side === sd && { color: colors.bg }]}>{sideLabel(id, sd)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.box}>
        <View style={styles.boxHead}><Text style={styles.stage}>{cur ? `${sideLabel(id, cur)} scorecard` : 'Scorecard'}</Text><Text style={styles.small}>moves at Hit or better</Text></View>
        {rows.map(r => <Bar key={r.label} label={r.label} value={r.have} max={r.total} right={`${r.have}/${r.total}`} warn={active && !r.have && r.label !== 'Ways in'} />)}
        {rows.some(r => r.rusty) && <Text style={styles.rusty}>{rustyNote(rows.reduce((a, r) => a + r.rusty, 0))}</Text>}
        {!rows.length && <Text style={styles.muted}>No moves from this side in the dex yet. Defenses still count below.</Text>}
        {!active && <Text style={styles.muted}>Log any move from here to start tracking this position.</Text>}
        <SectionLabel>Live record</SectionLabel>
        <LiveBars rec={rec} empty={cur ? `Nothing logged from the ${sideLabel(id, cur).toLowerCase()} side yet.` : 'No live rolls logged here yet.'} />
        {waysIn && <><SectionLabel>Getting here</SectionLabel><Bar label="Ways in" value={waysIn.have} max={waysIn.total} right={`${waysIn.have}/${waysIn.total}`} /></>}
      </View>
      <FlowList posId={id} side={cur ?? null} />
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
  posChip: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 4, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
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
  boxHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: space.sm },
  stage: { color: colors.brass, fontSize: 18, fontWeight: '800' },
  small: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  ink: { color: colors.ink, fontSize: 14 },
  link: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
  qlog: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  groupLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  liveLabel: { width: 74, color: colors.ink, fontSize: 13, fontWeight: '600' },
  qbtnFail: { borderColor: colors.line },
  qtextFail: { color: colors.ink },
  chipSide: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  barNote: { color: colors.muted, fontSize: 12, marginLeft: 94, marginTop: -6 },
  tabs: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.brass },
  tabText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  qbtn: { flex: 1, minHeight: 46, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.brass, alignItems: 'center', justifyContent: 'center' },
  qtext: { color: colors.brass, fontSize: 14, fontWeight: '700' },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  baseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  baseBtn: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  baseOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  baseText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  bars: { gap: 10 },
  rusty: { color: colors.brass, fontSize: 13.5 },
});
