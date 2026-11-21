import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LogFab, Pips, TypeIcon } from '../../components/ui';
import { entryNo, nearby, positionActive, positions, scorecard, techniques, TYPES, type MoveType } from '../../data/catalog';
import { STAGES } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors, radius, space, typeColor } from '../../theme';

type Tab = 'moves' | 'positions';

export default function DexScreen() {
  const router = useRouter();
  const { progress, stage } = useProgress();
  const [tab, setTab] = useState<Tab>('moves');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<MoveType>>(new Set());

  const q = query.trim().toLowerCase();
  const matches = (name: string, id: string) => !q || name.toLowerCase().includes(q) || entryNo.get(id)!.toLowerCase().includes(q);
  const list = useMemo(
    () => (tab === 'moves' ? techniques.filter(t => !hidden.has(t.type)) : positions).filter(n => matches(n.name, n.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, q, hidden],
  );
  const counts = [1, 2, 3, 4].map(k => techniques.filter(t => stage(t.id) >= k).length);

  const toggle = (t: MoveType) => setHidden(prev => {
    const n = new Set(prev);
    if (n.has(t)) n.delete(t); else n.add(t);
    return n;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search entries" placeholderTextColor={colors.muted}
          style={styles.search} autoCorrect={false} clearButtonMode="while-editing" accessibilityLabel="Search entries" />
        <View style={styles.mini}>
          {counts.map((c, i) => <Text key={i} style={styles.miniText}><Text style={styles.miniNum}>{c}</Text> {STAGES[i + 1]}</Text>)}
        </View>
        <View style={styles.seg}>
          {(['moves', 'positions'] as Tab[]).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[styles.segText, tab === t && { color: colors.ink }]}>{t === 'moves' ? 'Moves' : 'Positions'}</Text>
            </Pressable>
          ))}
        </View>
        {tab === 'moves' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(Object.keys(TYPES) as MoveType[]).map(t => (
              <Pressable key={t} onPress={() => toggle(t)} style={[styles.filter, hidden.has(t) && { opacity: 0.4 }]}
                accessibilityRole="checkbox" accessibilityState={{ checked: !hidden.has(t) }}>
                <View style={[styles.dot, { backgroundColor: typeColor(t) }]} />
                <Text style={styles.filterText}>{TYPES[t].plural}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <FlatList
        data={list}
        keyExtractor={n => n.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>No entries match “{query}”.</Text>}
        renderItem={({ item }) => {
          const isMove = tab === 'moves';
          const s = isMove ? stage(item.id) : 0;
          const known = isMove ? s > 0 : positionActive(progress, item.id);
          const far = !known && !nearby(progress, item.id);
          const rows = isMove ? [] : scorecard(progress, item.id);
          return (
            <Pressable onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, far && { opacity: 0.45 }, pressed && { backgroundColor: colors.panel }]}
              accessibilityRole="link" accessibilityLabel={`${entryNo.get(item.id)} ${item.name}`}>
              <Text style={styles.no}>{entryNo.get(item.id)}</Text>
              <TypeIcon type={isMove ? (item as typeof techniques[number]).type : 'position'} size={13} />
              <Text style={[styles.name, !known && { color: colors.muted }]} numberOfLines={1}>{item.name}</Text>
              {isMove ? <Pips stage={s} /> : (
                <Text style={[styles.score, rows.some(r => r.have) && { color: colors.brass }]}>
                  {rows.reduce((a, r) => a + r.have, 0)}/{rows.reduce((a, r) => a + r.total, 0)}
                </Text>
              )}
            </Pressable>
          );
        }}
      />
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  head: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm, borderBottomWidth: 1, borderBottomColor: '#1c3039' },
  search: { height: 44, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, color: colors.ink, paddingHorizontal: 12, fontSize: 16 },
  mini: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  miniText: { color: colors.muted, fontSize: 12 },
  miniNum: { color: colors.ink, fontWeight: '700' },
  seg: { flexDirection: 'row', gap: 4 },
  segBtn: { flex: 1, height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: '#23404a', alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#15303a', borderColor: colors.sweep },
  segText: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  filters: { gap: 6, paddingRight: space.md },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.line },
  dot: { width: 9, height: 9, borderRadius: 5 },
  filterText: { color: colors.ink, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: space.md },
  no: { width: 42, color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  name: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '500' },
  score: { color: colors.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  empty: { color: colors.muted, textAlign: 'center', padding: space.xl },
});
