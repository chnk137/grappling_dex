import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Pips, TypeIcon } from '../../components/ui';
import { hasSides, positionById, positions, sideLabel, TIERS, TYPES, type Side, type Tier } from '../../data/catalog';
import { startSide } from '../../data/flow';
import { layoutFlowMap, type FlowMapLayout, type MapNode } from '../../data/flowMap';
import { posStage, splitKey, STAGES, type Progress } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors, radius, space, typeColor } from '../../theme';

// The Map tab: a skill-tree map that grows out from one side of one position. The
// moves you can do circle the start; moves that take you somewhere lead out to the
// positions you land in, each with its own fan of moves. Tap to select, "Start from
// here" to move on. (The whole map of every position was too much on a phone.)

const MIN_SCALE = 0.3, MAX_SCALE = 2.5, NEXT_LABEL_SCALE = 1.15;
const FONT = Platform.select({ web: '-apple-system, system-ui, sans-serif', default: undefined });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Start = { id: string; side: Side | null };
const startOf = (id: string, side?: string | null): Start => ({ id, side: side === 'top' || side === 'bottom' ? side : startSide(id) });
const placeName = (s: Start) => (s.side && hasSides(s.id) ? `${positionById.get(s.id)!.name} (${sideLabel(s.id, s.side).toLowerCase()})` : positionById.get(s.id)!.name);

