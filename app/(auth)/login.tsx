import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, router } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/lib/api';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { formatPersonName } from '@/lib/formatPersonName';

type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth, signIn, establishSession } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [passwordOrOtp, setPasswordOrOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const canSignIn = useMemo(
    () => emailOrPhone.trim().length > 3 && passwordOrOtp.length > 0,
    [emailOrPhone, passwordOrOtp],
  );

  const canSignUp = useMemo(() => {
    if (name.trim().length < 2) return false;
    if (!email.includes('@')) return false;
    if (phone.trim().length < 8) return false;
    if (password.length < FIELD_LIMITS.passwordMin) return false;
    if (password.length > FIELD_LIMITS.passwordMax) return false;
    return password === confirmPassword;
  }, [name, email, phone, password, confirmPassword]);

  if (auth.status === 'signed_in')
    return <Redirect href={auth.user.role === 'admin' ? '/(admin)' : '/(student)'} />;

  async function onSignUp() {
    if (!canSignUp) return;
    setSubmitting(true);
    try {
      const formattedName = formatPersonName(name);
      setName(formattedName);
      const res = await api.signUp({
        name: formattedName,
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      if (res.token && res.user) {
        await establishSession(res.token, res.user);
        return;
      }
      if (res.needsEmailConfirmation) {
        Alert.alert(
          'Confirm your email',
          'We sent a link to your inbox. After you confirm, use Sign in with the same email and password.',
          [{ text: 'OK', onPress: () => setMode('signin') }],
        );
        return;
      }
      Alert.alert('Account created', 'You can sign in now with your email and password.', [
        { text: 'Sign in', onPress: () => setMode('signin') },
      ]);
    } catch (e: unknown) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const heading = mode === 'signin' ? 'Welcome back' : 'Create account';
  const sub =
    mode === 'signin'
      ? 'Sign in to manage membership, uploads, and your seat.'
      : 'Students only — we will verify your details at the desk.';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfaceMuted }]} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        <LinearGradient
          colors={[c.azure50, c.surfaceMuted]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.replace('/(student)')}
              hitSlop={12}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
            >
              <FontAwesome name="angle-left" size={22} color={c.ink800} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={[styles.mark, { backgroundColor: c.azure50, borderColor: c.azure100 }]}>
              <FontAwesome name="book" size={20} color={c.azure600} />
            </View>
            <Text style={[styles.kicker, { color: c.azure600 }]}>Mani Library</Text>
            <Text style={[styles.title, { color: c.ink900 }]}>{heading}</Text>
            <Text style={[styles.subtitle, { color: c.ink600 }]}>{sub}</Text>
          </View>

          <ModeSwitch mode={mode} onChange={setMode} />

          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            {mode === 'signin' ? (
              <>
                <TextField
                  label="Email"
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={FIELD_LIMITS.emailMax}
                />
                <TextField
                  label="Password"
                  value={passwordOrOtp}
                  onChangeText={setPasswordOrOtp}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={FIELD_LIMITS.passwordMax}
                />

                <Text style={[styles.hint, { color: c.ink500 }]}>
                  Same account as the website. Staff access comes from your library profile (is_admin) — not from this
                  screen.
                </Text>

                <View style={{ height: 4 }} />

                <Button
                  title={submitting ? 'Signing in…' : 'Sign in'}
                  disabled={!canSignIn || submitting}
                  onPress={async () => {
                    setSubmitting(true);
                    try {
                      await signIn({ emailOrPhone, passwordOrOtp });
                    } catch (e: unknown) {
                      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Try again.');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                />
              </>
            ) : (
              <>
                <TextField
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  onBlur={() => setName((v) => formatPersonName(v))}
                  placeholder="Your name"
                  autoCapitalize="words"
                  maxLength={FIELD_LIMITS.nameMax}
                />
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={FIELD_LIMITS.emailMax}
                />
                <TextField
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 ..."
                  keyboardType="phone-pad"
                  maxLength={FIELD_LIMITS.phoneMax}
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={`Min. ${FIELD_LIMITS.passwordMin} characters`}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={FIELD_LIMITS.passwordMax}
                />
                <TextField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat password"
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={FIELD_LIMITS.passwordMax}
                />

                <Button
                  title={submitting ? 'Submitting…' : 'Request access'}
                  disabled={!canSignUp || submitting}
                  onPress={onSignUp}
                />
                <Text style={[styles.mutedNote, { color: c.ink500 }]}>
                  Staff roles are set in the database on your profile, not here.
                </Text>
              </>
            )}
          </View>

          <Button
            title="Continue as guest"
            variant="secondary"
            onPress={() => router.replace('/(student)')}
            style={{ marginTop: 4 }}
          />
          <Text style={[styles.guestFootnote, { color: c.ink500 }]}>
            Guests only see the library brand page — no tab bar until you sign in.
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

function ModeSwitch({ mode, onChange }: { mode: AuthMode; onChange: (m: AuthMode) => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
      <Pressable
        onPress={() => onChange('signin')}
        style={({ pressed }) => [
          styles.segmentItem,
          mode === 'signin' ? { backgroundColor: c.surface, ...segmentActiveShadow() } : null,
          pressed && mode !== 'signin' ? { opacity: 0.88 } : null,
        ]}
      >
        <Text style={[styles.segmentText, { color: mode === 'signin' ? c.ink900 : c.ink500 }]}>Sign in</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('signup')}
        style={({ pressed }) => [
          styles.segmentItem,
          mode === 'signup' ? { backgroundColor: c.surface, ...segmentActiveShadow() } : null,
          pressed && mode !== 'signup' ? { opacity: 0.88 } : null,
        ]}
      >
        <Text style={[styles.segmentText, { color: mode === 'signup' ? c.ink900 : c.ink500 }]}>Sign up</Text>
      </Pressable>
    </View>
  );
}

function segmentActiveShadow() {
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1, position: 'relative' },
  kav: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  hero: {
    marginTop: 8,
    marginBottom: 22,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 340,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
    marginBottom: 18,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  sheet: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: -4,
  },
  mutedNote: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 4,
  },
  guestFootnote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
