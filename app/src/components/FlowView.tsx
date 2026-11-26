// "Map from here": a focused flow from one dex entry instead of the whole web.
// A position is shown from one side (bottom or top): the moves you attack with from
// there, grouped by type; each either finishes there (🏁) or leaves you somewhere
// (and on a side), which you can open inline (step 3) or start from.
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { hasSides, isPosition, nameOf, positionById, sideLabel, techniqueById, TIERS, TYPES, type Side } from '../data/catalog';
import { destinationsOf, flowFrom, landingSide, startSide, startsFrom, type Destination, type FlowMove } from '../data/flow';
import { posStage, stageOf } from '../lib/progress';
import { useProgress } from '../lib/store';
import { colors, radius, space } from '../theme';
import { Pips, SectionLabel, TypeIcon } from './ui';

/** A step in the flow: an entry, and for positions the side you're on. */
type Step = { id: string; side: Side | null };
const stepOf = (id: string, side?: Side | null): Step => ({ id, side: isPosition(id) ? (side !== undefined ? side : startSide(id)) : null });
const label = (s: Step) => (s.side && hasSides(s.id) ? `${nameOf(s.id)} (${sideLabel(s.id, s.side).toLowerCase()})` : nameOf(s.id));
const same = (a: Step, b: Step) => a.id === b.id && a.side === b.side;

export function FlowView({ startId, startSide: firstSide, onOpenEntry }: { startId: string; startSide?: Side | null; onOpenEntry: (id: string) => void }) {
  const [trail, setTrail] = useState<Step[]>([stepOf(startId, firstSide)]);
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // destination expanded inline
  // Starting somewhere new (e.g. another entry's "Map from here") resets the trail.
  const [lastStart, setLastStart] = useState(startId);
  if (startId !== lastStart) { setLastStart(startId); setTrail([stepOf(startId, firstSide)]); setOpen(null); }

  const root = trail[trail.length - 1];
  const scroller = useRef<ScrollViewInstance>(null);
  const top = () => scroller.current?.scrollTo({ y: 0, animated: false });
  const go = (id: string, side?: Side | null) => {
    Haptics.selectionAsync();
    const s = stepOf(id, side);
    setTrail(t => [...t.filter(x => !same(x, s)), s]); setOpen(null); top();
  };
  const back = (i: number) => { setTrail(t => t.slice(0, i + 1)); setOpen(null); top(); };
  // Flipping sides swaps the current step rather than adding one to the trail.
  const flip = (side: Side) => { setTrail(t => [...t.slice(0, -1), { ...root, side }]); setOpen(null); };

  return (
    <ScrollView ref={scroller} contentContainerStyle={styles.body}>
      {trail.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trail}>
          {trail.map((s, i) => (
            <View key={`${s.id}:${s.side}`} style={styles.crumbWrap}>
              {i > 0 && <Text style={styles.crumbSep}>›</Text>}
              <Pressable onPress={() => back(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Back to ${label(s)}`}>
                <Text style={[styles.crumb, i === trail.length - 1 && styles.crumbOn]}>{label(s)}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setMine(m => !m)} style={[styles.toggle, mine && styles.toggleOn]} accessibilityRole="switch" accessibilityState={{ checked: mine }}>
          <Text style={[styles.toggleText, mine && { color: colors.bg }]}>{mine ? '✓ My game only' : 'My game only'}</Text>
        </Pressable>
        <Text style={styles.small}>{mine ? 'Only moves you’ve logged' : 'Everything in the dex'}</Text>
      </View>
      {isPosition(root.id)
        ? <PositionFlow step={root} mine={mine} open={open} setOpen={setOpen} go={go} flip={flip} onOpenEntry={onOpenEntry} />
        : <MoveFlow step={root} mine={mine} open={open} setOpen={setOpen} go={go} flip={flip} onOpenEntry={onOpenEntry} />}
    </ScrollView>
  );
}

type FlowProps = {
  step: Step; mine: boolean; open: string | null; setOpen: (k: string | null) => void;
  go: (id: string, side?: Side | null) => void; flip: (side: Side) => void; onOpenEntry: (id: string) => void;
};

function PositionFlow({ step, mine, open, setOpen, go, flip, onOpenEntry }: FlowProps) {
  const { progress } = useProgress();
  const id = step.id;
  const p = positionById.get(id)!;
  const st = (m: FlowMove) => posStage(progress, m.t.id, id);
  const groups = flowFrom(id, step.side).map(g => ({ ...g, moves: mine ? g.moves.filter(m => st(m) >= 1) : g.moves })).filter(g => g.moves.length);
  const dests = destinationsOf(groups.flatMap(g => g.moves));

  return (
    <>
      <RootCard kind={step.side ? 'Position' : `Position · ${TIERS[p.tier]}`} name={p.name} onOpen={() => onOpenEntry(id)} />
      {step.side && (
        <View style={styles.sides} accessibilityRole="tablist">
          {(['bottom', 'top'] as Side[]).map(sd => (
            <Pressable key={sd} onPress={() => flip(sd)} style={[styles.sideBtn, step.side === sd && styles.sideOn]} accessibilityRole="tab" accessibilityState={{ selected: step.side === sd }}>
              <Text style={[styles.sideText, step.side === sd && { color: colors.bg }]}>{sideLabel(id, sd)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!groups.length && <Text style={styles.muted}>{mine ? 'Nothing logged from this side yet. Turn off “My game only” to see every move.' : 'No moves from this side in the dex yet.'}</Text>}
      {groups.map(g => (
        <View key={g.type} style={styles.group}>
          <SectionLabel>{`${g.label} (${g.moves.length})${g.moves.every(m => !m.to) ? ' · 🏁 finish here' : ''}`}</SectionLabel>
          {/* Moves that all finish here are compact chips; ones that lead somewhere get a row with their arrow. */}
          {g.moves.every(m => !m.to) ? (
            <View style={styles.chips}>
              {g.moves.map(m => (
                <Pressable key={m.t.id} onPress={() => go(m.t.id)} style={({ pressed }) => [styles.chip, styles.chipBig, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${m.t.name}, start from here`}>
                  <TypeIcon type={m.t.type} size={10} />
                  <Text style={styles.chipText}>{m.t.name}</Text>
                  <Pips stage={st(m)} />
                </Pressable>
              ))}
            </View>
          ) : g.moves.map(m => (
            <View key={m.t.id} style={styles.row}>
              <Pressable onPress={() => go(m.t.id)} style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${m.t.name}, start from here`}>
                <TypeIcon type={m.t.type} size={12} />
                <Text style={styles.name} numberOfLines={1}>{m.t.name}</Text>
                <Pips stage={st(m)} />
              </Pressable>
              {m.to
                ? <Pressable onPress={() => go(m.to!.id, m.toSide)} style={({ pressed }) => [styles.dest, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Leads to ${label({ id: m.to.id, side: m.toSide })}`}>
                    <Text style={styles.arrow}>→</Text><Text style={styles.destText} numberOfLines={2}>{m.to.name}</Text>
                  </Pressable>
                : m.t.type === 'sub'
                  ? <Text style={styles.finish} accessibilityLabel="Finishes here">🏁</Text>
                  : <Text style={[styles.finish, styles.noDest]} accessibilityLabel="Doesn't lead to a set position">—</Text>}
            </View>
          ))}
        </View>
      ))}
      {dests.length > 0 && (
        <View style={styles.group}>
          <SectionLabel>Where these lead</SectionLabel>
          {dests.map(d => {
            const k = `${d.pos.id}:${d.side}`;
            return <DestRow key={k} d={d} mine={mine} open={open === k} toggle={() => setOpen(open === k ? null : k)} go={go} />;
          })}
        </View>
      )}
    </>
  );
}

