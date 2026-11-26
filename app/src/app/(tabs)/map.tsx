import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { FlowView } from '../../components/FlowView';
import { positionById } from '../../data/catalog';
import { splitKey, type Progress } from '../../lib/progress';
import { useProgress } from '../../lib/store';
import { colors } from '../../theme';

/** The position you logged most recently, else closed guard. */
function latestPosition(p: Progress): string {
  for (let i = p.sessions.length - 1; i >= 0; i--) {
    const ks = Object.keys(p.sessions[i].items).map(splitKey).filter(k => k.pos && positionById.has(k.pos));
    if (ks.length) return ks[ks.length - 1].pos!;
  }
  return 'closed';
}

/**
 * The Map tab: "Map from here", starting on your latest position. (The whole web of
 * every position was too much on a phone; each step here shows one side of one position.)
 */
export default function MapScreen() {
  const router = useRouter();
  const { progress } = useProgress();
  const start = useMemo(() => latestPosition(progress), [progress]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlowView startId={start} onOpenEntry={id => router.push({ pathname: '/entry/[id]', params: { id } })} />
    </View>
  );
}
