/**
 * KYC upload prep — aligns with manilibrary `/api/me/verification/document` limits:
 * max 5 MB; types JPEG, PNG, WebP, PDF only (no HEIC — server rejects it; avoid native compressors).
 */
import * as FileSystem from 'expo-file-system/legacy';

const MAX_BYTES = 5 * 1024 * 1024;

export type KycPreparedUpload = {
  fileUri: string;
  mimeType: string;
  fileName: string;
  deleteAfterUpload: boolean;
};

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'document';
}

function mimeBase(m: string): string {
  return m.split(';')[0].trim().toLowerCase();
}

export async function prepareKycUploadFromLocalUri(args: {
  localUri: string;
  mimeType: string;
  suggestedName: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
}): Promise<KycPreparedUpload> {
  const mimeType = mimeBase(args.mimeType);
  const suggestedName = args.suggestedName || 'document';

  if (mimeType === 'application/pdf') {
    const info = await FileSystem.getInfoAsync(args.localUri);
    if (!info.exists) throw new Error('Could not read file.');
    if (info.size > MAX_BYTES) throw new Error('File too large (max 5 MB).');
    const fileName = suggestedName.toLowerCase().endsWith('.pdf')
      ? suggestedName
      : `${stripExt(suggestedName)}.pdf`;
    return {
      fileUri: args.localUri,
      mimeType: 'application/pdf',
      fileName,
      deleteAfterUpload: false,
    };
  }

  if (!mimeType.startsWith('image/')) {
    throw new Error('Only JPEG, PNG, WebP, or PDF allowed.');
  }

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    throw new Error('HEIC is not supported. Please choose a JPEG, PNG, WebP, or PDF file.');
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/pjpeg'].includes(mimeType)) {
    throw new Error('Only JPEG, PNG, WebP, or PDF allowed.');
  }

  const info = await FileSystem.getInfoAsync(args.localUri);
  if (!info.exists) throw new Error('Could not read file.');
  if (info.size > MAX_BYTES) throw new Error('File too large (max 5 MB).');

  return {
    fileUri: args.localUri,
    mimeType,
    fileName: suggestedName,
    deleteAfterUpload: false,
  };
}
