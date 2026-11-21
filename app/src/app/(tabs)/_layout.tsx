import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { colors } from '../../theme';

const ListIcon = ({ color }: { color: ColorValue }) => (
  <View style={{ gap: 4, width: 20 }}>
    {[20, 20, 13].map((w, i) => <View key={i} style={{ width: w, height: 2.5, borderRadius: 2, backgroundColor: color }} />)}
  </View>
);
const BarsIcon = ({ color }: { color: ColorValue }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 18 }}>
    {[9, 18, 13].map((h, i) => <View key={i} style={{ width: 3.5, height: h, borderRadius: 2, backgroundColor: color }} />)}
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg2 },
        headerTitleStyle: { color: colors.brass, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
        tabBarStyle: { backgroundColor: colors.bg2, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Grappling Dex', tabBarLabel: 'Dex', tabBarIcon: ({ color }) => <ListIcon color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color }) => <BarsIcon color={color} /> }} />
    </Tabs>
  );
}
