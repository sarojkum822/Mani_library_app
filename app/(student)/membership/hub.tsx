import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { MembershipBuyPlanForm } from '@/components/membership/MembershipBuyPlanForm';
import { hasActiveMembership } from '@/lib/hasActiveMembership';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';

export default function MembershipHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const active =
    auth.status === 'signed_in' &&
    auth.user.role === 'student' &&
    mp.accountReady &&
    hasActiveMembership(mp.membership);

  if (active) {
    const planId = seatMapPlanIdForMarketingPlan(mp.membership?.planMarketingId ?? 'main-hall');
    return (
      <Screen title="Your membership is active" subtitle="See which seats are free on the hall map." scrollable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
          <FontAwesome name="angle-left" size={18} color={c.ink700} />
          <Text style={[styles.backText, { color: c.azure600 }]}>Back</Text>
        </Pressable>
        <Button
          title="View available seats"
          onPress={() =>
            router.replace({
              pathname: '/(student)/membership/seat-map',
              params: { planId, preview: '1' },
            })
          }
        />
        <Button title="My membership" variant="secondary" onPress={() => router.replace('/(student)/membership')} />
      </Screen>
    );
  }

  return (
    <Screen title="Buy membership" subtitle="Choose your hall, duration, and start date." scrollable>
      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
        <FontAwesome name="angle-left" size={18} color={c.ink700} />
        <Text style={[styles.backText, { color: c.azure600 }]}>Back</Text>
      </Pressable>

      <MembershipBuyPlanForm
        c={c}
        token={token}
        onContinue={({ planId, planKind, durationKey, membershipStartDate }) => {
          router.push({
            pathname: '/(student)/membership/seat-map',
            params: { planId, planKind, durationKey, membershipStartDate, intent: 'buy' },
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingVertical: 4,
  },
  backText: { fontSize: 14, fontWeight: '600' },
});
