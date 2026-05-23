/**
 * Same data path as the website member dashboard (`MemberMembershipHome.tsx`):
 * read `profiles` + latest `verification` + `verification_documents` via Supabase
 * PostgREST with the user's access token (RLS), not only Next `/api/*`.
 *
 * Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same project as the site).
 */

import { createClient } from '@supabase/supabase-js';

import { displayPersonName } from '@/lib/formatPersonName';
import { normalizeMemberContact, phoneFromProfileDb } from '@/lib/memberContact';
import { getSupabasePublicConfig } from '@/lib/supabaseConfig';
import {
  buildMemberKycSlotSummaries,
  kycDisplayFileName,
  mergeVerificationDocsForMember,
  type KycDocType,
  type VerificationDocItem,
} from '@/lib/kycMemberSlots';

type VerRow = { id: string; status: string };

function extrasToDisplayFields(extras: unknown): {
  aadhaar_last_four: string | null;
  student_roll_number: string | null;
  institution_type: string | null;
  preparing_for: string | null;
} {
  const o = extras && typeof extras === 'object' ? (extras as Record<string, unknown>) : {};
  return {
    aadhaar_last_four: (o.aadhaar_last_four as string | null | undefined) ?? null,
    student_roll_number: (o.student_roll_number as string | null | undefined) ?? null,
    institution_type: (o.institution_type as string | null | undefined) ?? null,
    preparing_for: (o.preparing_for as string | null | undefined) ?? null,
  };
}

function hasSubmittedKycDocs(docs: VerificationDocItem[]): boolean {
  return docs.some((d) => d.phase === 'submitted');
}

function kycDocUploadedSlots(docs: VerificationDocItem[]) {
  const has = (dt: KycDocType) =>
    docs.some((d) => d.doc_type === dt && (d.phase === 'checkout_pending' || d.phase === 'submitted'));
  return {
    aadhaarFront: has('aadhaar_front'),
    aadhaarBack: has('aadhaar_back'),
    studentId: has('student_id'),
  };
}

function kycOriginalNamesFromLocalDocs(docs: VerificationDocItem[]) {
  const pick = (dt: KycDocType): string | null => {
    const d = docs.find(
      (x) => x.doc_type === dt && (x.phase === 'checkout_pending' || x.phase === 'submitted'),
    );
    return d ? kycDisplayFileName(d) : null;
  };
  return {
    aadhaarFront: pick('aadhaar_front'),
    aadhaarBack: pick('aadhaar_back'),
    studentId: pick('student_id'),
  };
}

/** Same rules as `manilibrary` `deriveUiVerificationStatus`. */
function deriveUiVerificationStatus(
  isVerified: boolean,
  row: Pick<VerRow, 'status'> | null,
  docs: VerificationDocItem[] = [],
): string {
  if (!row) {
    return isVerified ? 'approved' : 'none';
  }
  if (row.status === 'resubmit') return 'resubmit';
  if (row.status === 'rejected') return 'rejected';
  if (row.status === 'pending') {
    if (!hasSubmittedKycDocs(docs)) return 'none';
    return 'pending';
  }
  if (isVerified) return 'approved';
  return 'none';
}

function parseDeviceUserIdRaw(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.trunc(raw);
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (Number.isFinite(n) && n >= 0) return Math.trunc(n);
    }
  }
  return null;
}

