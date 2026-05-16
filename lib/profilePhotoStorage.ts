import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

function storageKey(userId: string) {
  return `student_profile_photo_uri_v1_${userId}`;
}

function localFilePath(userId: string) {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error('Profile photo storage is not available on this platform.');
  }
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}profile-photo-${safe}.jpg`;
}

export async function getProfilePhotoUri(userId: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(storageKey(userId));
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      await AsyncStorage.removeItem(storageKey(userId));
      return null;
    }
  } catch {
    return null;
  }
  return uri;
}

export async function saveProfilePhotoFromPicker(userId: string, sourceUri: string): Promise<string> {
  const dest = localFilePath(userId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  await AsyncStorage.setItem(storageKey(userId), dest);
  return dest;
}

export async function clearProfilePhoto(userId: string): Promise<void> {
  const uri = await AsyncStorage.getItem(storageKey(userId));
  if (uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  await AsyncStorage.removeItem(storageKey(userId));
}
