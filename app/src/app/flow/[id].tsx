import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { FlowView } from '../../components/FlowView';
import { nameOf } from '../../data/catalog';
import { colors } from '../../theme';

/** "Map from here", opened from a dex entry. */
export default function FlowScreen() {
  const { id, side } = useLocalSearchParams<{ id: string; side?: string }>();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `From ${nameOf(id)}` }} />
      <FlowView startId={id} startSide={side === 'top' || side === 'bottom' ? side : undefined} onOpenEntry={e => router.push({ pathname: '/entry/[id]', params: { id: e } })} />
    </View>
  );
}