function jwtSub(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    if (typeof atob !== 'function') return null;
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Returns a JSON-shaped object compatible with `pickMemberProfile` in `api.ts`, or `null` if
 * Supabase is not configured, JWT has no `sub`, or the read fails (RLS / network).
 */
export async function tryMemberProfileFromSupabase(accessToken: string): Promise<Record<string, unknown> | null> {
  const cfg = getSupabasePublicConfig();
  const uid = jwtSub(accessToken);
  if (!cfg || !uid) return null;

  const sb = createClient(cfg.url, cfg.anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: prof, error: pe } = await sb
    .from('profiles')
    .select('full_name, device_user_id, phone, email, is_verified, profile_extras, avatar_url, is_admin, is_superadmin')
    .eq('user_id', uid)
    .is('deleted_at', null)
    .maybeSingle();

  if (pe || !prof) return null;

  const [{ data: latestRow, error: latestVerErr }, { data: openRow, error: openVerErr }] = await Promise.all([
    sb
      .from('verification')
      .select('id, status')
      .eq('user_id', uid)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('verification')
      .select('id, status')
      .eq('user_id', uid)
      .in('status', ['pending', 'resubmit'])
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const latestR = (latestVerErr ? null : latestRow) as VerRow | null;
  const openR =
    openVerErr || !openRow || typeof (openRow as { id?: unknown }).id !== 'string'
      ? null
      : (openRow as VerRow);
  const orderedIds = [...new Set([openR?.id, latestR?.id].filter((x): x is string => typeof x === 'string' && x.length > 0))];

  const docMap = new Map<string, VerificationDocItem[]>();
  for (const id of orderedIds) docMap.set(id, []);

  if (orderedIds.length > 0) {
    const full =
      'verification_id, doc_type, phase, storage_bucket, storage_path, content_type, original_filename';
    const min = 'verification_id, doc_type, phase, storage_bucket, storage_path, content_type';
    const rFull = await sb
      .from('verification_documents')
      .select(full)
      .in('verification_id', orderedIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    let docRows: unknown[] | null = (rFull.data as unknown[] | null) ?? null;
    let de = rFull.error;
    if (de && /original_filename|does not exist/i.test(de.message)) {
      const rMin = await sb
        .from('verification_documents')
        .select(min)
        .in('verification_id', orderedIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      docRows = (rMin.data as unknown[] | null) ?? null;
      de = rMin.error;
    }
    if (!de && docRows) {
      for (const r of docRows) {
        const o = r as Record<string, unknown>;
        const vid = String(o.verification_id ?? '');
        const bucket = docMap.get(vid);
        if (!bucket) continue;
        const docType = o.doc_type;
        const phase = o.phase;
        const ofn = o.original_filename;
        if (
          typeof docType === 'string' &&
          (docType === 'aadhaar_front' || docType === 'aadhaar_back' || docType === 'student_id') &&
          (phase === 'checkout_pending' || phase === 'submitted') &&
          typeof o.storage_bucket === 'string' &&
          typeof o.storage_path === 'string' &&
          typeof o.content_type === 'string'
        ) {
          bucket.push({
            doc_type: docType as KycDocType,
            storage_bucket: o.storage_bucket,
            storage_path: o.storage_path,
            content_type: o.content_type,
            phase,
            original_filename: typeof ofn === 'string' && ofn.trim() ? ofn.trim().slice(0, 200) : null,
          });
        }
      }
    }
  }

  const mergedDocs = mergeVerificationDocsForMember(orderedIds, docMap);

  const x = extrasToDisplayFields((prof as { profile_extras?: unknown }).profile_extras);
  const statusSource = openR ?? latestR;
  const rowForUi: Pick<VerRow, 'status'> | null = statusSource ? { status: String(statusSource.status ?? 'none') } : null;
  const verificationStatus = deriveUiVerificationStatus(
    (prof as { is_verified?: boolean }).is_verified === true,
    rowForUi,
    mergedDocs,
  );

  const isVerifiedProf = (prof as { is_verified?: boolean }).is_verified === true;
  const memberKycSlots = buildMemberKycSlotSummaries(isVerifiedProf, verificationStatus, mergedDocs);

  const isStaff =
    (prof as { is_admin?: boolean }).is_admin === true ||
    (prof as { is_superadmin?: boolean }).is_superadmin === true;
  const role = isStaff ? 'admin' : 'student';
  const deviceUserId = parseDeviceUserIdRaw((prof as { device_user_id?: unknown }).device_user_id);
  const libraryNumber = deviceUserId !== null ? String(deviceUserId).padStart(4, '0') : '—';

  const contact = normalizeMemberContact(
    (prof as { email?: string | null }).email,
    phoneFromProfileDb((prof as { phone?: unknown }).phone),
  );

  return {
    id: uid,
    role,
    name: displayPersonName((prof as { full_name?: string }).full_name, 'Member'),
    email: contact.email,
    phone: contact.phone,
    deviceUserId,
    libraryNumber,
    avatarUrl: ((prof as { avatar_url?: string | null }).avatar_url as string | null) ?? null,
    verificationStatus,
    kycDocUploaded: kycDocUploadedSlots(mergedDocs),
    kycDocOriginalNames: kycOriginalNamesFromLocalDocs(mergedDocs),
    memberKycSlots,
    aadhaarLastFour: x.aadhaar_last_four,
    studentRollNumber: x.student_roll_number,
    institutionType: x.institution_type,
    preparingFor: x.preparing_for,
  };
}
