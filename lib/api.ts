import type { PunchRecord } from '@/lib/attendance';
import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';
import { formatYmdDdMmYyyy, ymdFromIsoish } from '@/lib/dates';
import type { Member } from '@/lib/members';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { displayPersonName } from '@/lib/formatPersonName';
import { normalizeMemberContact } from '@/lib/memberContact';
import type { KycDocType, MemberKycSlotSummary } from '@/lib/kycMemberSlots';
import { cacheKeys, invalidateDataCacheKey } from '@/lib/dataCache';
import { tryMemberProfileFromSupabase } from '@/lib/memberProfileSupabase';
import { invalidatePublicGalleryCache } from '@/lib/publicContentCache';
import type { Role } from '@/lib/storage';

function nameFromApi(raw: unknown, fallback = 'Member'): string {
  if (raw == null) return fallback;
  const s = String(raw);
  if (s.trim() === '—') return '—';
  return displayPersonName(s, fallback);
}

export type ApiUser = {
  id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  /** From `profiles.device_user_id` when returned by `GET /api/auth/me`. */
  deviceUserId?: number;
};

export type MemberKycSlots = Record<KycDocType, MemberKycSlotSummary>;

/** Same fields as web dashboard “Your profile” + intake extras (from `GET /api/me/member-profile`). */
export type MemberProfile = {
  id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  deviceUserId: number | null;
  /** Four-digit device user id (leading zeros), for desk / biometric. */
  libraryNumber: string;
  avatarUrl: string | null;
  /** Raw UI status: `approved` | `pending` | `rejected` | `resubmit` | `none` */
  verificationStatus: string;
  /**
   * Which KYC files exist on the latest verification row (`submitted` or `checkout_pending`).
   * Omitted when the API does not send this field (legacy — document rows fall back to coarse mapping).
   */
  kycDocUploaded?: {
    aadhaarFront: boolean;
    aadhaarBack: boolean;
    studentId: boolean;
  };
  /** Display filenames for active KYC slots (null = none). */
  kycDocOriginalNames?: {
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    studentId: string | null;
  };
  /** Per-slot filename + member-facing status (matches website Profile & KYC). */
  memberKycSlots?: MemberKycSlots;
  aadhaarLastFour: string | null;
  studentRollNumber: string | null;
  institutionType: string | null;
  preparingFor: string | null;
};

export type LoginRequest = {
  emailOrPhone: string;
  passwordOrOtp: string;
};

export type LoginResponse = {
  token: string;
  user: ApiUser;
};

export type SignUpRequest = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type SignUpResponse = {
  ok: true;
  needsEmailConfirmation?: boolean;
  token?: string;
  user?: ApiUser;
};

export type MembershipStatus = 'active' | 'expiring_soon' | 'expired' | 'upcoming' | 'none';

export type Membership = {
  status: MembershipStatus;
  planName?: string;
  /** Marketing plan id from website `libraryInfo.plans` (`row-hall` | `main-hall`). */
  planMarketingId?: string;
  /** ISO — first day of access (future memberships). */
  startsAt?: string;
  expiresAt?: string; // ISO
  daysLeft?: number;
  /** Padded `profiles.device_user_id` (desk / biometric), from me-active + profile. */
  deviceUserId?: string;
  seatNo?: string;
  floor?: string;
  /**
   * From `GET /api/memberships/me-active`: show renew / change-plan CTAs only when true
   * (within 3 days of window end, or latest membership row is admin-cancelled).
   */
  renewPlanEligible?: boolean;
};

/** One line in the membership / payments ledger (backend: invoices, renewals, refunds). */
export type MembershipHistoryEntry = {
  id: string;
  kind: 'renewal' | 'payment' | 'adjustment';
  /** Short headline, e.g. "Renewal — Full Day" */
  title: string;
  occurredAt: string; // ISO
  planName?: string;
  /** Display amount e.g. "₹2,499" */
  amount?: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  /** Coverage label e.g. "3 months" or date range copy from backend */
  periodLabel?: string;
  receiptId?: string;
};

/** One calendar day from `GET /api/me/today-attendance` (same as website member dashboard). */
export type MemberAttendanceDailyRow = {
  in_time: string;
  out_time: string;
  work_time: string;
  overtime: string;
  status: string;
  date: string;
  remark: string;
};

export type MemberAttendanceToday = {
  deviceUserId?: number;
  attendanceDate?: string;
  today?: string;
  historyFromYmd?: string;
  historyFromDmy?: string;
  daily: MemberAttendanceDailyRow | null;
  history: MemberAttendanceDailyRow[];
  hasIn?: boolean;
  hasOut?: boolean;
  note?: string | null;
};

export type DocumentType = 'aadhaar' | 'student_id';
export type DocumentStatus = 'not_uploaded' | 'pending' | 'verified' | 'rejected';

export type DocumentState = {
  type: DocumentType;
  status: DocumentStatus;
  updatedAt?: string; // ISO
  rejectionReason?: string;
  /** Server-reported label for the current file (member profile `kycDocOriginalNames`). */
  uploadedFileName?: string | null;
};

/** Result of `api.documents` — includes raw status so the Doc screen can hide Upload when the API rejects new files. */
export type MemberDocumentsPayload = {
  items: DocumentState[];
  verificationStatus: string;
  memberKycSlots?: MemberKycSlots;
};

export type PendingDoc = {
  id: string;
  memberId: string;
  studentName: string;
  aadhaar: DocumentState;
  studentId: DocumentState;
};

/** Member awaiting KYC review (`verification_status === 'pending'`). */
export type AdminPendingKycMember = {
  userId: string;
  studentName: string;
  libraryNumber: string;
  verificationStatus: string;
};

export type AdminKycDocument = {
  docType: string;
  contentType: string | null;
  signedUrl: string;
};

/** Same body as `POST /api/admin/members/manual-enroll` on the staff website. */
export type AdminManualEnrollInput = {
  /** Omit when creating a new login (provide full_name + email). */
  existing_user_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  plan_kind: 'short_term' | 'long_term';
  seat_number: number;
  membership_start_date: string;
  duration_key: string;
  amount_rupees: number;
  payment_method: string;
  external_reference?: string;
  staff_note?: string;
  mark_kyc_verified?: boolean;
};

export type AdminManualEnrollResult = {
  user_id: string;
  device_user_id: number;
  membership_id: string;
  payment_id: string;
  temporary_password?: string;
};

export type GalleryImage = {
  id: string;
  url: string;
  sortOrder?: number;
  createdAt?: string;
};

export type PublicHeroSlot = {
  slot: 1 | 2 | 3;
  galleryImageId: string | null;
  imageUrl: string | null;
  tagline: string | null;
  taglineSub: string | null;
};

export type PublicHeroSettings = {
  slots: PublicHeroSlot[];
};

export type PublicTestimonial = {
  fullName: string;
  subtitle: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
};

export type MemberFeedback = {
  rating: number;
  comment: string;
  submittedAt: string;
  approved: boolean;
  editable: boolean;
  editAvailableFrom: string | null;
};

export type AdminFeedbackRow = {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  deviceUserId: number | null;
  rating: number;
  comment: string;
  submittedAt: string | null;
  approved: boolean;
};

export type AdminRecentPunch = {
  empcode: string;
  deviceUserId: number | null;
  fullName: string | null;
  punchDate: string;
  flag: string | null;
  source: string;
};

export type ResumableCheckout = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  fingerprint: string;
  planKind: string;
  seatNumber: number;
  membershipStartDate: string;
  durationKey: string;
  amountRupees: number;
  seatLabel: string;
};

/** Vercel production — default API origin when `EXPO_PUBLIC_API_BASE_URL` is unset (see `resolveApiBaseUrl`). */
const DEFAULT_PRODUCTION_API_BASE = 'https://www.manilibrary.com';

const RAW_API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const RAW_GET_CACHE_MS = process.env.EXPO_PUBLIC_API_GET_CACHE_MS;

/** In-memory GET cache TTL (ms). 0 = off. Set e.g. `10000` to cut duplicate calls while developing. */
const GET_CACHE_MS = (() => {
  if (typeof RAW_GET_CACHE_MS !== 'string') return 0;
  const t = RAW_GET_CACHE_MS.trim();
  if (t === '' || t === '0') return 0;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 120_000);
})();

