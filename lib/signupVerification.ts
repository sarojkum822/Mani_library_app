import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const SIGNUP_EMAIL_COOLDOWN_SEC = 30;
const COOLDOWN_KEY = 'manilibrary:signup_verification_cooldown_until';
const PENDING_KEY = 'ml_pending_signup_v1';

export type PendingSignup = {
  email: string;
  password: string;
};

const useSecure = Platform.OS !== 'web';

export async function readSignupEmailCooldownLeftSec(): Promise<number> {
  return AsyncStorage.getItem(COOLDOWN_KEY).then((raw) => {
    const until = raw ? Number(raw) : 0;
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });
}

export async function startSignupEmailCooldown(): Promise<void> {
  await AsyncStorage.setItem(COOLDOWN_KEY, String(Date.now() + SIGNUP_EMAIL_COOLDOWN_SEC * 1000));
}

export async function savePendingSignup(pending: PendingSignup): Promise<void> {
  const payload = JSON.stringify({
    email: pending.email.trim().toLowerCase(),
    password: pending.password,
  });
  if (useSecure) {
    await SecureStore.setItemAsync(PENDING_KEY, payload);
  } else {
    await AsyncStorage.setItem(PENDING_KEY, payload);
  }
}

export async function loadPendingSignup(): Promise<PendingSignup | null> {
  const raw = useSecure ? await SecureStore.getItemAsync(PENDING_KEY) : await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingSignup;
    if (!parsed.email?.includes('@') || !parsed.password) return null;
    return { email: parsed.email.trim().toLowerCase(), password: parsed.password };
  } catch {
    return null;
  }
}

export async function clearPendingSignup(): Promise<void> {
  if (useSecure) {
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } else {
    await AsyncStorage.removeItem(PENDING_KEY);
  }
}
