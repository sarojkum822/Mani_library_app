/**
 * Mirrors `manilibrary` `verification-repo` member KYC helpers (keep in sync when rules change).
 */
export type KycDocType = 'aadhaar_front' | 'aadhaar_back' | 'student_id';
export const KYC_DOC_TYPES: KycDocType[] = ['aadhaar_front', 'aadhaar_back', 'student_id'];

export type DocPhase = 'checkout_pending' | 'submitted';

export type VerificationDocItem = {
  doc_type: KycDocType;
  storage_bucket: string;
  storage_path: string;
  content_type: string;
  phase: DocPhase;
  original_filename?: string | null;
};

export function kycDisplayFileName(d: Pick<VerificationDocItem, 'original_filename' | 'storage_path'>): string {
  const raw = typeof d.original_filename === 'string' ? d.original_filename.trim() : '';
  if (raw) return raw.slice(0, 200);
  const seg = d.storage_path.split('/').pop();
  return seg || 'file';
}

export function mergeVerificationDocsForMember(
  orderedVerificationIds: string[],
  docMap: Map<string, VerificationDocItem[]>,
): VerificationDocItem[] {
  const out: VerificationDocItem[] = [];
  const seen = new Set<string>();
  for (const vid of orderedVerificationIds) {
    for (const d of docMap.get(vid) ?? []) {
      const k = `${d.doc_type}:${d.phase}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(d);
    }
  }
  return out;
}

export type MemberKycSlotStatus = 'not_uploaded' | 'pending_review' | 'verified' | 'queued_checkout';

export type MemberKycSlotSummary = {
  fileName: string | null;
  memberStatus: MemberKycSlotStatus;
};

export function buildMemberKycSlotSummaries(
  isVerifiedProfile: boolean,
  verificationUiStatus: string,
  mergedDocs: VerificationDocItem[],
): Record<KycDocType, MemberKycSlotSummary> {
  const v = (verificationUiStatus || 'none').toLowerCase();
  const approvedLike = isVerifiedProfile || v === 'approved';
  const out = {} as Record<KycDocType, MemberKycSlotSummary>;
  for (const dt of KYC_DOC_TYPES) {
    const sub = mergedDocs.find((d) => d.doc_type === dt && d.phase === 'submitted');
    const chk = mergedDocs.find((d) => d.doc_type === dt && d.phase === 'checkout_pending');
    const pick = sub ?? chk;
    const fileName = pick ? kycDisplayFileName(pick) : null;
    let memberStatus: MemberKycSlotStatus = 'not_uploaded';
    if (approvedLike) {
      if (sub) memberStatus = 'verified';
      else if (chk) memberStatus = 'queued_checkout';
      else memberStatus = 'verified';
    } else if (sub) memberStatus = 'pending_review';
    else if (chk) memberStatus = 'queued_checkout';
    out[dt] = { fileName, memberStatus };
  }
  return out;
}