type GetCacheEntry = { expiresAt: number; payload: unknown };
const getResponseCache = new Map<string, GetCacheEntry>();

/** Drop cached GET responses (e.g. after sign-out). */
export function clearApiGetCache(): void {
  getResponseCache.clear();
}

/** After checkout or profile-changing actions — drop membership/payment GET cache entries. */
export function invalidateMemberAccountCache(): void {
  if (GET_CACHE_MS <= 0) return;
  for (const key of getResponseCache.keys()) {
    if (
      key.includes('/api/memberships/me-active') ||
      key.includes('/api/payments/me') ||
      key.includes('/api/me/member-profile') ||
      key.includes('/api/auth/me')
    ) {
      getResponseCache.delete(key);
    }
  }
}

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '');
}

/**
 * Resolves the API origin (no trailing slash):
 * 1. `EXPO_PUBLIC_API_BASE_URL` when set.
 * 2. In `__DEV__` on a simulator or Expo web (not a physical phone): local manilibrary — `http://localhost:3000`
 *    or `http://10.0.2.2:3000` (Android emulator).
 * 3. Otherwise: production https://www.manilibrary.com (Vercel).
 */
function resolveApiBaseUrl(): string {
  const raw = typeof RAW_API_BASE === 'string' ? RAW_API_BASE.trim() : '';
  if (raw) return trimTrailingSlashes(raw);

  if (__DEV__ && (!Constants.isDevice || Platform.OS === 'web')) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  return DEFAULT_PRODUCTION_API_BASE;
}

const RESOLVED_BASE_URL = resolveApiBaseUrl();

/** Safe label for UI (e.g. admin screens) — does not throw if env is missing. */
export function apiSiteOrigin(): string {
  return assertBaseUrl();
}

export function apiPublicBaseHostLabel(): string {
  if (!RESOLVED_BASE_URL) return 'not configured';
  try {
    return new URL(RESOLVED_BASE_URL).host;
  } catch {
    return RESOLVED_BASE_URL;
  }
}

function assertBaseUrl(): string {
  if (!RESOLVED_BASE_URL) {
    throw new Error('API base URL could not be resolved.');
  }
  return RESOLVED_BASE_URL;
}

/** `profiles.device_user_id` may be number or numeric string from PostgREST / JSON. */
function parseDeviceUserIdNumber(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (Number.isFinite(n) && n >= 0) return Math.trunc(n);
    }
  }
  return undefined;
}

function formatDeviceUserIdLabel(n: number): string {
  return String(Math.trunc(n)).padStart(4, '0');
}

/** Padded id for Profile / Membership when `libraryNumber` from API is missing. */
export function deviceUserIdDisplayFromProfile(p: MemberProfile | null | undefined): string {
  if (!p) return '—';
  const ln = (p.libraryNumber ?? '').trim();
  if (ln && ln !== '—') return ln;
  if (p.deviceUserId != null && Number.isFinite(p.deviceUserId)) return formatDeviceUserIdLabel(p.deviceUserId);
  return '—';
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    const hint = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      hint
        ? `API ${res.status} (${res.url}): response was not JSON — ${hint}`
        : `API ${res.status} (${res.url}): empty or non-JSON response. Check EXPO_PUBLIC_API_BASE_URL and that the server route exists.`,
    );
  }
  const o = json as Record<string, unknown>;
  if (!res.ok || o.ok === false) {
    const msg =
      typeof o.error === 'string'
        ? o.error
        : typeof o.message === 'string'
          ? o.message
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

async function request<T>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const base = assertBaseUrl();
  const method = opts.method ?? 'GET';
  const cacheable = GET_CACHE_MS > 0 && method === 'GET' && opts.body === undefined;
  const cacheKey = cacheable ? `${path}\0${opts.token ?? ''}` : '';

  if (cacheable) {
    const hit = getResponseCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.payload as T;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-App-Client': 'expo',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : null),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    throw new Error(
      `Could not reach ${base}. Check EXPO_PUBLIC_API_BASE_URL, device network, and HTTPS. (${msg})`,
    );
  }
  const parsed = await parseJsonResponse<T>(res);
  if (cacheable && res.ok) {
    getResponseCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_MS, payload: parsed });
  }
  return parsed;
}

function pickKycDocOriginalNames(j: Record<string, unknown>): MemberProfile['kycDocOriginalNames'] {
  if (!('kycDocOriginalNames' in j)) return undefined;
  const o = j.kycDocOriginalNames;
  if (!o || typeof o !== 'object') return undefined;
  const r = o as Record<string, unknown>;
  const s = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
  return {
    aadhaarFront: s(r.aadhaarFront),
    aadhaarBack: s(r.aadhaarBack),
    studentId: s(r.studentId),
  };
}

function pickKycDocUploaded(j: Record<string, unknown>): MemberProfile['kycDocUploaded'] {
  if (!('kycDocUploaded' in j)) return undefined;
  const o = j.kycDocUploaded;
  if (!o || typeof o !== 'object') return undefined;
  const r = o as Record<string, unknown>;
  return {
    aadhaarFront: r.aadhaarFront === true,
    aadhaarBack: r.aadhaarBack === true,
    studentId: r.studentId === true,
  };
}

function pickOneMemberKycSlot(raw: unknown): MemberKycSlotSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ms = r.memberStatus;
  if (ms !== 'not_uploaded' && ms !== 'pending_review' && ms !== 'verified' && ms !== 'queued_checkout') {
    return null;
  }
  const fn = r.fileName;
  return {
    fileName: typeof fn === 'string' && fn.trim() ? fn.trim() : null,
    memberStatus: ms,
  };
}

function pickMemberKycSlots(j: Record<string, unknown>): MemberKycSlots | undefined {
  if (!('memberKycSlots' in j)) return undefined;
  const raw = j.memberKycSlots;
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const a = pickOneMemberKycSlot(r.aadhaar_front);
  const b = pickOneMemberKycSlot(r.aadhaar_back);
  const s = pickOneMemberKycSlot(r.student_id);
  if (!a || !b || !s) return undefined;
  return { aadhaar_front: a, aadhaar_back: b, student_id: s };
}

function pickMemberProfile(j: Record<string, unknown>): MemberProfile {
  const role: Role = j.role === 'admin' ? 'admin' : 'student';
  const duParsed =
    parseDeviceUserIdNumber(j.deviceUserId) ?? parseDeviceUserIdNumber(j.device_user_id);
  const deviceUserId = duParsed !== undefined ? duParsed : null;
  let libraryNumber = typeof j.libraryNumber === 'string' && j.libraryNumber.trim() ? j.libraryNumber.trim() : '—';
  if (libraryNumber === '—' && duParsed !== undefined) {
    libraryNumber = formatDeviceUserIdLabel(duParsed);
  }
  const contact = normalizeMemberContact(
    typeof j.email === 'string' ? j.email : undefined,
    typeof j.phone === 'string' ? j.phone : undefined,
  );
  return {
    id: String(j.id ?? ''),
    role,
    name: nameFromApi(j.name, 'Member'),
    email: contact.email,
    phone: contact.phone,
    deviceUserId,
    libraryNumber,
    avatarUrl: typeof j.avatarUrl === 'string' ? j.avatarUrl : null,
    verificationStatus: typeof j.verificationStatus === 'string' ? j.verificationStatus : 'none',
    kycDocUploaded: pickKycDocUploaded(j),
    kycDocOriginalNames: pickKycDocOriginalNames(j),
    memberKycSlots: pickMemberKycSlots(j),
    aadhaarLastFour: j.aadhaarLastFour === null || typeof j.aadhaarLastFour === 'string' ? (j.aadhaarLastFour as string | null) : null,
    studentRollNumber:
      j.studentRollNumber === null || typeof j.studentRollNumber === 'string'
        ? (j.studentRollNumber as string | null)
        : null,
    institutionType:
      j.institutionType === null || typeof j.institutionType === 'string' ? (j.institutionType as string | null) : null,
    preparingFor:
      j.preparingFor === null || typeof j.preparingFor === 'string' ? (j.preparingFor as string | null) : null,
  };
}

type MeActiveMembership = {
  id: string;
  plan_kind: string;
  status: string;
  seat_number?: string | number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
};

