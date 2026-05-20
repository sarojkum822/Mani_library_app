/**
 * Legacy: some builds staged KYC only on-device until payment. We now flush any remaining
 * staged files with `/api/me/verification/document` (same as the website) after payment or on refresh.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { api, type DocumentType } from '@/lib/api';

const SECURE_KEY = 'deferred_membership_kyc_v1';

export type DeferredKycSlot = {
  fileUri: string;
  fileName: string;
  mimeType: string;
};

type Stored = Partial<Record<DocumentType, DeferredKycSlot>>;

async function readStored(): Promise<Stored> {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') return {};
    return j as Stored;
  } catch {
    return {};
  }
}

async function writeStored(s: Stored): Promise<void> {
  const keys = Object.keys(s) as DocumentType[];
  if (keys.length === 0) {
    await SecureStore.deleteItemAsync(SECURE_KEY).catch(() => {});
    return;
  }
  await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(s));
}

export async function clearDeferredMembershipKyc(): Promise<void> {
  const cur = await readStored();
  for (const t of Object.keys(cur) as DocumentType[]) {
    const s = cur[t];
    if (s?.fileUri) {
      await FileSystem.deleteAsync(s.fileUri, { idempotent: true }).catch(() => {});
    }
  }
  await SecureStore.deleteItemAsync(SECURE_KEY).catch(() => {});
}

/** Push any legacy on-device staged files to the server (no-op if nothing staged). */
export async function uploadDeferredMembershipKyc(token: string): Promise<{ errors: string[] }> {
  const cur = await readStored();
  const types: DocumentType[] = ['aadhaar', 'student_id'];
  const errors: string[] = [];
  const next: Stored = { ...cur };

  for (const type of types) {
    const s = cur[type];
    if (!s) continue;
    const info = await FileSystem.getInfoAsync(s.fileUri).catch(() => ({ exists: false as const }));
    if (!('exists' in info) || !info.exists) {
      errors.push(`${type}: missing file on device`);
      delete next[type];
      continue;
    }
    try {
      await api.uploadDocument(token, {
        type,
        fileUri: s.fileUri,
        fileName: s.fileName,
        mimeType: s.mimeType,
      });
      delete next[type];
      await FileSystem.deleteAsync(s.fileUri, { idempotent: true }).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      errors.push(`${type}: ${msg}`);
    }
  }

  await writeStored(next);
  return { errors };
}