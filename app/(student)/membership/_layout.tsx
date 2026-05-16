import { Stack } from 'expo-router';

export default function MembershipStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="hub" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="seat-map" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="payment-success" />
    </Stack>
  );
}