function planLabelFromKind(planKind: string): string {
  if (planKind === 'short_term') return 'Short-term (row hall)';
  if (planKind === 'long_term') return 'Long-term (main hall)';
  return planKind.replace(/_/g, ' ');
}

function seatDisplayFromRow(m: MeActiveMembership): string {
  const s = m.seat_number;
  if (s == null) return '—';
  const t = String(s).trim();
  return t ? t.replace(/\s/g, '') : '—';
}

function membershipEndMs(row: MeActiveMembership): number | null {
  if (row.plan_kind === 'short_term' && row.ends_at) {
    const t = Date.parse(row.ends_at);
    return Number.isFinite(t) ? t : null;
  }
  if (row.plan_kind === 'long_term' && row.valid_until) {
    const t = Date.parse(`${row.valid_until}T23:59:59.999Z`);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function membershipStartMs(row: MeActiveMembership): number | null {
  if (row.plan_kind === 'short_term' && row.starts_at) {
    const t = Date.parse(row.starts_at);
    return Number.isFinite(t) ? t : null;
  }
  if (row.plan_kind === 'long_term' && row.valid_from) {
    const ymd = String(row.valid_from).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const t = Date.parse(`${ymd}T00:00:00+05:30`);
      return Number.isFinite(t) ? t : null;
    }
  }
  return null;
}

function mapMeActiveToMembership(membership: MeActiveMembership | null | undefined): Membership {
  if (!membership) {
    return { status: 'none' };
  }
  const planName = planLabelFromKind(membership.plan_kind);
  const floor = membership.plan_kind === 'long_term' ? 'Main hall' : 'Row hall';
  const startMs = membershipStartMs(membership);
  const endMs = membershipEndMs(membership);
  const now = Date.now();
  let daysLeft: number | undefined;
  let status: Membership['status'] = 'active';

  if (membership.status === 'pending_payment') {
    status = 'upcoming';
  } else if (startMs != null && startMs > now) {
    status = 'upcoming';
  } else if (endMs != null) {
    daysLeft = Math.max(0, Math.ceil((endMs - now) / 86400000));
    if (endMs < now) status = 'expired';
    else if (daysLeft <= 14) status = 'expiring_soon';
  }

  const planMarketingId =
    membership.plan_kind === 'long_term' ? 'main-hall' : membership.plan_kind === 'short_term' ? 'row-hall' : undefined;

  return {
    status,
    planName,
    planMarketingId,
    startsAt: startMs != null ? new Date(startMs).toISOString() : undefined,
    expiresAt: endMs != null ? new Date(endMs).toISOString() : undefined,
    daysLeft: status === 'upcoming' ? undefined : daysLeft,
    seatNo: seatDisplayFromRow(membership),
    floor,
  };
}

type PaymentMeRow = {
  id: string;
  amountRupees: number;
  status: string;
  createdAt: string;
  membership: {
    planTitle: string;
    windowLabel: string;
    seatLabel?: string;
  } | null;
  razorpayPaymentId?: string | null;
};

function mapPaymentStatus(s: string): MembershipHistoryEntry['status'] {
  if (s === 'paid') return 'paid';
  if (s === 'pending') return 'pending';
  if (s === 'failed') return 'failed';
  return 'refunded';
}

type AdminDailyItem = {
  date: string;
  empcode: string;
  full_name: string | null;
  in_time: string;
  out_time: string;
  work_time: string;
  status: string;
  status_ui: string;
  remark: string;
};

function adminItemToPunch(item: AdminDailyItem): PunchRecord {
  let Status: PunchRecord['Status'] = 'P';
  if (item.status_ui === 'absent') Status = 'A';
  else if (item.status_ui === 'week_off') Status = 'WO';
  else if (item.status_ui === 'holiday') Status = 'H';
  else if (item.status_ui === 'present') Status = 'P';
  return {
    Empcode: item.empcode,
    Name: item.full_name ? nameFromApi(item.full_name, '—') : '—',
    INTime: item.in_time,
    OUTTime: item.out_time,
    WorkTime: item.work_time,
    OverTime: '00:00',
    BreakTime: '00:00',
    Status,
    DateString: item.date,
    Remark: item.remark,
    Erl_Out: '00:00',
    Late_In: '00:00',
  };
}

function planKindToMarketingPlanId(planKind: string): string {
  if (planKind === 'long_term') return 'main-hall';
  if (planKind === 'short_term') return 'row-hall';
  return '';
}

type MembersListRow = {
  id: string;
  user_id: string;
  plan_kind: string;
  status: string;
  seat_number: string | number | null;
  created_at: string;
  valid_from: string | null;
  valid_until: string | null;
  starts_at: string | null;
  ends_at: string | null;
  current_on_library_day?: boolean;
  window_state?: string;
};

function ymdFromMembershipRow(row: {
  plan_kind: string;
  valid_until: string | null;
  ends_at: string | null;
  created_at: string;
}): string {
  if (row.plan_kind === 'long_term' && row.valid_until) {
    const t = String(row.valid_until).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  }
  if (row.ends_at) {
    const t = String(row.ends_at).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  }
  return String(row.created_at).slice(0, 10);
}

function membershipWindowLabel(row: MembersListRow): string {
  if (row.plan_kind === 'long_term') {
    const a = ymdFromIsoish(row.valid_from);
    const b = ymdFromIsoish(row.valid_until);
    if (a && b) return `${formatYmdDdMmYyyy(a)} → ${formatYmdDdMmYyyy(b)}`;
  }
  const sa = row.starts_at ? String(row.starts_at).slice(0, 10) : '';
  const sb = row.ends_at ? String(row.ends_at).slice(0, 10) : '';
  if (sa && sb && /^\d{4}-\d{2}-\d{2}$/.test(sa) && /^\d{4}-\d{2}-\d{2}$/.test(sb)) {
    return `${formatYmdDdMmYyyy(sa)} → ${formatYmdDdMmYyyy(sb)}`;
  }
  if (sa || sb) {
    const fa = sa && /^\d{4}-\d{2}-\d{2}$/.test(sa) ? formatYmdDdMmYyyy(sa) : sa || '—';
    const fb = sb && /^\d{4}-\d{2}-\d{2}$/.test(sb) ? formatYmdDdMmYyyy(sb) : sb || '—';
    return `${fa} → ${fb}`;
  }
  return '—';
}

function mapDbMembershipStatus(row: MembersListRow): Member['status'] {
  const s = String(row.status || '')
    .trim()
    .toLowerCase();
  if (s === 'cancelled') return 'cancelled';
  if (s === 'pending_payment') return 'pending';
  if (s === 'active') return 'active';
  if (s === 'expired') return 'expired';
  return 'expired';
}

type ProfileMini = {
  user_id: string;
  full_name: string;
  device_user_id: number;
  email: string | null;
  created_at?: string;
  verification_status?: string;
};

/** Mirrors `GET /api/admin/overview` → `stats` + `seatSnapshot` on the staff website. */
export type AdminOverviewStats = {
  activeTotal: number;
  activeLong: number;
  activeShort: number;
  activeMembersDistinct: number;
  totalMembers: number;
  registeredAccounts: number;
  revenue30dInr: number;
  revenueTodayInr: number;
  paidCountToday: number;
  paidCount30d: number;
  totalPaidRevenueInr: number;
  pendingPayments: number;
  newMemberships30d: number;
};

export type AdminSeatSnapshot = {
  longTermDistinctSeats: number;
  shortTermDistinctSeats: number;
};

export type AdminOverviewChart = {
  revenueByDay: Array<{ day: string; amountInr: number }>;
  membershipsCreatedByDay: Array<{ day: string; count: number }>;
  maxRevenueInr: number;
  maxMembershipsCreated: number;
};

export type AdminOverviewSnapshot = {
  stats: AdminOverviewStats;
  seatSnapshot: AdminSeatSnapshot;
  chart: AdminOverviewChart;
  expiringSoon: Array<{
    id: string;
    userId: string;
    name: string;
    memberIdLabel: string;
    plan: string;
    planKindRaw: string;
    libraryNumber: string;
    seatNo: string;
    endLabel: string;
    expiryDate: string;
  }>;
  recentPayments: Array<{
    id: string;
    name: string;
    memberIdLabel: string;
    libraryNumber: string;
    amount: number;
    date: string;
    createdAt: string;
    status: string;
    provider: string;
    plan: string;
  }>;
};

/** Same rows as website `StaffPaymentsPanel` (`GET /api/admin/payments/list`). */
export type AdminPaymentListRow = {
  id: string;
  userId: string;
  amountRupees: number;
  currency: string;
  provider: string | null;
  status: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  createdAt: string;
  detail: string | null;
};

export type AdminPaymentListProfile = {
  userId: string;
  fullName: string;
  deviceUserId: number;
};

export type AdminPaymentsListPayload = {
  rows: AdminPaymentListRow[];
  profiles: Record<string, AdminPaymentListProfile>;
};

export type RazorpayCreateOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentId: string;
  membershipId: string;
  hostedCheckoutUrl?: string;
};

