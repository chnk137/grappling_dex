import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { FlowView } from '../../components/FlowView';
import { Pips, TypeIcon } from '../../components/ui';
import { positionActive, TYPES } from '../../data/catalog';
import { hitTest, hubById, hubs, links, sats, WORLD, type Hub, type Sat } from '../../data/mapLayout';
import { posStage, splitKey, STAGES, type Progress } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors, radius, space, typeColor } from '../../theme';

const MIN_SCALE = 0.25, MAX_SCALE = 2.5;
/** Move names show from this zoom on (they're unreadable further out). */
const LABEL_SCALE = 1.3;
const START_SCALE = 1.05;
// SVG text on web falls back to a serif font unless told otherwise.
const FONT = Platform.select({ web: '-apple-system, system-ui, sans-serif', default: undefined });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Box = { x0: number; y0: number; x1: number; y1: number };
type Selection = { kind: 'move'; id: string; at: string } | { kind: 'position'; id: string } | null;

/** The position you logged most recently, else closed guard. */
function startHub(p: Progress): Hub {
  for (let i = p.sessions.length - 1; i >= 0; i--) {
    const ks = Object.keys(p.sessions[i].items).map(splitKey).filter(k => k.pos && hubById.has(k.pos));
    if (ks.length) return hubById.get(ks[ks.length - 1].pos!)!;
  }
  return hubById.get('closed')!;
}

type Mode = 'flow' | 'whole';

