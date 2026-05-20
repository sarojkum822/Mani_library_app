import type { EmailOtpType } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/AuthProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/lib/api';
import { clearPendingSignup } from '@/lib/signupVerification';
import { createMobileSupabaseAuthClient } from '@/lib/supabaseAuthClient';

export default function AuthCallbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>();
  const { establishSession, showAuthNotice } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const sb = createMobileSupabaseAuthClient();
      if (!sb) {
        setError('App is missing Supabase configuration.');
        return;
      }

      const code = typeof params.code === 'string' ? params.code : undefined;
      const token_hash = typeof params.token_hash === 'string' ? params.token_hash : undefined;
      const type = typeof params.type === 'string' ? (params.type as EmailOtpType) : undefined;

      try {
        if (code) {
          const { data, error: exErr } = await sb.auth.exchangeCodeForSession(code);
          if (exErr || !data.session?.access_token) {
            setError(exErr?.message ?? 'Could not verify email.');
            return;
          }
          const user = await api.me(data.session.access_token);
          await clearPendingSignup();
          await establishSession(data.session.access_token, user, { silent: true });
          showAuthNotice({
            title: 'Email verified',
            body: `Welcome${user.name ? `, ${user.name.split(/\s+/)[0]}` : ''}!`,
          });
          return;
        }

        if (token_hash && type) {
          const { data, error: otpErr } = await sb.auth.verifyOtp({ type, token_hash });
          if (otpErr || !data.session?.access_token) {
            setError(otpErr?.message ?? 'Could not verify email.');
            return;
          }
          const user = await api.me(data.session.access_token);
          await clearPendingSignup();
          await establishSession(data.session.access_token, user, { silent: true });
          showAuthNotice({
            title: 'Email verified',
            body: `Welcome${user.name ? `, ${user.name.split(/\s+/)[0]}` : ''}!`,
          });
          return;
        }

        setError('Invalid or expired verification link.');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Verification failed.');
      }
    })();
  }, [params.code, params.token_hash, params.type, establishSession, showAuthNotice]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfaceMuted }]}>
      {error ? (
        <View style={styles.center}>
          <Text style={[styles.errTitle, { color: c.ink900 }]}>Verification failed</Text>
          <Text style={[styles.errBody, { color: c.ink600 }]}>{error}</Text>
          <Text style={[styles.link, { color: c.azure600 }]} onPress={() => router.replace('/(auth)/login')}>
            Back to sign in
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={c.azure500} size="large" />
          <Text style={[styles.wait, { color: c.ink600 }]}>Confirming your email…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  wait: { fontSize: 15, fontWeight: '500' },
  errTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '500' },
  link: { fontSize: 15, fontWeight: '600', marginTop: 8 },
});
