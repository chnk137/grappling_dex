import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { isPosition, nameOf, techniqueById, type MoveType } from '../data/catalog';
import { useProgress } from '../lib/store';
import { colors, radius, space, typeColor } from '../theme';

/** Each move type has its own shape as well as its own colour, so it reads without colour too. */
export function TypeIcon({ type, size = 12, dim = false }: { type: MoveType | 'position'; size?: number; dim?: boolean }) {
  const c = type === 'position' ? colors.brass : typeColor(type);
  const o = dim ? 0.35 : 1;
  const box: ViewStyle = { width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: o };
  let shape: ViewStyle;
  switch (type) {
    case 'sub': shape = { width: size, height: size, borderRadius: size / 2, backgroundColor: c }; break;
    case 'pass': shape = { width: size * 0.82, height: size * 0.82, backgroundColor: c }; break;
    case 'move': shape = { width: size * 0.7, height: size * 0.7, backgroundColor: c, transform: [{ rotate: '45deg' }] }; break;
    case 'escape': shape = { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size / 5), borderColor: c }; break;
    case 'sweep': shape = { width: 0, height: 0, borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size * 0.86, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }; break;
    default: shape = { width: size, height: size, borderRadius: size * 0.3, borderWidth: Math.max(2, size / 6), borderColor: c, backgroundColor: colors.brassSoft };
  }
  return <View style={box}><View style={shape} /></View>;
}

export const iconFor = (id: string): MoveType | 'position' => (isPosition(id) ? 'position' : techniqueById.get(id)!.type);

export function Pips({ stage, onBrass = false }: { stage: number; onBrass?: boolean }) {
  return (
    <View style={styles.pips} accessibilityLabel={`Stage ${stage} of 4`}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.pip, { backgroundColor: i <= stage ? (onBrass ? colors.bg : colors.brass) : (onBrass ? 'rgba(14,19,32,0.25)' : colors.line) }]} />
      ))}
    </View>
  );
}

/** A tappable link to another entry, showing its stage for moves. */
export function EntryChip({ id }: { id: string }) {
  const router = useRouter();
  const { stage } = useProgress();
  const pos = isPosition(id);
  const s = pos ? 0 : stage(id);
  return (
    <Pressable onPress={() => router.push({ pathname: '/entry/[id]', params: { id } })}
      style={({ pressed }) => [styles.chip, s >= 3 && { borderColor: colors.brass }, pressed && { backgroundColor: colors.line }]}
      accessibilityRole="link" accessibilityLabel={nameOf(id)}>
      <TypeIcon type={iconFor(id)} size={11} />
      <Text style={styles.chipText}>{nameOf(id)}</Text>
      {!pos && <Pips stage={s} />}
    </Pressable>
  );
}

export function Chips({ ids }: { ids: string[] }) {
  return <View style={styles.chips}>{ids.map(id => <EntryChip key={id} id={id} />)}</View>;
}

export function SectionLabel({ children, color }: { children: string; color?: string }) {
  return <Text style={[styles.label, color ? { color } : null]}>{children}</Text>;
}

export function Bar({ label, value, max, right, warn = false }: { label: string; value: number; max: number; right?: string; warn?: boolean }) {
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, warn && { color: colors.gap }]}>{label}</Text>
      <View style={[styles.barTrack, warn && { backgroundColor: 'rgba(242,118,109,0.25)' }]}>
        <View style={[styles.barFill, { width: `${max ? Math.min(100, (100 * value) / max) : 0}%` }]} />
      </View>
      <Text style={[styles.barValue, warn && { color: colors.gap }]}>{right ?? String(value)}</Text>
    </View>
  );
}

export function LogFab() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/log')} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
      accessibilityRole="button" accessibilityLabel="Log a session">
      <Text style={styles.fabPlus}>+</Text>
      <Text style={styles.fabText}>Log session</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', style }: { label: string; onPress: () => void; kind?: 'primary' | 'outline' | 'ghost'; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.btn, kind === 'primary' && styles.btnPrimary, kind === 'outline' && styles.btnOutline, pressed && { opacity: 0.8 }, style]}>
      <Text style={[styles.btnText, kind === 'primary' && { color: colors.bg }, kind === 'outline' && { color: colors.brass }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 10, height: 4, borderRadius: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  chipText: { color: colors.ink, fontSize: 14 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: space.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 84, color: colors.ink, fontSize: 13 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.brass },
  barValue: { width: 40, textAlign: 'right', color: colors.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
  fab: { position: 'absolute', right: space.lg, bottom: space.lg, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 52, borderRadius: 26, backgroundColor: colors.brass, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabPlus: { color: colors.bg, fontSize: 24, fontWeight: '700', marginTop: -2 },
  fabText: { color: colors.bg, fontSize: 15, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  btn: { minHeight: 46, paddingHorizontal: 14, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.brass },
  btnOutline: { borderWidth: 1, borderColor: colors.brass },
  btnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
});
