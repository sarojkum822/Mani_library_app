import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ml_token_v1';
const ROLE_KEY = 'ml_role_v1';

export type Role = 'student' | 'admin';

const useSecureStore = Platform.OS !== 'web';

async function getItem(key: string): Promise<string | null> {
  if (useSecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function getToken() {
  return getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await removeItem(TOKEN_KEY);
}

export async function getRole(): Promise<Role | null> {
  const v = await getItem(ROLE_KEY);
  if (v === 'student' || v === 'admin') return v;
  return null;
}

export async function setRole(role: Role) {
  await setItem(ROLE_KEY, role);
}

export async function clearRole() {
  await removeItem(ROLE_KEY);
}
