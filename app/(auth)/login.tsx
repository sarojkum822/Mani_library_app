import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, router } from 'expo-router';

import { AuthModeSegment, type AuthMode } from '@/components/auth/AuthModeSegment';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { SignupVerificationPanel } from '@/components/auth/SignupVerificationPanel';
import { StudentFieldError } from '@/components/student/StudentFieldError';
import { BrandLogo } from '@/components/BrandLogo';
import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import libraryInfo from '@/data/libraryInfo.json';
import { api } from '@/lib/api';
import { IndianPhoneField } from '@/components/ui/IndianPhoneField';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { formatPersonName } from '@/lib/formatPersonName';
import { normalizeIndianMobile10 } from '@/lib/indianPhone';
import { loadPendingSignup, savePendingSignup, startSignupEmailCooldown } from '@/lib/signupVerification';
import { forgotPasswordUrl } from '@/lib/siteUrls';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth, signIn, establishSession, tryCompletePendingVerification } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [verificationSent, setVerificationSent] = useState(false);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [passwordOrOtp, setPasswordOrOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  useEffect(() => {
    void loadPendingSignup().then((pending) => {
      if (!pending) return;
      setPendingVerifyEmail(pending.email);
      setVerificationSent(true);
      setMode('signup');
    });
  }, []);

  const pollVerified = useCallback(async () => {
    if (!verificationSent) return;
    await tryCompletePendingVerification();
  }, [verificationSent, tryCompletePendingVerification]);

  useEffect(() => {
    if (!verificationSent) return;
    void pollVerified();
    const id = setInterval(() => void pollVerified(), 5000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pollVerified();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [verificationSent, pollVerified]);

  const canSignIn = useMemo(
    () => emailOrPhone.trim().length > 3 && passwordOrOtp.length > 0,
    [emailOrPhone, passwordOrOtp],
  );

  const canSignUp = useMemo(() => {
    if (name.trim().length < 2) return false;
    if (!email.includes('@')) return false;
    if (!normalizeIndianMobile10(phone)) return false;
    if (password.length < FIELD_LIMITS.passwordMin) return false;
    if (password.length > FIELD_LIMITS.passwordMax) return false;
    return password === confirmPassword;
  }, [name, email, phone, password, confirmPassword]);

  if (auth.status === 'signed_in')
    return <Redirect href={auth.user.role === 'admin' ? '/(admin)' : '/(student)'} />;

  async function onSignUp() {
    if (!canSignUp) return;
    setSignUpError(null);
    setSubmitting(true);
    try {
      const formattedName = formatPersonName(name);
      setName(formattedName);
      const res = await api.signUp({
        name: formattedName,
        email: email.trim(),
        phone: normalizeIndianMobile10(phone) ?? '',
        password,
      });
      if (res.token && res.user) {
        await establishSession(res.token, res.user);
        return;
      }
      if (res.needsEmailConfirmation) {
        const trimmedEmail = email.trim().toLowerCase();
        await savePendingSignup({ email: trimmedEmail, password });
        await startSignupEmailCooldown();
        setPendingVerifyEmail(trimmedEmail);
        setVerificationSent(true);
        return;
      }
      Alert.alert('Account created', 'You can sign in now with your email and password.', [
        { text: 'Sign in', onPress: () => setMode('signin') },
      ]);
    } catch (e: unknown) {
      setSignUpError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setSignInError(null);
    setSignUpError(null);
  }

  const isSignIn = mode === 'signin';
  const kicker = isSignIn ? 'Sign in' : 'Create account';
  const kickerIcon = isSignIn ? 'lock' : 'user-plus';
  const title = isSignIn ? 'Welcome back' : `Join ${libraryInfo.name}`;
  const subtitle = isSignIn
    ? `Sign in to your ${libraryInfo.name} account with the email and password you used at registration.`
    : 'Sign up to get a member number, then sign in to pick plans, seats, and renewals.';

  const centerSignInForm = isSignIn && !verificationSent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <BrandLogo variant="full" height={36} />
        <Pressable
          onPress={() => router.replace('/(student)')}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={[styles.backLink, { color: c.ink500 }]}>← Back to home</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            centerSignInForm && styles.scrollContentCentered,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.pageCenter, centerSignInForm && styles.pageCenterCentered]}>
            <View style={styles.formBlock}>
            <View style={styles.kickerRow}>
              <FontAwesome name={kickerIcon} size={14} color={c.azure500} />
              <Text style={[styles.kicker, { color: c.azure500 }]}>{kicker}</Text>
            </View>
            {!verificationSent ? (
              <View style={styles.segmentWrap}>
                <AuthModeSegment mode={mode} onChange={switchMode} />
              </View>
            ) : null}
            <Text style={[styles.title, { color: c.ink900 }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: c.ink600 }]}>{subtitle}</Text>

            {verificationSent ? (
              <View style={styles.verifyWrap}>
                <SignupVerificationPanel
                  email={pendingVerifyEmail || email.trim().toLowerCase()}
                  onSignInInstead={() => {
                    setVerificationSent(false);
                    setMode('signin');
                  }}
                />
              </View>
            ) : (
              <View style={styles.fields}>
                {isSignIn ? (
                  <>
                    <TextField
                      variant="auth"
                      label="Email"
                      value={emailOrPhone}
                      onChangeText={setEmailOrPhone}
                      placeholder="you@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      maxLength={FIELD_LIMITS.emailMax}
                    />
                    <AuthPasswordField
                      value={passwordOrOtp}
                      onChangeText={(t) => {
                        setPasswordOrOtp(t);
                        if (signInError) setSignInError(null);
                      }}
                      maxLength={FIELD_LIMITS.passwordMax}
                    />
                    <Pressable
                      onPress={() => void Linking.openURL(forgotPasswordUrl())}
                      hitSlop={8}
                      style={({ pressed }) => [styles.forgotRow, pressed ? { opacity: 0.7 } : null]}
                      accessibilityRole="link"
                      accessibilityLabel="Forgot password"
                    >
                      <Text style={[styles.forgotLink, { color: c.azure500 }]}>Forgot password?</Text>
                    </Pressable>
                    <StudentFieldError message={signInError} />
                    <Button
                      title={submitting ? 'Signing you in' : 'Sign in'}
                      loading={submitting}
                      disabled={!canSignIn}
                      style={styles.pillBtn}
                      onPress={async () => {
                        setSignInError(null);
                        setSubmitting(true);
                        try {
                          await signIn({ emailOrPhone, passwordOrOtp });
                        } catch (e: unknown) {
                          setSignInError(e instanceof Error ? e.message : 'Try again.');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      variant="auth"
                      label="Full name"
                      value={name}
                      onChangeText={setName}
                      onBlur={() => setName((v) => formatPersonName(v))}
                      placeholder="Your name"
                      autoCapitalize="words"
                      maxLength={FIELD_LIMITS.nameMax}
                    />
                    <TextField
                      variant="auth"
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      maxLength={FIELD_LIMITS.emailMax}
                    />
                    <IndianPhoneField value={phone} onChangeText={setPhone} />
                    <AuthPasswordField
                      value={password}
                      onChangeText={setPassword}
                      placeholder={`Min. ${FIELD_LIMITS.passwordMin} characters`}
                      maxLength={FIELD_LIMITS.passwordMax}
                    />
                    <AuthPasswordField
                      label="Confirm password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat password"
                      maxLength={FIELD_LIMITS.passwordMax}
                    />
                    <StudentFieldError message={signUpError} />
                    <Button
                      title={submitting ? 'Creating account' : 'Sign up'}
                      loading={submitting}
                      disabled={!canSignUp}
                      style={styles.pillBtn}
                      onPress={onSignUp}
                    />
                  </>
                )}

              </View>
            )}
            </View>

            {!centerSignInForm ? (
            <View style={[styles.metaFoot, { borderTopColor: c.ink100 }]}>
              <View style={styles.metaItem}>
                <FontAwesome name="map-marker" size={12} color={c.ink400} />
                <Text style={[styles.metaText, { color: c.ink400 }]}>
                  {libraryInfo.address.city}, {libraryInfo.address.state}
                </Text>
              </View>
              <Text style={[styles.metaDot, { color: c.ink300 }]}>·</Text>
              <View style={styles.metaItem}>
                <FontAwesome name="clock-o" size={12} color={c.ink400} />
                <Text style={[styles.metaText, { color: c.ink400 }]}>{libraryInfo.hours}</Text>
              </View>
            </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  scrollContentCentered: {
    justifyContent: 'center',
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pageCenter: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: 12,
    gap: 24,
  },
  pageCenterCentered: {
    flexGrow: 0,
    paddingTop: 0,
    gap: 0,
  },
  backLink: {
    fontSize: 14,
    fontFamily: FONT_SANS.semibold,
  },
  formBlock: {
    width: '100%',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    fontFamily: FONT_MONO.regular,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontFamily: FONT_SANS.semibold,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONT_SANS.regular,
  },
  segmentWrap: { marginTop: 16 },
  verifyWrap: { marginTop: 24 },
  fields: { marginTop: 20, gap: 16 },
  pillBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotLink: { fontSize: 13, fontFamily: FONT_SANS.semibold },
  metaFoot: {
    marginTop: 'auto',
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: {
    fontFamily: FONT_MONO.regular,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  metaDot: { fontSize: 10 },
});
