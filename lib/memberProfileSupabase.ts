/**
 * Same data path as the website member dashboard (`MemberMembershipHome.tsx`):
 * read `profiles` + latest `verification` + `verification_documents` via Supabase
 * PostgREST with the user's access token (RLS), not only Next `/api/*`.
 *
 * Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same project as the site).
 */

import { createClient } from '@supabase/supabase-js';

import { displayPersonName } from '@/lib/formatPersonName';

type KycDocType = 'aadhaar_front' | 'aadhaar_back' | 'student_id';
type DocPhase = 'checkout_pending' | 'submitted';

type VerificationDocItem = {
  doc_type: KycDocType;
  storage_bucket: string;
  storage_path: string;
  content_type: string;
  phase: DocPhase;
};

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

function supabaseUrlKey(): { url: string; anon: string } | null {
  const url = typeof process.env.EXPO_PUBLIC_SUPABASE_URL === 'string' ? process.env.EXPO_PUBLIC_SUPABASE_URL.trim() : '';
  const anon =
    typeof process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'string' ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim() : '';
  if (!url || !anon) return null;
  return { url, anon };
}

/**
 * Returns a JSON-shaped object compatible with `pickMemberProfile` in `api.ts`, or `null` if
 * Supabase is not configured, JWT has no `sub`, or the read fails (RLS / network).
 */
export async function tryMemberProfileFromSupabase(accessToken: string): Promise<Record<string, unknown> | null> {
  const cfg = supabaseUrlKey();
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

  const { data: latestRow } = await sb
    .from('verification')
    .select('id, status')
    .eq('user_id', uid)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestDocs: VerificationDocItem[] = [];
  const row = latestRow as VerRow | null;
  if (row?.id) {
    const { data: docRows, error: de } = await sb
      .from('verification_documents')
      .select('doc_type, phase, storage_bucket, storage_path, content_type')
      .eq('verification_id', row.id)
      .is('deleted_at', null);
    if (!de) {
      for (const r of docRows ?? []) {
        const o = r as Record<string, unknown>;
        const docType = o.doc_type;
        const phase = o.phase;
        if (
          typeof docType === 'string' &&
          (docType === 'aadhaar_front' || docType === 'aadhaar_back' || docType === 'student_id') &&
          (phase === 'checkout_pending' || phase === 'submitted') &&
          typeof o.storage_bucket === 'string' &&
          typeof o.storage_path === 'string' &&
          typeof o.content_type === 'string'
        ) {
          latestDocs.push({
            doc_type: docType as KycDocType,
            storage_bucket: o.storage_bucket,
            storage_path: o.storage_path,
            content_type: o.content_type,
            phase,
          });
        }
      }
    }
  }

  const x = extrasToDisplayFields((prof as { profile_extras?: unknown }).profile_extras);
  const rowForUi: Pick<VerRow, 'status'> | null = row ? { status: String(row.status ?? 'none') } : null;
  const verificationStatus = deriveUiVerificationStatus(
    (prof as { is_verified?: boolean }).is_verified === true,
    rowForUi,
    latestDocs,
  );

  const isStaff =
    (prof as { is_admin?: boolean }).is_admin === true ||
    (prof as { is_superadmin?: boolean }).is_superadmin === true;
  const role = isStaff ? 'admin' : 'student';
  const deviceUserId = parseDeviceUserIdRaw((prof as { device_user_id?: unknown }).device_user_id);
  const libraryNumber = deviceUserId !== null ? String(deviceUserId).padStart(4, '0') : '—';

  return {
    id: uid,
    role,
    name: displayPersonName((prof as { full_name?: string }).full_name, 'Member'),
    email: ((prof as { email?: string | null }).email as string | null) ?? undefined,
    phone: ((prof as { phone?: string | null }).phone as string | null) ?? undefined,
    deviceUserId,
    libraryNumber,
    avatarUrl: ((prof as { avatar_url?: string | null }).avatar_url as string | null) ?? null,
    verificationStatus,
    aadhaarLastFour: x.aadhaar_last_four,
    studentRollNumber: x.student_roll_number,
    institutionType: x.institution_type,
    preparingFor: x.preparing_for,
  };
}