/** The position you logged most recently, else closed guard. */
function latestPosition(p: Progress): string {
  for (let i = p.sessions.length - 1; i >= 0; i--) {
    const ks = Object.keys(p.sessions[i].items).map(splitKey).filter(k => k.pos && positionById.has(k.pos));
    if (ks.length) return ks[ks.length - 1].pos!;
  }
  return 'closed';
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ start?: string; side?: string; focus?: string }>();
  const { progress, stage } = useProgress();
  const [trail, setTrail] = useState<Start[]>(() => [startOf(params.start && positionById.has(params.start) ? params.start : latestPosition(progress), params.side)]);
  const [mine, setMine] = useState(false);
  const [sel, setSel] = useState<string | null>(params.focus ? `m:${params.focus}` : null);
  const [picking, setPicking] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [labels, setLabels] = useState(false);
  const cur = trail[trail.length - 1];

  // Opening from an entry ("Map from here") starts over from there.
  const pk = `${params.start}|${params.side}|${params.focus}`;
  const [lastParams, setLastParams] = useState(pk);
  if (pk !== lastParams) {
    setLastParams(pk);
    if (params.start && positionById.has(params.start)) { setTrail([startOf(params.start, params.side)]); setSel(params.focus ? `m:${params.focus}` : null); }
  }

  const layout = useMemo(
    () => layoutFlowMap(cur.id, cur.side, (t, at) => !mine || posStage(progress, t.id, at) >= 1),
    [cur.id, cur.side, mine, progress],
  );
  const byKey = useMemo(() => new Map(layout.nodes.map(n => [n.key, n])), [layout]);
  const selected = sel ? byKey.get(sel) ?? null : null;

  // View transform: screen = world × s + t. World origin is the start position.
  const s = useSharedValue(1), tx = useSharedValue(0), ty = useSharedValue(0);
  const view = useRef({ s: 1, tx: 0, ty: 0 });
  const movedAt = useRef(0);
  const sync = useCallback((ns: number, nx: number, ny: number, animate = false) => {
    view.current = { s: ns, tx: nx, ty: ny };
    if (animate) { s.set(withTiming(ns)); tx.set(withTiming(nx)); ty.set(withTiming(ny)); } else { s.set(ns); tx.set(nx); ty.set(ny); }
    setLabels(ns >= NEXT_LABEL_SCALE);
  }, [s, tx, ty]);
  const home = useCallback((animate: boolean, box = size) => {
    if (!box) return;
    // Open far enough out to see where the moves lead (ring 2), not just the moves.
    const extent = layout.nodes.some(n => n.kind === 'dest') ? layout.r2 + 50 : layout.r1 + 130;
    const k = clamp(Math.min(box.w, box.h) / (2 * extent), 0.5, 1);
    sync(k, box.w / 2, box.h / 2 - 30, animate);
  }, [size, layout, sync]);
  // A new start (or side) re-centres on it.
  useEffect(() => {
    const id = requestAnimationFrame(() => home(false));
    return () => cancelAnimationFrame(id);
  }, [cur.id, cur.side, home]);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!size || size.w !== w || size.h !== h) { setSize({ w, h }); home(false, { w, h }); }
  };
  const zoomBy = useCallback((f: number, fx: number, fy: number, animate = false) => {
    const v = view.current, ns = clamp(v.s * f, MIN_SCALE, MAX_SCALE), k = ns / v.s;
    sync(ns, fx - (fx - v.tx) * k, fy - (fy - v.ty) * k, animate);
  }, [sync]);

  const pan = usePanGesture({ runOnJS: true, minDistance: 4, onUpdate: e => { movedAt.current = Date.now(); const v = view.current; sync(v.s, v.tx + e.changeX, v.ty + e.changeY); } });
  const pinch = usePinchGesture({ runOnJS: true, onUpdate: e => { movedAt.current = Date.now(); zoomBy(e.scaleChange, e.focalX, e.focalY); } });
  const tap = useTapGesture({
    runOnJS: true, maxDistance: 10,
    onActivate: e => {
      if (Date.now() - movedAt.current < 300) return; // the end of a drag or pinch isn't a tap
      const v = view.current, wx = (e.x - v.tx) / v.s, wy = (e.y - v.ty) / v.s;
      let best: MapNode | null = null, bestD = Infinity;
      for (const n of layout.nodes) {
        const r = (n.kind === 'root' ? 36 : n.kind === 'dest' ? 26 : n.kind === 'move' ? 17 : 13) + 6 / v.s;
        const d = Math.hypot(n.x - wx, n.y - wy);
        if (d < r && d < bestD) { best = n; bestD = d; }
      }
      if (best) Haptics.selectionAsync();
      setSel(best ? best.key : null);
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch, tap);
  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }] }));

  const startFrom = (id: string, side: Side | null) => { Haptics.selectionAsync(); setTrail(t => [...t.filter(x => x.id !== id || x.side !== side), { id, side }]); setSel(null); };
  const flip = (side: Side) => { setTrail(t => [...t.slice(0, -1), { ...cur, side }]); setSel(null); };
  const openEntry = (id: string, side?: Side | null) => router.push({ pathname: '/entry/[id]', params: { id, ...(side ? { side } : {}) } });

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Pressable onPress={() => setPicking(true)} style={styles.startBtn} accessibilityRole="button" accessibilityLabel={`Starting from ${placeName(cur)}. Change`}>
            <Text style={styles.startLabel}>FROM</Text>
            <Text style={styles.startName} numberOfLines={1}>{positionById.get(cur.id)!.name}</Text>
            <Text style={styles.caret}>▾</Text>
          </Pressable>
          <Pressable onPress={() => setMine(m => !m)} style={[styles.mine, mine && styles.mineOn]} accessibilityRole="switch" accessibilityState={{ checked: mine }}>
            <Text style={[styles.mineText, mine && { color: colors.bg }]}>{mine ? '✓ My game' : 'My game'}</Text>
          </Pressable>
        </View>
        {cur.side && (
          <View style={styles.sides} accessibilityRole="tablist">
            {(['bottom', 'top'] as Side[]).map(sd => (
              <Pressable key={sd} onPress={() => flip(sd)} style={[styles.sideBtn, cur.side === sd && styles.sideOn]} accessibilityRole="tab" accessibilityState={{ selected: cur.side === sd }}>
                <Text style={[styles.sideText, cur.side === sd && { color: colors.bg }]}>{sideLabel(cur.id, sd)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {trail.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trail}>
            {trail.map((t, i) => (
              <View key={`${t.id}:${t.side}`} style={styles.crumbWrap}>
                {i > 0 && <Text style={styles.crumbSep}>›</Text>}
                <Pressable onPress={() => { setTrail(tr => tr.slice(0, i + 1)); setSel(null); }} hitSlop={6}>
                  <Text style={[styles.crumb, i === trail.length - 1 && styles.crumbOn]}>{placeName(t)}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <View style={styles.board} onLayout={onLayout} accessibilityLabel={`Map from ${placeName(cur)}. Drag to move, pinch to zoom, tap a circle to select it.`}>
          <Animated.View style={[styles.world, worldStyle]}>
            <World layout={layout} progress={progress} sel={selected} labels={labels} rootName={positionById.get(cur.id)!.name} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.tools}>
        <Tool label="+" a11y="Zoom in" onPress={() => size && zoomBy(1.4, size.w / 2, size.h / 2, true)} />
        <Tool label="−" a11y="Zoom out" onPress={() => size && zoomBy(1 / 1.4, size.w / 2, size.h / 2, true)} />
        <Tool label="◎" a11y="Back to the start" onPress={() => home(true)} />
      </View>
      </View>

      {selected ? (
        <Card node={selected} root={cur} progress={progress} stage={stage} layout={layout}
          onClose={() => setSel(null)} onOpen={openEntry} onStart={startFrom} />
      ) : (
        <Text style={styles.hint} pointerEvents="none">{labels || !layout.nodes.some(n => n.kind === 'next') ? 'Tap a circle to see it' : 'Pinch or tap + to read the outer moves'}</Text>
      )}

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <View style={[styles.picker, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.pickHead}>
            <Text style={styles.pickTitle}>Start from</Text>
            <Pressable onPress={() => setPicking(false)} hitSlop={12} accessibilityLabel="Close"><Text style={styles.x}>✕</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
            {(Object.keys(TIERS) as Tier[]).map(tier => {
              const ps = positions.filter(p => p.tier === tier);
              return ps.length ? (
                <View key={tier} style={{ gap: 6 }}>
                  <Text style={styles.pickTier}>{TIERS[tier]}</Text>
                  <View style={styles.pickChips}>
                    {ps.map(p => (
                      <Pressable key={p.id} onPress={() => { setTrail([startOf(p.id)]); setSel(null); setPicking(false); }} style={({ pressed }) => [styles.pickChip, p.id === cur.id && styles.pickOn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                        <Text style={[styles.pickText, p.id === cur.id && { color: colors.bg }]}>{p.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null;
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Tool({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tool, pressed && { backgroundColor: colors.line }]} accessibilityRole="button" accessibilityLabel={a11y}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

/** What's selected, and what you can do with it. */
function Card({ node, root, progress, stage, layout, onClose, onOpen, onStart }: {
  node: MapNode; root: Start; progress: Progress; stage: (id: string) => number; layout: FlowMapLayout;
  onClose: () => void; onOpen: (id: string, side?: Side | null) => void; onStart: (id: string, side: Side | null) => void;
}) {
  let title = '', sub = '';
  let icon = <TypeIcon type="position" size={14} />;
  const actions: { label: string; primary?: boolean; run: () => void }[] = [];
  if (node.kind === 'root') {
    title = placeName(root);
    sub = 'Where this map starts. Tap a circle to see a move or where it leads.';
    actions.push({ label: 'Open position ›', primary: true, run: () => onOpen(root.id, root.side) });
  } else if (node.kind === 'dest') {
    const p = node.pos!;
    title = placeName({ id: p.id, side: node.side ?? null });
    const via = layout.nodes.filter(n => n.kind === 'move' && n.t!.to === p.id).map(n => n.t!.name);
    sub = `You land here via ${via.join(', ')}.`;
    actions.push({ label: 'Start from here ›', primary: true, run: () => onStart(p.id, node.side ?? null) });
    actions.push({ label: 'Open position', run: () => onOpen(p.id, node.side) });
  } else {
    const t = node.t!, at = node.at!;
    icon = <TypeIcon type={t.type} size={14} />;
    title = t.name;
    const here = posStage(progress, t.id, at);
    sub = `${TYPES[t.type].label} from ${positionById.get(at)!.name} · ${STAGES[here]}${t.to ? ` · leads to ${positionById.get(t.to)!.name}` : t.type === 'sub' ? ' · 🏁 finishes it' : ''}`;
    actions.push({ label: 'Open move ›', primary: !t.to, run: () => onOpen(t.id) });
    if (t.to) {
      const dest = layout.nodes.find(n => n.kind === 'dest' && n.pos!.id === t.to);
      actions.unshift({ label: `Go to ${positionById.get(t.to)!.name} ›`, primary: true, run: () => onStart(t.to!, dest?.side ?? startSide(t.to!)) });
    }
  }
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        {icon}
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        {node.t && <Pips stage={stage(node.t.id)} />}
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><Text style={styles.x}>✕</Text></Pressable>
      </View>
      <Text style={styles.cardSub}>{sub}</Text>
      <View style={styles.cardActions}>
        {actions.map(a => (
          <Pressable key={a.label} onPress={a.run} style={({ pressed }) => [styles.act, a.primary && styles.actPrimary, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Text style={[styles.actText, a.primary && { color: colors.bg }]} numberOfLines={1}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Text with a dark outline underneath so it reads over the tracks. */
function Label({ x, y, anchor, size, bold, color, text }: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; size: number; bold?: boolean; color: string; text: string }) {
  const common = { x, y, textAnchor: anchor, fontSize: size, fontFamily: FONT, fontWeight: bold ? ('700' as const) : ('500' as const) };
  return (
    <>
      <SvgText {...common} fill={colors.bg} stroke={colors.bg} strokeWidth={size / 3.2} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={color}>{text}</SvgText>
    </>
  );
}

const World = memo(function World({ layout, progress, sel, labels, rootName }: { layout: FlowMapLayout; progress: Progress; sel: MapNode | null; labels: boolean; rootName: string }) {
  const R = layout.radius + 120;
  const stageAt = (n: MapNode) => (n.t && n.at ? posStage(progress, n.t.id, n.at) : 0);
  // With a selection, light its path: a move and where it leads, a destination and its moves.
  const lit = (n: MapNode): boolean => {
    if (!sel || sel.kind === 'root' || n.key === sel.key || n.kind === 'root') return true;
    if (sel.kind === 'move') return n.kind === 'dest' && n.pos!.id === sel.t!.to;
    if (sel.kind === 'dest') return n.parent === sel.key || (n.kind === 'move' && n.t!.to === sel.pos!.id);
    if (sel.kind === 'next') return n.key === sel.parent;
    return false;
  };
  return (
    <Svg width={2 * R} height={2 * R} viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} style={{ position: 'absolute', left: -R, top: -R }}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1d2a52" /><Stop offset="0.55" stopColor="#0e1428" /><Stop offset="1" stopColor="#070a14" />
        </RadialGradient>
        <RadialGradient id="core" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#fff6dc" /><Stop offset="0.4" stopColor={colors.brass} /><Stop offset="1" stopColor="#8a6a2e" />
        </RadialGradient>
      </Defs>
      <Rect x={-R} y={-R} width={2 * R} height={2 * R} fill="url(#glow)" />
      {/* Tracks: a double ring for the moves around the start, a faint ring where you land. */}
      <Circle cx={0} cy={0} r={layout.r1 - 5} fill="none" stroke="#2c3a66" strokeWidth={1.5} />
      <Circle cx={0} cy={0} r={layout.r1 + 5} fill="none" stroke="#2c3a66" strokeWidth={1.5} />
      <Circle cx={0} cy={0} r={layout.r2} fill="none" stroke="#1f2a4a" strokeWidth={1.2} strokeDasharray="3 7" />

      {layout.edges.map(e => {
        const on = !sel || (lit(e.from) && lit(e.to));
        const c = e.to.t ? typeColor(e.to.t.type) : e.from.t ? typeColor(e.from.t.type) : colors.brass;
        if (e.kind === 'lead') {
          // Curve out from the move toward where it lands.
          const mr = (Math.hypot(e.from.x, e.from.y) + Math.hypot(e.to.x, e.to.y)) / 2;
          const cx = Math.cos(e.from.angle) * mr, cy = Math.sin(e.from.angle) * mr;
          return <Path key={e.key} d={`M${e.from.x},${e.from.y} Q${cx},${cy} ${e.to.x},${e.to.y}`} fill="none" stroke={c} strokeWidth={2.2} strokeOpacity={on ? 0.75 : 0.1} />;
        }
        return <Line key={e.key} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke={c} strokeWidth={e.kind === 'spoke' ? 1.6 : 1.3} strokeOpacity={on ? (e.kind === 'spoke' ? 0.45 : 0.35) : 0.07} />;
      })}

      {layout.nodes.map(n => {
        const on = lit(n);
        const picked = sel?.key === n.key;
        if (n.kind === 'root') {
          return (
            <G key={n.key}>
              <Circle cx={0} cy={0} r={44} fill="none" stroke={colors.brass} strokeOpacity={0.35} strokeWidth={8} />
              <Circle cx={0} cy={0} r={32} fill="url(#core)" stroke="#fff6dc" strokeWidth={picked ? 3 : 1.5} />
              <Label x={0} y={66} anchor="middle" size={19} bold color={colors.ink} text={rootName} />
            </G>
          );
        }
        if (n.kind === 'dest') {
          const below = Math.sin(n.angle) >= -0.2;
          return (
            <G key={n.key} opacity={on ? 1 : 0.25}>
              {picked && <Circle cx={n.x} cy={n.y} r={30} fill="none" stroke={colors.brass} strokeWidth={2.5} />}
              <Circle cx={n.x} cy={n.y} r={22} fill="#141c34" stroke={colors.brass} strokeWidth={2.5} />
              <Circle cx={n.x} cy={n.y} r={13} fill={colors.brass} fillOpacity={0.35} />
              <Label x={n.x} y={n.y + (below ? 44 : -33)} anchor="middle" size={17} bold color={colors.ink}
                text={placeName({ id: n.pos!.id, side: n.side ?? null })} />
            </G>
          );
        }
        const st = stageAt(n);
        const c = typeColor(n.t!.type);
        const r = n.kind === 'move' ? 12 : 8.5;
        const cos = Math.cos(n.angle), sin = Math.sin(n.angle);
        const showLabel = n.kind === 'move' || labels || (!!sel && on);
        return (
          <G key={n.key} opacity={on ? 1 : 0.22}>
            {picked && <Circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke={c} strokeWidth={2} />}
            {/* Finishes (submissions with nowhere to go) get a dashed outer ring. */}
            {n.finishes && n.t!.type === 'sub' && <Circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke={c} strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.8} />}
            <Circle cx={n.x} cy={n.y} r={r} fill={st >= 2 ? c : '#0c1222'} stroke={c} strokeWidth={st >= 1 ? 2.2 : 1.5} strokeOpacity={st >= 1 ? 1 : 0.7} />
            {st >= 3 && <Circle cx={n.x} cy={n.y} r={r * 0.32} fill="#fff" fillOpacity={0.9} />}
            {showLabel && (
              <Label x={n.x + (cos >= 0 ? r + 5 : -(r + 5))} y={n.y + 4 + sin * (Math.abs(cos) < 0.35 ? 7 : 0)} anchor={cos >= 0 ? 'start' : 'end'}
                size={n.kind === 'move' ? 15 : 12.5} color={st ? colors.ink : '#b8c0d6'} text={n.t!.name} />
            )}
          </G>
        );
      })}
    </Svg>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070a14' },
  bar: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm, backgroundColor: colors.bg2, borderBottomWidth: 1, borderBottomColor: colors.line },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.brassSoft },
  startLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  startName: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  caret: { color: colors.brass, fontSize: 14 },
  mine: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line },
  mineOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  mineText: { color: colors.brass, fontSize: 13, fontWeight: '700' },
  sides: { flexDirection: 'row', borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  sideBtn: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  sideOn: { backgroundColor: colors.brass },
  sideText: { color: colors.ink, fontSize: 13.5, fontWeight: '700' },
  trail: { alignItems: 'center', gap: 4 },
  crumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crumbSep: { color: colors.muted, fontSize: 13 },
  crumb: { color: colors.muted, fontSize: 12.5, textDecorationLine: 'underline' },
  crumbOn: { color: colors.brass, fontWeight: '700', textDecorationLine: 'none' },
  board: { flex: 1, overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, transformOrigin: '0 0', overflow: 'visible' },
  tools: { position: 'absolute', right: space.sm, top: space.sm, gap: 8 },
  tool: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,27,44,0.92)', borderWidth: 1, borderColor: colors.line },
  toolText: { color: colors.brass, fontSize: 19, fontWeight: '700', marginTop: -1 },
  hint: { position: 'absolute', left: space.md, bottom: space.md, color: colors.muted, fontSize: 12 },
  card: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, padding: space.md, gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(20,27,44,0.97)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '700' },
  cardSub: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  act: { flex: 1, minHeight: 42, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.brass, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  actPrimary: { backgroundColor: colors.brass },
  actText: { color: colors.brass, fontSize: 14, fontWeight: '700' },
  x: { color: colors.muted, fontSize: 16 },
  picker: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: space.md },
  pickHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickTitle: { color: colors.brass, fontSize: 20, fontWeight: '800' },
  pickTier: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  pickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickChip: { minHeight: 38, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  pickOn: { backgroundColor: colors.brass, borderColor: colors.brass },
  pickText: { color: colors.ink, fontSize: 14 },
});
