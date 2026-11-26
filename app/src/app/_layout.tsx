import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProgressProvider } from '../lib/store';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ProgressProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg2 },
          headerTintColor: colors.brass,
          headerTitleStyle: { color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="log" options={{ presentation: 'modal', title: 'Log a session' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy policy', headerBackTitle: 'Back' }} />
      </Stack>
    </ProgressProvider>
    </GestureHandlerRootView>
  );
}
