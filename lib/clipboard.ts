import { Alert, Platform } from 'react-native';

import { isExpoGoClient } from '@/lib/isExpoGo';

/** Copy text without loading expo-clipboard in Expo Go (native module missing there). */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (!isExpoGoClient()) {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(value);
      return true;
    } catch {
      /* dev build without clipboard */
    }
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through */
    }
  }

  Alert.alert('Copy manually', value);
  return false;
}