/** The Map tab: a focused "from here" flow by default, or the whole ring map. */
export default function MapScreen() {
  const router = useRouter();
  const { progress } = useProgress();
  const [mode, setMode] = useState<Mode>('flow');
  const start = useMemo(() => startHub(progress).p.id, [progress]);
  return (
    <View style={styles.root}>
      <View style={styles.modeBar} accessibilityRole="tablist">
        {(['flow', 'whole'] as Mode[]).map(m => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeBtn, mode === m && styles.modeOn]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
            <Text style={[styles.modeText, mode === m && { color: colors.bg }]}>{m === 'flow' ? 'From here' : 'Whole map'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'flow'
        ? <FlowView startId={start} onOpenEntry={id => router.push({ pathname: '/entry/[id]', params: { id } })} />
        : <WholeMap />}
    </View>
  );
}

function WholeMap() {
  const router = useRouter();
  const { progress, stage } = useProgress();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [labels, setLabels] = useState(false);
  const [sel, setSel] = useState<Selection>(null);
  // The part of the world on screen, updated when a gesture ends. Move names are only
  // drawn there: SVG text is slow on iOS, and drawing all 243 made zooming lag.
  const [vis, setVis] = useState<Box | null>(null);

  // Screen point = world point × scale + translate (transform origin at the top left).
  const s = useSharedValue(START_SCALE);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const view = useRef({ s: START_SCALE, tx: 0, ty: 0 }); // JS-side copy, for taps
  // When the map last moved under a finger: a tap right after a drag or pinch is part of it, not a tap.
  const movedAt = useRef(0);
  const sync = useCallback((ns: number, nx: number, ny: number, animate = false) => {
    view.current = { s: ns, tx: nx, ty: ny };
    if (animate) { s.set(withTiming(ns)); tx.set(withTiming(nx)); ty.set(withTiming(ny)); }
    else { s.set(ns); tx.set(nx); ty.set(ny); }
    setLabels(ns >= LABEL_SCALE);
  }, [s, tx, ty]);
  const settle = useCallback((box = size) => {
    if (!box) return;
    const v = view.current, m = 160; // margin so a short drag doesn't reveal unnamed moves
    setVis({ x0: -v.tx / v.s - m, y0: -v.ty / v.s - m, x1: (box.w - v.tx) / v.s + m, y1: (box.h - v.ty) / v.s + m });
  }, [size]);

  const centerOn = useCallback((x: number, y: number, scale: number, animate: boolean, box = size) => {
    if (!box) return;
    sync(scale, box.w / 2 - x * scale, box.h / 2 - y * scale, animate);
    settle(box);
  }, [size, sync, settle]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    const first = !size;
    setSize({ w, h });
    if (first) { const hub = startHub(progress); centerOn(hub.x, hub.y, START_SCALE, false, { w, h }); }
  };

  const zoomBy = useCallback((factor: number, fx: number, fy: number, animate = false) => {
    const v = view.current;
    const ns = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
    const k = ns / v.s;
    sync(ns, fx - (fx - v.tx) * k, fy - (fy - v.ty) * k, animate);
    if (animate) settle();
  }, [sync, settle]);

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onUpdate: e => { movedAt.current = Date.now(); const v = view.current; sync(v.s, v.tx + e.changeX, v.ty + e.changeY); },
    onDeactivate: () => settle(),
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onUpdate: e => { movedAt.current = Date.now(); zoomBy(e.scaleChange, e.focalX, e.focalY); },
    onDeactivate: () => settle(),
  });
  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: 10, // a drag or pinch isn't a tap
    onActivate: e => {
      if (Date.now() - movedAt.current < 300) return;
      const v = view.current;
      const hit = hitTest((e.x - v.tx) / v.s, (e.y - v.ty) / v.s, v.s);
      if (!hit) { setSel(null); return; }
      Haptics.selectionAsync();
      if (hit.sat) setSel({ kind: 'move', id: hit.sat.t.id, at: hit.sat.hub.p.id });
      else if (hit.hub) setSel({ kind: 'position', id: hit.hub.p.id });
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch, tap);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }],
  }));

  const open = () => sel && router.push({ pathname: '/entry/[id]', params: { id: sel.id } });
  const recenter = () => { const hub = startHub(progress); centerOn(hub.x, hub.y, START_SCALE, true); };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={styles.board} onLayout={onLayout} accessibilityLabel="Map of positions and moves. Drag to move around, pinch to zoom, tap a circle to select it.">
          <Animated.View style={[styles.world, worldStyle]}>
            <World progress={progress} labels={labels} sel={sel} vis={vis} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.tools}>
        <ToolButton label="+" a11y="Zoom in" onPress={() => size && zoomBy(1.4, size.w / 2, size.h / 2, true)} />
        <ToolButton label="−" a11y="Zoom out" onPress={() => size && zoomBy(1 / 1.4, size.w / 2, size.h / 2, true)} />
        <ToolButton label="◎" a11y="Back to your latest position" onPress={recenter} />
      </View>
      {!labels && !sel && <Text style={styles.hint} pointerEvents="none">Pinch or tap + to read move names</Text>}

      {sel && <SelectionCard sel={sel} progress={progress} stage={stage} onOpen={open} onClose={() => setSel(null)} />}
    </View>
  );
}

function ToolButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tool, pressed && { backgroundColor: colors.line }]} accessibilityRole="button" accessibilityLabel={a11y}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

function SelectionCard({ sel, progress, stage, onOpen, onClose }: { sel: NonNullable<Selection>; progress: Progress; stage: (id: string) => number; onOpen: () => void; onClose: () => void }) {
  if (sel.kind === 'position') {
    const hub = hubById.get(sel.id)!;
    const n = sats.filter(x => x.hub === hub).length;
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <TypeIcon type="position" size={14} />
          <Text style={styles.cardTitle}>{hub.p.name}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><Text style={styles.x}>✕</Text></Pressable>
        </View>
        <Text style={styles.cardSub}>{`${n} move${n === 1 ? '' : 's'} from here${positionActive(progress, sel.id) ? '' : ' · not trained yet'}`}</Text>
        <Pressable onPress={onOpen} style={styles.openBtn} accessibilityRole="button"><Text style={styles.openText}>Open position ›</Text></Pressable>
      </View>
    );
  }
  const sat = sats.find(x => x.t.id === sel.id && x.hub.p.id === sel.at)!;
  const here = posStage(progress, sel.id, sel.at);
  const copies = sats.filter(x => x.t.id === sel.id).length;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <TypeIcon type={sat.t.type} size={14} />
        <Text style={styles.cardTitle}>{sat.t.name}</Text>
        <Pips stage={stage(sel.id)} />
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><Text style={styles.x}>✕</Text></Pressable>
      </View>
      <Text style={styles.cardSub}>
        {`${TYPES[sat.t.type].label} · from ${sat.hub.p.name}: ${STAGES[here]}`}
        {copies > 1 ? ` · also from ${copies - 1} other position${copies > 2 ? 's' : ''} (lit up)` : ''}
      </Text>
      <Pressable onPress={onOpen} style={styles.openBtn} accessibilityRole="button"><Text style={styles.openText}>Open move ›</Text></Pressable>
    </View>
  );
}

