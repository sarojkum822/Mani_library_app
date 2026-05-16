import { Stack } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProfileStackLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Profile',
        headerTintColor: c.azure500,
        headerTitleStyle: { color: c.ink900, fontWeight: '600', fontSize: 17 },
        headerStyle: { backgroundColor: c.surface },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.surfaceMuted },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: 'Your profile' }} />
      <Stack.Screen name="membership" options={{ title: 'Membership' }} />
      <Stack.Screen name="doc" options={{ title: 'Documents' }} />
      <Stack.Screen name="transactions" options={{ title: 'Payments' }} />
    </Stack>
  );
}