function MoveFlow({ step, mine, open, setOpen, go, onOpenEntry }: FlowProps) {
  const { progress } = useProgress();
  const id = step.id;
  const t = techniqueById.get(id)!;
  const from = startsFrom(t).filter(f => !mine || posStage(progress, id, f.pos.id) >= 1);
  const to = t.to ? positionById.get(t.to) : null;
  const d: Destination | null = to ? { pos: to, side: landingSide(t), via: [t] } : null;
  return (
    <>
      <RootCard kind={TYPES[t.type].label} name={t.name} stage={stageOf(progress, id)} onOpen={() => onOpenEntry(id)} icon={<TypeIcon type={t.type} size={14} />} />
      <View style={styles.group}>
        <SectionLabel>{`Starts from (${from.length})`}</SectionLabel>
        {!from.length && <Text style={styles.muted}>Not logged from any position yet.</Text>}
        {from.map(f => (
          <Pressable key={`${f.pos.id}:${f.side}`} onPress={() => go(f.pos.id, f.side)} style={({ pressed }) => [styles.row, styles.rowMain, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${label({ id: f.pos.id, side: f.side })}, start from here`}>
            <TypeIcon type="position" size={12} />
            <Text style={styles.name} numberOfLines={1}>{label({ id: f.pos.id, side: f.side })}</Text>
            <Pips stage={posStage(progress, id, f.pos.id)} />
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.group}>
        <SectionLabel>Leads to</SectionLabel>
        {d ? <DestRow d={d} mine={mine} open={open === d.pos.id} toggle={() => setOpen(open === d.pos.id ? null : d.pos.id)} go={go} />
          : <Text style={styles.muted}>{t.type === 'sub' ? '🏁 It finishes the fight.' : 'It doesn’t lead to a set position.'}</Text>}
      </View>
    </>
  );
}

/** Where you end up (and on which side): tap the name to start from there, the button to see its moves (step 3). */
function DestRow({ d, mine, open, toggle, go }: { d: Destination; mine: boolean; open: boolean; toggle: () => void; go: (id: string, side?: Side | null) => void }) {
  const { progress } = useProgress();
  const moves = flowFrom(d.pos.id, d.side).flatMap(g => g.moves).filter(m => !mine || posStage(progress, m.t.id, d.pos.id) >= 1);
  const name = label({ id: d.pos.id, side: d.side });
  return (
    <View style={styles.destCard}>
      <View style={styles.destHead}>
        <Pressable onPress={() => go(d.pos.id, d.side)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${name}, start from here`}>
          <Text style={styles.destName}>{name}</Text>
          <Text style={styles.small} numberOfLines={2}>via {d.via.map(t => t.name).join(', ')}</Text>
        </Pressable>
        <Pressable onPress={toggle} hitSlop={8} style={styles.expand} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${open ? 'Hide' : 'Show'} ${moves.length} moves from ${name}`}>
          <Text style={styles.expandText}>{`${moves.length} moves ${open ? '▾' : '▸'}`}</Text>
        </Pressable>
      </View>
      {open && (
        <View style={styles.chips}>
          {moves.map(m => (
            <Pressable key={m.t.id} onPress={() => go(m.t.id)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} accessibilityRole="button">
              <TypeIcon type={m.t.type} size={10} />
              <Text style={styles.chipText}>{m.t.name}</Text>
              <Text style={styles.chipTo}>{m.to ? `→ ${m.to.name}` : m.t.type === 'sub' ? '🏁' : ''}</Text>
            </Pressable>
          ))}
          {!moves.length && <Text style={styles.muted}>Nothing logged from here yet.</Text>}
        </View>
      )}
    </View>
  );
}

function RootCard({ kind, name, stage, onOpen, icon }: { kind: string; name: string; stage?: number; onOpen: () => void; icon?: React.ReactNode }) {
  return (
    <View style={styles.rootCard}>
      <Text style={styles.kind}>{kind}</Text>
      <View style={styles.rootHead}>
        {icon ?? <TypeIcon type="position" size={14} />}
        <Text style={styles.rootName}>{name}</Text>
        {stage !== undefined && <Pips stage={stage} />}
      </View>
      <Pressable onPress={onOpen} hitSlop={8} accessibilityRole="link"><Text style={styles.link}>Open entry ›</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  trail: { alignItems: 'center', gap: 4 },
  crumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crumbSep: { color: colors.muted, fontSize: 14 },
  crumb: { color: colors.muted, fontSize: 13.5, textDecorationLine: 'underline' },
  crumbOn: { color: colors.brass, fontWeight: '700', textDecorationLine: 'none' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  toggle: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.brass, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.brass },
  toggleText: { color: colors.brass, fontSize: 13, fontWeight: '700' },
  sides: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  sideBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  sideOn: { backgroundColor: colors.brass },
  sideText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  rootCard: { padding: space.md, gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.brassSoft },
  kind: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  rootHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rootName: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: '800' },
  link: { color: colors.brass, fontSize: 14, fontWeight: '600' },
  group: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  pressed: { backgroundColor: colors.line },
  name: { flex: 1, color: colors.ink, fontSize: 15 },
  dest: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 132, minHeight: 44, paddingHorizontal: 6, borderRadius: radius.sm },
  arrow: { color: colors.brass, fontSize: 16, fontWeight: '700' },
  destText: { color: colors.brass, fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  finish: { width: 132, textAlign: 'center', fontSize: 16 },
  noDest: { color: colors.muted },
  destCard: { padding: space.md, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  destHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  destName: { color: colors.ink, fontSize: 17, fontWeight: '700', textDecorationLine: 'underline' },
  expand: { paddingHorizontal: 10, minHeight: 34, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  expandText: { color: colors.brass, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  chipText: { color: colors.ink, fontSize: 13 },
  chipBig: { minHeight: 40, gap: 7 },
  chipTo: { color: colors.muted, fontSize: 12 },
  small: { color: colors.muted, fontSize: 12 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