function documentsFromVerificationStatus(vRaw: string): DocumentState[] {
  const v = (vRaw || 'none').toLowerCase();
  let aad: DocumentStatus = 'not_uploaded';
  let stu: DocumentStatus = 'not_uploaded';
  if (v === 'approved') {
    aad = 'verified';
    stu = 'verified';
  } else if (v === 'pending') {
    aad = 'pending';
    stu = 'pending';
  } else if (v === 'rejected') {
    aad = 'rejected';
    stu = 'rejected';
  } else if (v === 'resubmit') {
    aad = 'rejected';
    stu = 'not_uploaded';
  }
  return [
    { type: 'aadhaar', status: aad },
    { type: 'student_id', status: stu },
  ];
}

/** Per-slot document row when `kycDocUploaded` is present on member profile (matches website dashboard). */
function documentItemsFromVerificationAndSlots(
  vRaw: string,
  slots: MemberProfile['kycDocUploaded'],
  names?: MemberProfile['kycDocOriginalNames'],
): DocumentState[] {
  if (!slots) return documentsFromVerificationStatus(vRaw);
  const v = (vRaw || 'none').toLowerCase();
  const aUp = slots.aadhaarFront || slots.aadhaarBack;
  const sUp = slots.studentId;
  const uploadedOrMissing = (up: boolean): DocumentStatus => (up ? 'pending' : 'not_uploaded');
  const aadLabel =
    names && (names.aadhaarFront || names.aadhaarBack)
      ? [names.aadhaarFront, names.aadhaarBack].filter(Boolean).join(' · ')
      : null;
  const stuLabel = names?.studentId ?? null;

  if (v === 'approved') {
    return [
      { type: 'aadhaar', status: 'verified', uploadedFileName: aadLabel },
      { type: 'student_id', status: 'verified', uploadedFileName: stuLabel },
    ];
  }
  if (v === 'rejected') {
    return [
      { type: 'aadhaar', status: 'rejected', uploadedFileName: aadLabel },
      { type: 'student_id', status: 'rejected', uploadedFileName: stuLabel },
    ];
  }
  if (v === 'resubmit') {
    return [
      {
        type: 'aadhaar',
        status: aUp ? 'pending' : 'rejected',
        uploadedFileName: aUp ? aadLabel : undefined,
      },
      {
        type: 'student_id',
        status: uploadedOrMissing(sUp),
        uploadedFileName: sUp ? stuLabel : undefined,
      },
    ];
  }
  return [
    {
      type: 'aadhaar',
      status: uploadedOrMissing(aUp),
      uploadedFileName: aUp ? aadLabel : undefined,
    },
    {
      type: 'student_id',
      status: uploadedOrMissing(sUp),
      uploadedFileName: sUp ? stuLabel : undefined,
    },
  ];
}

function expiringYmdFromEndLabel(endLabel: string): string {
  const el = endLabel.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(el)) return el;
  if (/^\d{4}-\d{2}-\d{2}T/.test(el)) return el.slice(0, 10);
  const t = Date.parse(el.replace(' ', 'T'));
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return '';
}