/** Text with a dark outline drawn underneath, so it stays readable over lines. */
function Label({ x, y, anchor, size, bold, color, text }: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; size: number; bold?: boolean; color: string; text: string }) {
  const common = { x, y, textAnchor: anchor, fontSize: size, fontFamily: FONT, fontWeight: bold ? ('700' as const) : ('400' as const) };
  return (
    <>
      <SvgText {...common} fill={colors.bg} stroke={colors.bg} strokeWidth={size / 3.5} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={color}>{text}</SvgText>
    </>
  );
}

/** The drawing. Only redraws when progress, labels or the selection change, never while panning. */
const World = memo(function World({ progress, labels, sel, vis }: { progress: Progress; labels: boolean; sel: Selection; vis: Box | null }) {
  const onScreen = (x: Sat) => !vis || (x.x >= vis.x0 && x.x <= vis.x1 && x.y >= vis.y0 && x.y <= vis.y1);
  const satStage = useMemo(() => new Map(sats.map(x => [x.key, posStage(progress, x.t.id, x.hub.p.id)])), [progress]);
  const hubState = useMemo(() => new Map(hubs.map(h => {
    const learned = sats.some(x => x.hub === h && (satStage.get(x.key) ?? 0) >= 2);
    return [h.p.id, learned ? 2 : positionActive(progress, h.p.id) || h.p.id === 'standing' ? 1 : 0] as const;
  })), [progress, satStage]);

  // With a selection, light what belongs to it and dim the rest.
  const lit = (x: Sat) => !sel || (sel.kind === 'move' ? x.t.id === sel.id : x.hub.p.id === sel.id || x.t.to === sel.id);
  const litHub = (h: Hub) => !sel || (sel.kind === 'position' ? h.p.id === sel.id || links.some(l => (l.a === h && l.b.p.id === sel.id) || (l.b === h && l.a.p.id === sel.id)) : sats.some(x => x.t.id === sel.id && x.hub === h));
  const leadsTo = sel?.kind === 'move' ? sats.filter(x => x.t.id === sel.id && x.t.to) : [];

  return (
    <Svg width={WORLD.width} height={WORLD.height}>
      <Defs>
        <RadialGradient id="sky" cx="50%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#1a2650" />
          <Stop offset="0.6" stopColor="#0b1020" />
          <Stop offset="1" stopColor="#060912" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={WORLD.width} height={WORLD.height} fill="url(#sky)" />

      {links.map(l => (
        <Line key={`${l.a.p.id}-${l.b.p.id}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#34436b" strokeWidth={2} strokeLinecap="round"
          strokeOpacity={!sel ? 0.6 : litHub(l.a) && litHub(l.b) ? 0.8 : 0.12} />
      ))}

      {sats.map(x => {
        const st = satStage.get(x.key) ?? 0;
        return <Line key={`sp-${x.key}`} x1={x.x} y1={x.y} x2={x.hub.x} y2={x.hub.y} stroke={typeColor(x.t.type)} strokeWidth={1.6}
          strokeOpacity={(st >= 2 ? 0.85 : 0.28) * (lit(x) ? 1 : 0.25)} />;
      })}

      {leadsTo.map(x => {
        const to = hubById.get(x.t.to!)!;
        return <Line key={`to-${x.key}`} x1={x.x} y1={x.y} x2={to.x} y2={to.y} stroke={typeColor(x.t.type)} strokeWidth={1.2} strokeDasharray="5 5" strokeOpacity={0.7} />;
      })}

      {hubs.map(h => {
        const st = hubState.get(h.p.id) ?? 0;
        const on = litHub(h);
        return (
          <G key={h.p.id} opacity={on ? 1 : 0.3}>
            {sel?.kind === 'position' && sel.id === h.p.id && <Circle cx={h.x} cy={h.y} r={30} fill="none" stroke={colors.brass} strokeWidth={2} />}
            <Circle cx={h.x} cy={h.y} r={22} fill="#0c1222" stroke={st ? colors.brass : '#3a4566'} strokeWidth={st === 2 ? 3 : 2} />
            <Circle cx={h.x} cy={h.y} r={15} fill={st === 2 ? colors.brass : st === 1 ? 'rgba(217,180,108,0.35)' : '#1d2640'} />
            <Label x={h.x} y={h.y + (h.ring ? h.ring + 34 : 40)} anchor="middle" size={16} bold color={st ? colors.ink : colors.muted} text={h.p.name} />
          </G>
        );
      })}

      {sats.map(x => {
        const st = satStage.get(x.key) ?? 0;
        const c = typeColor(x.t.type);
        const on = lit(x);
        const picked = sel?.kind === 'move' && sel.id === x.t.id;
        const cos = Math.cos(x.angle), sin = Math.sin(x.angle);
        // Labels point away from the ring: right half to the right, left half to the left.
        // Near the top and bottom they also nudge outward so neighbours don't collide.
        const anchor = cos >= 0 ? 'start' : 'end';
        const lx = cos >= 0 ? 13 : -13;
        const ly = 4 + sin * (Math.abs(cos) < 0.35 ? 6 : 0);
        return (
          <G key={x.key} opacity={on ? 1 : 0.25}>
            {picked && <Circle cx={x.x} cy={x.y} r={14} fill="none" stroke={c} strokeWidth={2} />}
            <Circle cx={x.x} cy={x.y} r={9} fill={st >= 2 ? c : '#0c1222'} stroke={c} strokeWidth={st >= 1 ? 2 : 1.2} strokeOpacity={st >= 1 ? 1 : 0.5} />
            {st >= 3 && <Circle cx={x.x} cy={x.y} r={3.5} fill="#fff" fillOpacity={0.85} />}
            {(sel && on ? sel.kind === 'move' || onScreen(x) : labels && onScreen(x)) && (
              <Label x={x.x + lx} y={x.y + ly} anchor={anchor} size={11.5} color={st ? colors.ink : colors.muted} text={x.t.name + (x.t.gi ? ' (gi)' : '')} />
            )}
          </G>
        );
      })}
    </Svg>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060912' },
  modeBar: { flexDirection: 'row', margin: space.md, marginBottom: 0, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.bg2 },
  modeBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: colors.brass },
  modeText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  board: { flex: 1, overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0, width: WORLD.width, height: WORLD.height, transformOrigin: '0 0' },
  tools: { position: 'absolute', right: space.md, top: space.md, gap: 8 },
  tool: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,27,44,0.92)', borderWidth: 1, borderColor: colors.line },
  toolText: { color: colors.brass, fontSize: 20, fontWeight: '700', marginTop: -1 },
  hint: { position: 'absolute', left: space.md, bottom: space.md, color: colors.muted, fontSize: 12 },
  card: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, padding: space.md, gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(20,27,44,0.97)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '700' },
  cardSub: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  x: { color: colors.muted, fontSize: 16 },
  openBtn: { marginTop: 4, minHeight: 42, borderRadius: radius.sm + 2, backgroundColor: colors.brass, alignItems: 'center', justifyContent: 'center' },
  openText: { color: colors.bg, fontSize: 15, fontWeight: '700' },
});
