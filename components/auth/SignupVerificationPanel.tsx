import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_MONO } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/lib/api';
import {
  readSignupEmailCooldownLeftSec,
  SIGNUP_EMAIL_COOLDOWN_SEC,
  startSignupEmailCooldown,
} from '@/lib/signupVerification';

type Props = {
  email: string;
  onSignInInstead?: () => void;
};

export function SignupVerificationPanel({ email, onSignInInstead }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const trimmedEmail = email.trim().toLowerCase();

  const [cooldownLeft, setCooldownLeft] = useState(SIGNUP_EMAIL_COOLDOWN_SEC);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);

  useEffect(() => {
    const sync = () => {
      void readSignupEmailCooldownLeftSec().then((left) => {
        setCooldownLeft(left);
      });
    };
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, []);

  const onResend = useCallback(async () => {
    setResendError(null);
    setResendOk(false);
    if (cooldownLeft > 0) return;
    setResending(true);
    try {
      await api.resendVerificationEmail(trimmedEmail);
      await startSignupEmailCooldown();
      setCooldownLeft(SIGNUP_EMAIL_COOLDOWN_SEC);
      setResendOk(true);
    } catch (e: unknown) {
      setResendError(e instanceof Error ? e.message : 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  }, [cooldownLeft, trimmedEmail]);

  return (
    <View style={[styles.box, { borderColor: c.azure100, backgroundColor: c.emerald100 }]}>
      <Text style={[styles.title, { color: c.ink900 }]}>Check your email</Text>
      <Text style={[styles.body, { color: c.ink600 }]}>
        We sent a verification link to <Text style={styles.mono}>{trimmedEmail}</Text>. Open it to confirm your
        account — the app will sign you in automatically.
      </Text>
      {resendOk ? (
        <Text style={[styles.ok, { color: c.ink800 }]}>Verification email sent again.</Text>
      ) : null}
      {cooldownLeft > 0 ? (
        <Text style={[styles.timer, { color: c.ink600 }]}>
          Resend available in <Text style={styles.timerNum}>{cooldownLeft}s</Text>
        </Text>
      ) : (
        <View style={styles.resendBlock}>
          {resendError ? (
            <Text style={[styles.err, { color: c.amber800 }]}>{resendError}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => void onResend()}
            disabled={resending}
            style={({ pressed }) => [
              styles.resendBtn,
              { borderColor: c.azure300, backgroundColor: c.surface },
              pressed && { opacity: 0.85 },
              resending && { opacity: 0.6 },
            ]}
          >
            {resending ? (
              <ActivityIndicator size="small" color={c.azure600} />
            ) : (
              <Text style={[styles.resendText, { color: c.azure600 }]}>Resend verification email</Text>
            )}
          </Pressable>
        </View>
      )}
      {onSignInInstead ? (
        <Pressable onPress={onSignInInstead} hitSlop={8} style={styles.signInLink}>
          <Text style={[styles.signInLinkText, { color: c.azure600 }]}>Already confirmed? Sign in</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  mono: { fontFamily: FONT_MONO.semibold },
  ok: { fontSize: 13, fontWeight: '600' },
  timer: { fontSize: 13, fontWeight: '500' },
  timerNum: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  resendBlock: { gap: 8, marginTop: 4 },
  err: { fontSize: 12, lineHeight: 17 },
  resendBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  resendText: { fontSize: 14, fontWeight: '600' },
  signInLink: { marginTop: 4 },
  signInLinkText: { fontSize: 14, fontWeight: '600' },
});
