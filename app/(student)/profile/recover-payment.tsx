import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLARITY_BODY, CLARITY_HINT, CLARITY_MONO } from '@/components/admin/clarityTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/lib/api';

export default function RecoverPaymentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [payId, setPayId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSync = async () => {
    const id = payId.trim();
    if (!token || !id.startsWith('pay_')) {
      setErr('Enter a payment id that starts with pay_');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.reconcileRazorpayPayment(token, id);
      setMsg('Payment synced. Refreshing your membership…');
      setPayId('');
      await mp.refetch();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not sync payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
        gap: 12,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ padding: 16, gap: 10 }}>
        <Text style={[CLARITY_BODY, { color: c.ink600 }]}>
          If Razorpay shows paid but membership is missing, paste your payment id (starts with{' '}
          <Text style={CLARITY_MONO}>pay_</Text>) from email or Razorpay receipt.
        </Text>
        <TextField
          label="Razorpay payment id"
          value={payId}
          onChangeText={setPayId}
          placeholder="pay_…"
          autoCapitalize="none"
        />
        {err ? (
          <Text style={[CLARITY_HINT, { color: c.red700 }]} role="alert">
            {err}
          </Text>
        ) : null}
        {msg ? (
          <Text style={[CLARITY_HINT, { color: c.emerald800 }]} role="status">
            {msg}
          </Text>
        ) : null}
        <Button title={busy ? 'Working…' : 'Sync payment'} onPress={() => void onSync()} disabled={busy} />
      </Card>
    </ScrollView>
  );
}
