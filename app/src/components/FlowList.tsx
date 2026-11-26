// On a position's entry page: the moves from the side being viewed, grouped by type,
// each with where it leaves you (→ position) or 🏁 for submissions that finish there.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Side } from '../data/catalog';
import { flowFrom } from '../data/flow';
import { posStage } from '../lib/progress';
import { useProgress } from '../lib/store';
import { colors, radius } from '../theme';
import { Pips, SectionLabel, TypeIcon } from './ui';

export function FlowList({ posId, side }: { posId: string; side: Side | null }) {
  const router = useRouter();
  const { progress } = useProgress();
  const open = (id: string, s?: Side | null) => router.push({ pathname: '/entry/[id]', params: { id, ...(s ? { side: s } : {}) } });
  const groups = flowFrom(posId, side);
  if (!groups.length) return <Text style={styles.muted}>No moves from this side in the dex yet.</Text>;
  return (
    <>
      {groups.map(g => {
        const finishOnly = g.moves.every(m => !m.to);
        return (
          <View key={g.type} style={styles.group}>
            <SectionLabel>{`${g.label} from here (${g.moves.length})${g.type === 'sub' && finishOnly ? ' · 🏁 finish' : ''}`}</SectionLabel>
            {finishOnly ? (
              <View style={styles.chips}>
                {g.moves.map(m => (
                  <Pressable key={m.t.id} onPress={() => open(m.t.id)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} accessibilityRole="link">
                    <TypeIcon type={m.t.type} size={10} />
                    <Text style={styles.chipText}>{m.t.name}</Text>
                    <Pips stage={posStage(progress, m.t.id, posId)} />
                  </Pressable>
                ))}
              </View>
            ) : g.moves.map(m => (
              <View key={m.t.id} style={styles.row}>
                <Pressable onPress={() => open(m.t.id)} style={({ pressed }) => [styles.move, pressed && styles.pressed]} accessibilityRole="link">
                  <TypeIcon type={m.t.type} size={12} />
                  <Text style={styles.name} numberOfLines={1}>{m.t.name}</Text>
                  <Pips stage={posStage(progress, m.t.id, posId)} />
                </Pressable>
                {m.to
                  ? <Pressable onPress={() => open(m.to!.id, m.toSide)} style={({ pressed }) => [styles.dest, pressed && styles.pressed]} accessibilityRole="link" accessibilityLabel={`Leads to ${m.to.name}`}>
                      <Text style={styles.arrow}>→</Text><Text style={styles.destText} numberOfLines={2}>{m.to.name}</Text>
                    </Pressable>
                  : <Text style={[styles.dest, styles.none]}>{m.t.type === 'sub' ? '🏁' : '—'}</Text>}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  move: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  name: { flex: 1, color: colors.ink, fontSize: 14.5 },
  dest: { width: 124, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 42, paddingHorizontal: 4 },
  none: { textAlign: 'center', color: colors.muted, fontSize: 15, lineHeight: 42 },
  arrow: { color: colors.brass, fontSize: 15, fontWeight: '700' },
  destText: { color: colors.brass, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2 },
  chipText: { color: colors.ink, fontSize: 13.5 },
  pressed: { backgroundColor: colors.line },
  muted: { color: colors.muted, fontSize: 14 },
});