export const api = {
  async publicLibraryInfo(): Promise<LibraryInfoJson> {
    const j = await request<Record<string, unknown>>('/api/public/library-info');
    const lib = j.library;
    if (!lib || typeof lib !== 'object') {
      throw new Error('Invalid library info response');
    }
    return lib as LibraryInfoJson;
  },

  async signUp(req: SignUpRequest): Promise<SignUpResponse> {
    return await request<SignUpResponse>('/api/auth/register', {
      method: 'POST',
      body: {
        name: req.name,
        email: req.email.trim().toLowerCase(),
        phone: req.phone.trim(),
        password: req.password,
        client: 'expo',
        origin: apiSiteOrigin(),
      },
    });
  },

  async resendVerificationEmail(email: string): Promise<void> {
    await request('/api/auth/resend-verification', {
      method: 'POST',
      body: {
        email: email.trim().toLowerCase(),
        client: 'expo',
        origin: apiSiteOrigin(),
      },
    });
  },

  async login(req: LoginRequest): Promise<LoginResponse> {
    const raw = req.emailOrPhone.trim();
    if (!raw.includes('@')) {
      throw new Error('Sign in with the email on your library account (same as the website).');
    }
    const j = await request<LoginResponse & { session?: unknown }>('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrPhone: raw.toLowerCase(),
        passwordOrOtp: req.passwordOrOtp,
        role: 'student',
        client: 'expo',
      },
    });
    if (!j.token || !j.user) {
      throw new Error('Unexpected login response (missing token or user).');
    }
    const contact = normalizeMemberContact(j.user.email, j.user.phone);
    return {
      token: j.token,
      user: {
        ...j.user,
        name: nameFromApi(j.user.name, 'Member'),
        email: contact.email,
        phone: contact.phone,
      },
    };
  },

  async memberProfile(token: string): Promise<MemberProfile> {
    const fromSb = await tryMemberProfileFromSupabase(token);
    let raw: Record<string, unknown>;
    if (fromSb) {
      raw = fromSb;
    } else {
      try {
        raw = await request<Record<string, unknown>>('/api/me/member-profile', { token });
      } catch {
        /* Production may not deploy `/api/me/member-profile` yet — same payload from `/api/auth/me`. */
        raw = await request<Record<string, unknown>>('/api/auth/me', { token });
      }
    }

    let profile = pickMemberProfile(raw);
    const v = (profile.verificationStatus || 'none').toLowerCase();
    const verifiedAccount = v === 'approved' || profile.kycDocUploaded?.aadhaarFront || profile.kycDocUploaded?.studentId;
    const slotsAllEmpty =
      profile.memberKycSlots &&
      (['aadhaar_front', 'aadhaar_back', 'student_id'] as const).every(
        (k) => profile.memberKycSlots![k].memberStatus === 'not_uploaded',
      );
    const [kycEnriched, deviceFromActive] = await Promise.all([
      (async (): Promise<MemberProfile | null> => {
        if (!fromSb || !verifiedAccount || !slotsAllEmpty) return null;
        try {
          const apiRaw = await request<Record<string, unknown>>('/api/me/member-profile', { token });
          return pickMemberProfile(apiRaw);
        } catch {
          try {
            const apiRaw = await request<Record<string, unknown>>('/api/auth/me', { token });
            return pickMemberProfile(apiRaw);
          } catch {
            return null;
          }
        }
      })(),
      (async (): Promise<{ deviceUserId: number; libraryNumber: string } | null> => {
        if (profile.deviceUserId != null) return null;
        try {
          const ma = await request<Record<string, unknown> & { device_user_id?: unknown }>(
            '/api/memberships/me-active',
            { token },
          );
          const n = parseDeviceUserIdNumber(ma.device_user_id);
          if (n === undefined) return null;
          return { deviceUserId: n, libraryNumber: formatDeviceUserIdLabel(n) };
        } catch {
          return null;
        }
      })(),
    ]);
    if (kycEnriched) profile = kycEnriched;
    if (deviceFromActive) {
      profile = { ...profile, deviceUserId: deviceFromActive.deviceUserId, libraryNumber: deviceFromActive.libraryNumber };
    }
    return profile;
  },

  async updateProfileIntake(
    token: string,
    body: {
      aadhaar_last_four?: string | null;
      student_roll_number?: string | null;
      institution_type?: string | null;
      preparing_for?: string | null;
    },
  ): Promise<void> {
    await request('/api/me/profile-intake', { method: 'PATCH', token, body });
  },

  async me(token: string): Promise<ApiUser> {
    const j = await request<ApiUser & { ok?: boolean; message?: string; device_user_id?: unknown; libraryNumber?: unknown }>(
      '/api/auth/me',
      { token },
    );
    const du =
      parseDeviceUserIdNumber(j.deviceUserId ?? j.device_user_id) ?? parseDeviceUserIdNumber(j.libraryNumber);
    const contact = normalizeMemberContact(j.email, j.phone);
    return {
      id: j.id,
      role: j.role,
      name: nameFromApi(j.name, 'Member'),
      email: contact.email,
      phone: contact.phone,
      ...(du !== undefined ? { deviceUserId: du } : {}),
    };
  },

  async uploadAvatar(token: string, file: { uri: string; mimeType: string; name: string }): Promise<{ avatarUrl: string }> {
    const base = assertBaseUrl();
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const res = await fetch(`${base}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-App-Client': 'expo',
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    const j = await parseJsonResponse<Record<string, unknown>>(res);
    const avatarUrl = j.avatarUrl;
    if (typeof avatarUrl !== 'string' || !avatarUrl) {
      throw new Error('Unexpected avatar response.');
    }
    return { avatarUrl };
  },

  async removeAvatar(token: string): Promise<void> {
    const base = assertBaseUrl();
    const res = await fetch(`${base}/api/me/avatar`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'X-App-Client': 'expo',
        Authorization: `Bearer ${token}`,
      },
    });
    await parseJsonResponse<Record<string, unknown>>(res);
  },

  async membership(token: string): Promise<Membership> {
    const j = await request<
      { membership?: MeActiveMembership | null; device_user_id?: unknown; renew_plan_eligible?: unknown } & Record<
        string,
        unknown
      >
    >('/api/memberships/me-active', { token });
    const base = mapMeActiveToMembership(j.membership ?? null);
    const renewPlanEligible =
      typeof j.renew_plan_eligible === 'boolean'
        ? (j.renew_plan_eligible as boolean)
        : base.status !== 'none' && base.daysLeft != null && base.daysLeft <= 3;
    let n = parseDeviceUserIdNumber(j.device_user_id);
    if (n === undefined) {
      try {
        const u = await api.me(token);
        if (u.deviceUserId != null) n = u.deviceUserId;
      } catch {
        /* ignore */
      }
    }
    if (n !== undefined) {
      return { ...base, deviceUserId: formatDeviceUserIdLabel(n), renewPlanEligible };
    }
    return { ...base, renewPlanEligible };
  },

  /** Opens website membership flow in the device browser (Razorpay web checkout). */
  async renewMembership(_token: string): Promise<{ ok: true; paymentUrl?: string }> {
    const base = assertBaseUrl();
    return { ok: true, paymentUrl: `${base}/membership/long-term` };
  },

  async reconcileRazorpayPayment(token: string, razorpay_payment_id: string): Promise<{ ok: boolean }> {
    const j = await request<{ ok?: boolean; error?: string; hint?: string }>('/api/payments/razorpay/reconcile', {
      method: 'POST',
      token,
      body: { razorpay_payment_id: razorpay_payment_id.trim() },
    });
    invalidateMemberAccountCache();
    return { ok: j.ok === true };
  },

  async membershipHistory(token: string): Promise<MembershipHistoryEntry[]> {
    const j = await request<{ transactions?: PaymentMeRow[] } & Record<string, unknown>>('/api/payments/me', { token });
    const list = Array.isArray(j.transactions) ? j.transactions : [];
    return list.map(
      (t): MembershipHistoryEntry => ({
        id: t.id,
        kind: 'payment',
        title: t.membership?.planTitle ?? 'Membership payment',
        occurredAt: t.createdAt,
        planName: t.membership?.planTitle,
        amount: `₹${Number(t.amountRupees).toLocaleString('en-IN')}`,
        status: mapPaymentStatus(t.status),
        periodLabel: t.membership?.windowLabel ?? '—',
        receiptId: t.razorpayPaymentId ?? undefined,
      }),
    );
  },

  /** Member gate attendance — server calls eTime (same route as the website dashboard card). */
  async memberAttendanceToday(token: string): Promise<MemberAttendanceToday> {
    const j = await request<MemberAttendanceToday & Record<string, unknown>>('/api/me/today-attendance', { token });
    const history = Array.isArray(j.history) ? j.history : [];
    const daily =
      j.daily != null && typeof j.daily === 'object' && !Array.isArray(j.daily)
        ? (j.daily as MemberAttendanceDailyRow)
        : null;
    return { ...j, daily, history };
  },

  async documents(token: string): Promise<MemberDocumentsPayload> {
    const prof = await api.memberProfile(token);
    const verificationStatus = typeof prof.verificationStatus === 'string' ? prof.verificationStatus : 'none';
    return {
      items: documentItemsFromVerificationAndSlots(verificationStatus, prof.kycDocUploaded, prof.kycDocOriginalNames),
      verificationStatus,
      memberKycSlots: prof.memberKycSlots,
    };
  },

  async uploadDocument(
    token: string,
    args: {
      type: DocumentType;
      /** When `type` is `aadhaar`, upload front vs back (default front). */
      kycDocType?: 'aadhaar_front' | 'aadhaar_back';
      fileUri: string;
      fileName: string;
      mimeType: string;
      deleteAfterUpload?: boolean;
    },
  ): Promise<{ ok: true }> {
    const { deleteAsync } = await import('expo-file-system/legacy');
    const base = assertBaseUrl();
    const docType =
      args.type === 'student_id'
        ? 'student_id'
        : args.kycDocType === 'aadhaar_back'
          ? 'aadhaar_back'
          : 'aadhaar_front';
    const form = new FormData();
    form.append('docType', docType);
    form.append('fileName', args.fileName);
    form.append('file', {
      uri: args.fileUri,
      name: args.fileName,
      type: args.mimeType,
    } as unknown as Blob);
    try {
      const res = await fetch(`${base}/api/me/verification/document`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-App-Client': 'expo',
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      await parseJsonResponse<Record<string, unknown>>(res);
      invalidateMemberAccountCache();
      return { ok: true };
    } finally {
      if (args.deleteAfterUpload) {
        void deleteAsync(args.fileUri, { idempotent: true }).catch(() => {});
      }
    }
  },

  /** Stages KYC under `checkout_pending` until membership payment succeeds (not `submitted` / staff review). */
  async uploadDocumentCheckoutPending(
    token: string,
    args: {
      type: DocumentType;
      kycDocType?: 'aadhaar_front' | 'aadhaar_back';
      fileUri: string;
      fileName: string;
      mimeType: string;
      deleteAfterUpload?: boolean;
    },
  ): Promise<{ ok: true }> {
    const { deleteAsync } = await import('expo-file-system/legacy');
    const base = assertBaseUrl();
    const docType =
      args.type === 'student_id'
        ? 'student_id'
        : args.kycDocType === 'aadhaar_back'
          ? 'aadhaar_back'
          : 'aadhaar_front';
    const form = new FormData();
    form.append('docType', docType);
    form.append('fileName', args.fileName);
    form.append('file', {
      uri: args.fileUri,
      name: args.fileName,
      type: args.mimeType,
    } as unknown as Blob);
    try {
      const res = await fetch(`${base}/api/me/verification/document-checkout-pending`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-App-Client': 'expo',
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      await parseJsonResponse<Record<string, unknown>>(res);
      invalidateMemberAccountCache();
      return { ok: true };
    } finally {
      if (args.deleteAfterUpload) {
        void deleteAsync(args.fileUri, { idempotent: true }).catch(() => {});
      }
    }
  },

  async seatOccupancy(
    token: string,
    planKind: 'short_term' | 'long_term',
    opts?: { startDate?: string; durationKey?: string },
  ): Promise<number[]> {
    const base = assertBaseUrl();
    const q = new URLSearchParams({ planKind });
    if (opts?.startDate) q.set('startDate', opts.startDate);
    if (opts?.durationKey) q.set('durationKey', opts.durationKey);
    const res = await fetch(`${base}/api/memberships/seat-occupancy?${q}`, {
      headers: {
        Accept: 'application/json',
        'X-App-Client': 'expo',
        Authorization: `Bearer ${token}`,
      },
    });
    const j = await parseJsonResponse<{ seats?: number[] } & Record<string, unknown>>(res);
    const arr = Array.isArray(j.seats) ? j.seats : [];
    return arr.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  },

  async createRazorpayMembershipOrder(
    token: string,
    body: { planKind: 'short_term' | 'long_term'; seatNumber: number; membershipStartDate: string; durationKey: string },
  ): Promise<RazorpayCreateOrderResponse> {
    const j = await request<Record<string, unknown>>('/api/payments/razorpay/create-order', {
      method: 'POST',
      token,
      body,
    });
    return {
      keyId: String(j.keyId ?? ''),
      orderId: String(j.orderId ?? ''),
      amount: Number(j.amount ?? 0),
      currency: String(j.currency ?? 'INR'),
      paymentId: String(j.paymentId ?? ''),
      membershipId: String(j.membershipId ?? ''),
      hostedCheckoutUrl:
        typeof j.hostedCheckoutUrl === 'string' && j.hostedCheckoutUrl.trim()
          ? j.hostedCheckoutUrl.trim()
          : undefined,
    };
  },

  async verifyRazorpayPayment(
    token: string,
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      payment_id: string;
    },
  ): Promise<{ alreadyPaid?: boolean }> {
    const j = await request<Record<string, unknown>>('/api/payments/razorpay/verify', {
      method: 'POST',
      token,
      body,
    });
    return { alreadyPaid: j.alreadyPaid === true };
  },

  async abandonRazorpayCheckout(token: string, payment_id: string): Promise<void> {
    await request('/api/payments/razorpay/abandon-pending-checkout', {
      method: 'POST',
      token,
      body: { payment_id },
    });
  },

  async markRazorpayCheckoutFailed(
    token: string,
    args: { payment_id: string; error?: { description?: string; code?: string; source?: string; step?: string } },
  ): Promise<void> {
    await request('/api/payments/razorpay/mark-checkout-failed', {
      method: 'POST',
      token,
      body: args,
    });
  },

  /** Poll Razorpay order + DB (after verify/reconcile or webhook delay). */
  async syncPendingRazorpayPayment(
    token: string,
    payment_id: string,
  ): Promise<{ outcome: string; paymentId: string; alreadyPaid?: boolean }> {
    const j = await request<Record<string, unknown>>('/api/payments/razorpay/sync-pending', {
      method: 'POST',
      token,
      body: { payment_id },
    });
    return {
      outcome: String(j.outcome ?? 'still_pending'),
      paymentId: String(j.paymentId ?? payment_id),
      alreadyPaid: j.alreadyPaid === true,
    };
  },

  async adminDailyAttendance(
    token: string,
    opts: { fromDate: string; toDate: string; empcode?: string },
  ): Promise<PunchRecord[]> {
    const base = assertBaseUrl();
    const q = new URLSearchParams({ fromDate: opts.fromDate, toDate: opts.toDate });
    const trimmed = opts.empcode?.trim();
    if (trimmed) q.set('empcode', trimmed);
    const res = await fetch(`${base}/api/admin/attendance/daily?${q}`, {
      headers: {
        Accept: 'application/json',
        'X-App-Client': 'expo',
        Authorization: `Bearer ${token}`,
      },
    });
    const j = await parseJsonResponse<{ items?: AdminDailyItem[] } & Record<string, unknown>>(res);
    const items = Array.isArray(j.items) ? j.items : [];
    return items.map((row) => adminItemToPunch(row as AdminDailyItem));
  },

  async adminOverview(token: string): Promise<AdminOverviewSnapshot> {
    const j = await request<Record<string, unknown>>('/api/admin/overview', { token });
    const statsRaw = (j.stats ?? {}) as Record<string, unknown>;
    const stats: AdminOverviewStats = {
      activeTotal: Number(statsRaw.activeTotal ?? 0) || 0,
      activeLong: Number(statsRaw.activeLong ?? 0) || 0,
      activeShort: Number(statsRaw.activeShort ?? 0) || 0,
      activeMembersDistinct:
        Number(statsRaw.activeMembersDistinct ?? statsRaw.activeTotal ?? 0) || 0,
      totalMembers: Number(statsRaw.totalMembers ?? 0) || 0,
      registeredAccounts:
        Number(statsRaw.registeredAccounts ?? statsRaw.totalMembers ?? 0) || 0,
      revenue30dInr: Number(statsRaw.revenue30dInr ?? 0) || 0,
      revenueTodayInr: Number(statsRaw.revenueTodayInr ?? 0) || 0,
      paidCountToday: Number(statsRaw.paidCountToday ?? 0) || 0,
      paidCount30d: Number(statsRaw.paidCount30d ?? 0) || 0,
      totalPaidRevenueInr: Number(statsRaw.totalPaidRevenueInr ?? 0) || 0,
      pendingPayments: Number(statsRaw.pendingPayments ?? 0) || 0,
      newMemberships30d: Number(statsRaw.newMemberships30d ?? 0) || 0,
    };
    const seatRaw = (j.seatSnapshot ?? {}) as Record<string, unknown>;
    const seatSnapshot: AdminSeatSnapshot = {
      longTermDistinctSeats: Number(seatRaw.longTermDistinctSeats ?? 0) || 0,
      shortTermDistinctSeats: Number(seatRaw.shortTermDistinctSeats ?? 0) || 0,
    };
    const expRaw = Array.isArray(j.expiringSoon) ? j.expiringSoon : [];
    const expiringSoon = expRaw.map((raw): AdminOverviewSnapshot['expiringSoon'][number] => {
      const e = raw as Record<string, unknown>;
      const uid = String(e.user_id ?? '');
      const planKindRaw = String(e.plan_kind ?? '');
      const plan = planKindToMarketingPlanId(planKindRaw);
      const endLabel = String(e.end_label ?? '—');
      const expiryYmd = expiringYmdFromEndLabel(endLabel);
      const dev = e.device_user_id;
      const libraryNumber =
        typeof dev === 'number' && Number.isFinite(dev)
          ? String(dev).padStart(4, '0')
          : typeof dev === 'string' && dev.trim()
            ? String(Number(dev)).padStart(4, '0')
            : '—';
      return {
        id: String(e.id ?? uid),
        userId: uid,
        name: nameFromApi(e.member_label, 'Member'),
        memberIdLabel: uid ? `USR-${uid.slice(0, 8)}` : '—',
        plan,
        planKindRaw,
        libraryNumber,
        seatNo: e.seat_number != null ? String(e.seat_number) : '—',
        endLabel,
        expiryDate: expiryYmd || '9999-12-31',
      };
    });
    const payRaw = Array.isArray(j.recentPayments) ? j.recentPayments : [];
    const recentPayments = payRaw.map((raw): AdminOverviewSnapshot['recentPayments'][number] => {
      const p = raw as Record<string, unknown>;
      const uid = String(p.user_id ?? '');
      const planKind = typeof p.plan_kind === 'string' ? p.plan_kind : '';
      const plan = planKind ? planKindToMarketingPlanId(planKind) : '';
      const createdAt = String(p.created_at ?? '');
      const dev = p.device_user_id;
      const libraryNumber =
        typeof dev === 'number' && Number.isFinite(dev)
          ? String(dev).padStart(4, '0')
          : typeof dev === 'string' && dev.trim()
            ? String(Number(dev)).padStart(4, '0')
            : '—';
      const prov = p.provider;
      return {
        id: String(p.id ?? ''),
        name: nameFromApi(p.member_label, 'Member'),
        memberIdLabel: uid ? `USR-${uid.slice(0, 8)}` : '—',
        libraryNumber,
        amount: Number(p.amount_rupees ?? 0) || 0,
        date: createdAt.slice(0, 10),
        createdAt,
        status: String(p.status ?? '—'),
        provider: prov == null || prov === '' ? '—' : String(prov),
        plan,
      };
    });
    const chartRaw = (j.chart ?? {}) as Record<string, unknown>;
    const revDayRaw = Array.isArray(chartRaw.revenueByDay) ? chartRaw.revenueByDay : [];
    const memDayRaw = Array.isArray(chartRaw.membershipsCreatedByDay) ? chartRaw.membershipsCreatedByDay : [];
    const chart: AdminOverviewChart = {
      revenueByDay: revDayRaw.map((row) => {
        const r = row as Record<string, unknown>;
        return { day: String(r.day ?? ''), amountInr: Number(r.amountInr ?? 0) || 0 };
      }),
      membershipsCreatedByDay: memDayRaw.map((row) => {
        const r = row as Record<string, unknown>;
        return { day: String(r.day ?? ''), count: Number(r.count ?? 0) || 0 };
      }),
      maxRevenueInr: Number(chartRaw.maxRevenueInr ?? 0) || 0,
      maxMembershipsCreated: Number(chartRaw.maxMembershipsCreated ?? 0) || 0,
    };
    return { stats, seatSnapshot, chart, expiringSoon, recentPayments };
  },

  async adminPaymentsList(token: string): Promise<AdminPaymentsListPayload> {
    const j = await request<Record<string, unknown>>('/api/admin/payments/list', { token });
    const rowsRaw = Array.isArray(j.rows) ? j.rows : [];
    const profRaw = (j.profiles ?? {}) as Record<string, Record<string, unknown>>;
    const rows: AdminPaymentListRow[] = rowsRaw.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        userId: String(r.user_id ?? ''),
        amountRupees: Number(r.amount_rupees ?? 0) || 0,
        currency: String(r.currency ?? 'INR'),
        provider: r.provider == null ? null : String(r.provider),
        status: String(r.status ?? ''),
        razorpayPaymentId: r.razorpay_payment_id == null ? null : String(r.razorpay_payment_id),
        razorpayOrderId: r.razorpay_order_id == null ? null : String(r.razorpay_order_id),
        createdAt: String(r.created_at ?? ''),
        detail: r.detail == null ? null : String(r.detail),
      };
    });
    const profiles: Record<string, AdminPaymentListProfile> = {};
    for (const [uid, pr] of Object.entries(profRaw)) {
      const p = pr as Record<string, unknown>;
      profiles[uid] = {
        userId: String(p.user_id ?? uid),
        fullName: p.full_name ? nameFromApi(p.full_name, '—') : '—',
        deviceUserId: Number(p.device_user_id ?? 0) || 0,
      };
    }
    return { rows, profiles };
  },

  async adminMembersList(token: string): Promise<Member[]> {
    const j = await request<Record<string, unknown>>('/api/admin/members/list', { token });
    const rows = Array.isArray(j.rows) ? (j.rows as MembersListRow[]) : [];
    const profiles = (j.profiles ?? {}) as Record<string, ProfileMini>;
    const accountOnly = Array.isArray(j.account_only_profiles)
      ? (j.account_only_profiles as ProfileMini[])
      : [];

    const seenUserIds = new Set<string>();
    const out: Member[] = [];

    for (const row of rows) {
      const pr = profiles[row.user_id];
      if (!pr) continue;
      seenUserIds.add(row.user_id);
      const expiry = ymdFromMembershipRow(row);
      const joinDate = String(row.created_at).slice(0, 10);
      const rowStatus = mapDbMembershipStatus(row);
      out.push({
        listKey: row.id,
        userId: row.user_id,
        membershipId: row.id,
        id: `MEM-${String(pr.device_user_id).padStart(4, '0')}`,
        libraryNumber: String(pr.device_user_id),
        planKind: row.plan_kind,
        membershipStatus: String(row.status ?? ''),
        windowState: row.window_state as Member['windowState'],
        validFrom: row.valid_from,
        validUntil: row.valid_until,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        name: nameFromApi(pr.full_name, 'Member'),
        email: pr.email ?? '',
        phone: '',
        plan: planKindToMarketingPlanId(row.plan_kind),
        seatNo: row.seat_number != null ? String(row.seat_number) : '—',
        joinDate,
        expiryDate: expiry,
        windowLabel: membershipWindowLabel(row),
        status: rowStatus,
        lastPayment: { amount: 0, date: joinDate, method: '—' },
        verificationStatus: String(pr.verification_status ?? 'none'),
      });
    }

    for (const pr of accountOnly) {
      if (!pr?.user_id) continue;
      if (seenUserIds.has(pr.user_id)) continue;
      seenUserIds.add(pr.user_id);
      const joinDate = pr.created_at ? String(pr.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
      out.push({
        listKey: `account:${pr.user_id}`,
        userId: pr.user_id,
        membershipId: null,
        id: `MEM-${String(pr.device_user_id).padStart(4, '0')}`,
        libraryNumber: String(pr.device_user_id),
        planKind: '',
        membershipStatus: 'none',
        name: nameFromApi(pr.full_name, 'Member'),
        email: pr.email ?? '',
        phone: '',
        plan: 'account',
        seatNo: '—',
        joinDate,
        expiryDate: joinDate,
        windowLabel: '—',
        status: 'account',
        lastPayment: { amount: 0, date: joinDate, method: '—' },
        verificationStatus: String(pr.verification_status ?? 'none'),
      });
    }

    return out;
  },

  async adminPendingKycMembers(token: string): Promise<AdminPendingKycMember[]> {
    const rows = await api.adminMembersList(token);
    const seen = new Set<string>();
    const out: AdminPendingKycMember[] = [];
    for (const m of rows) {
      if (m.verificationStatus.toLowerCase() !== 'pending') continue;
      if (!m.userId || seen.has(m.userId)) continue;
      seen.add(m.userId);
      out.push({
        userId: m.userId,
        studentName: m.name,
        libraryNumber: m.libraryNumber.padStart(4, '0'),
        verificationStatus: m.verificationStatus,
      });
    }
    return out;
  },

  async adminMemberKycDocuments(token: string, userId: string): Promise<AdminKycDocument[]> {
    const j = await request<Record<string, unknown>>(
      `/api/admin/members/${encodeURIComponent(userId)}/kyc-documents`,
      { token },
    );
    const docs = Array.isArray(j.documents) ? j.documents : [];
    return docs.map((raw) => {
      const d = raw as Record<string, unknown>;
      return {
        docType: String(d.doc_type ?? ''),
        contentType: d.content_type == null ? null : String(d.content_type),
        signedUrl: String(d.signedUrl ?? ''),
      };
    });
  },

  async adminVerifyProfile(token: string, userId: string): Promise<{ ok: true }> {
    await request('/api/admin/profiles/verify', {
      method: 'POST',
      token,
      body: { user_id: userId },
    });
    return { ok: true };
  },

  async adminVerificationRespond(
    token: string,
    args: { userId: string; action: 'reject' | 'request_resubmit'; studentMessage?: string },
  ): Promise<{ ok: true }> {
    await request('/api/admin/profiles/verification-respond', {
      method: 'POST',
      token,
      body: {
        user_id: args.userId,
        action: args.action,
        student_message: args.studentMessage?.trim() || null,
      },
    });
    return { ok: true };
  },

  async adminManualEnroll(token: string, input: AdminManualEnrollInput): Promise<AdminManualEnrollResult> {
    const j = await request<Record<string, unknown>>('/api/admin/members/manual-enroll', {
      method: 'POST',
      token,
      body: input,
    });
    return {
      user_id: String(j.user_id ?? ''),
      device_user_id: Number(j.device_user_id ?? 0) || 0,
      membership_id: String(j.membership_id ?? ''),
      payment_id: String(j.payment_id ?? ''),
      temporary_password:
        typeof j.temporary_password === 'string' && j.temporary_password.trim()
          ? j.temporary_password
          : undefined,
    };
  },

  /** @deprecated Use `adminPendingKycMembers` + profile verify APIs. */
  async adminPendingDocs(token: string): Promise<PendingDoc[]> {
    const pending = await api.adminPendingKycMembers(token);
    return pending.map((p) => ({
      id: p.userId,
      memberId: p.libraryNumber,
      studentName: p.studentName,
      aadhaar: { type: 'aadhaar', status: 'pending' },
      studentId: { type: 'student_id', status: 'pending' },
    }));
  },

  async adminVerifyDoc(
    token: string,
    args: { docId: string; type: DocumentType; action: 'verify' | 'reject'; reason?: string },
  ): Promise<{ ok: true }> {
    const userId = args.docId;
    if (args.action === 'verify') {
      await api.adminVerifyProfile(token, userId);
    } else {
      await api.adminVerificationRespond(token, {
        userId,
        action: 'reject',
        studentMessage: args.reason,
      });
    }
    return { ok: true };
  },

  async publicGallery(): Promise<GalleryImage[]> {
    const j = await request<{ images?: GalleryImage[] }>('/api/public/gallery');
    const raw = Array.isArray(j.images) ? j.images : [];
    return raw.map((img) => ({
      id: String((img as GalleryImage).id ?? ''),
      url: String((img as GalleryImage).url ?? ''),
      sortOrder: (img as GalleryImage).sortOrder,
      createdAt: (img as GalleryImage).createdAt,
    }));
  },

  async publicHero(): Promise<PublicHeroSettings> {
    const j = await request<{ hero?: PublicHeroSettings }>('/api/public/hero');
    const hero = j.hero;
    const slotsRaw = Array.isArray(hero?.slots) ? hero!.slots : [];
    const slots: PublicHeroSlot[] = [1, 2, 3].map((slot) => {
      const row = slotsRaw.find((s) => Number((s as PublicHeroSlot).slot) === slot) as PublicHeroSlot | undefined;
      return {
        slot: slot as 1 | 2 | 3,
        galleryImageId: row?.galleryImageId ?? null,
        imageUrl: row?.imageUrl?.trim() ? row.imageUrl : null,
        tagline: row?.tagline?.trim() ? row.tagline : null,
        taglineSub: row?.taglineSub?.trim() ? row.taglineSub : null,
      };
    });
    return { slots };
  },

  async publicTestimonials(): Promise<PublicTestimonial[]> {
    const j = await request<{ testimonials?: PublicTestimonial[] }>('/api/public/testimonials');
    const raw = Array.isArray(j.testimonials) ? j.testimonials : [];
    return raw.map((t) => ({
      fullName: String((t as PublicTestimonial).fullName ?? 'Member'),
      subtitle: String((t as PublicTestimonial).subtitle ?? 'Mani Library member'),
      avatarUrl: (t as PublicTestimonial).avatarUrl ?? null,
      rating: Number((t as PublicTestimonial).rating ?? 0) || 0,
      comment: String((t as PublicTestimonial).comment ?? ''),
    }));
  },

  async memberFeedbackGet(token: string): Promise<MemberFeedback | null> {
    const j = await request<{ feedback?: MemberFeedback | null }>('/api/me/feedback', { token });
    const fb = j.feedback;
    if (!fb) return null;
    return {
      rating: Number(fb.rating) || 0,
      comment: String(fb.comment ?? ''),
      submittedAt: String(fb.submittedAt ?? ''),
      approved: fb.approved === true,
      editable: fb.editable === true,
      editAvailableFrom: fb.editAvailableFrom ?? null,
    };
  },

  async memberFeedbackSave(token: string, rating: number, comment: string): Promise<MemberFeedback> {
    const j = await request<{ feedback?: MemberFeedback }>('/api/me/feedback', {
      method: 'POST',
      token,
      body: { rating, comment },
    });
    const fb = j.feedback;
    if (!fb) throw new Error('Could not save feedback.');
    return {
      rating: Number(fb.rating) || rating,
      comment: String(fb.comment ?? comment),
      submittedAt: String(fb.submittedAt ?? ''),
      approved: fb.approved === true,
      editable: fb.editable === true,
      editAvailableFrom: fb.editAvailableFrom ?? null,
    };
  },

  async memberFeedbackDelete(token: string): Promise<void> {
    await request('/api/me/feedback', { method: 'DELETE', token });
  },

  async adminFeedbackList(token: string): Promise<AdminFeedbackRow[]> {
    const j = await request<{ feedbacks?: AdminFeedbackRow[] }>('/api/admin/feedback/list', { token });
    const raw = Array.isArray(j.feedbacks) ? j.feedbacks : [];
    return raw.map((row) => ({
      userId: String(row.userId ?? ''),
      fullName: nameFromApi(row.fullName, 'Member'),
      email: row.email ?? null,
      avatarUrl: row.avatarUrl ?? null,
      deviceUserId:
        typeof row.deviceUserId === 'number' && Number.isFinite(row.deviceUserId) ? row.deviceUserId : null,
      rating: Number(row.rating) || 0,
      comment: String(row.comment ?? ''),
      submittedAt: row.submittedAt ?? null,
      approved: row.approved === true,
    }));
  },

  async adminFeedbackApprove(token: string, userId: string, approved: boolean): Promise<void> {
    await request('/api/admin/feedback/approve', {
      method: 'POST',
      token,
      body: { user_id: userId, approved },
    });
    invalidateDataCacheKey(cacheKeys.adminFeedback);
  },

  async adminGalleryList(token: string): Promise<{ images: GalleryImage[]; maxImages: number }> {
    const j = await request<{ images?: GalleryImage[]; maxImages?: number }>('/api/admin/gallery/list', {
      token,
    });
    const images = (Array.isArray(j.images) ? j.images : []).map((img) => ({
      id: String(img.id ?? ''),
      url: String(img.url ?? ''),
      sortOrder: img.sortOrder,
      createdAt: img.createdAt,
    }));
    return { images, maxImages: Number(j.maxImages ?? 50) || 50 };
  },

  async adminGalleryUpload(
    token: string,
    file: { uri: string; mimeType: string; name: string },
  ): Promise<GalleryImage> {
    const base = assertBaseUrl();
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const res = await fetch(`${base}/api/admin/gallery/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-App-Client': 'expo',
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    const j = await parseJsonResponse<{ image?: GalleryImage }>(res);
    if (!j.image?.id || !j.image?.url) throw new Error('Upload failed.');
    invalidateDataCacheKey(cacheKeys.adminGallery);
    invalidatePublicGalleryCache();
    return { id: j.image.id, url: j.image.url, sortOrder: j.image.sortOrder, createdAt: j.image.createdAt };
  },

  async adminGalleryDelete(token: string, id: string): Promise<void> {
    await request(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: 'DELETE', token });
    invalidateDataCacheKey(cacheKeys.adminGallery);
    invalidatePublicGalleryCache();
  },

  async adminLastPunches(
    token: string,
    opts: { fromYmd: string; toYmd: string; empcode?: string },
  ): Promise<AdminRecentPunch[]> {
    const q = new URLSearchParams({ fromYmd: opts.fromYmd, toYmd: opts.toYmd });
    const trimmed = opts.empcode?.trim();
    if (trimmed) q.set('empcode', trimmed);
    const j = await request<{ items?: AdminRecentPunch[] }>(`/api/admin/attendance/last-punches?${q}`, { token });
    const raw = Array.isArray(j.items) ? j.items : [];
    return raw.map((it) => ({
      empcode: String(it.empcode ?? ''),
      deviceUserId:
        typeof it.deviceUserId === 'number' && Number.isFinite(it.deviceUserId) ? it.deviceUserId : null,
      fullName: it.fullName ? nameFromApi(it.fullName, '—') : null,
      punchDate: String(it.punchDate ?? ''),
      flag: it.flag ?? null,
      source: String(it.source ?? ''),
    }));
  },

  async resumableCheckout(token: string): Promise<ResumableCheckout | null> {
    const j = await request<{ resume?: ResumableCheckout | null }>('/api/payments/razorpay/resumable-checkout', {
      token,
    });
    const c = j.resume;
    if (!c?.paymentId || !c.orderId || !c.keyId) return null;
    const seatNumber = typeof c.seatNumber === 'number' && Number.isFinite(c.seatNumber) ? c.seatNumber : NaN;
    if (!Number.isFinite(seatNumber) || seatNumber <= 0) return null;
    return {
      paymentId: String(c.paymentId),
      orderId: String(c.orderId),
      amount: Number(c.amount) || 0,
      currency: String(c.currency ?? 'INR'),
      keyId: String(c.keyId),
      fingerprint: String(c.fingerprint ?? ''),
      planKind: String(c.planKind ?? ''),
      durationKey: String(c.durationKey ?? ''),
      membershipStartDate: String(c.membershipStartDate ?? ''),
      seatLabel: String(c.seatLabel ?? ''),
      seatNumber,
      amountRupees: Number(c.amountRupees) || 0,
    };
  },
};
