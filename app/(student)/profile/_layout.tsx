import { Stack } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import { useNativeStackScreenOptions } from '@/lib/nativeStackScreenOptions';

export default function ProfileStackLayout() {
  const scheme = useColorScheme() ?? 'light';
  const screenOptions = useNativeStackScreenOptions(scheme, { headerBackTitle: 'Profile' });

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: 'Your profile' }} />
      <Stack.Screen name="membership" options={{ title: 'Membership' }} />
      <Stack.Screen name="doc" options={{ title: 'Documents' }} />
      <Stack.Screen name="transactions" options={{ title: 'Payments' }} />
      <Stack.Screen name="recover-payment" options={{ title: 'Recover payment' }} />
      <Stack.Screen name="feedback" options={{ title: 'Feedback' }} />
    </Stack>
  );
}
