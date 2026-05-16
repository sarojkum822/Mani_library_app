import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';
import { formatYmdDdMmYyyy, ymdFromIsoish } from '@/lib/dates';

export type Plan = LibraryInfoJson['plans'][number];

export type MembershipWindowState = 'current' | 'starts_future' | 'ended_past' | 'unknown' | 'inactive';

export type Member = {
  /** Stable unique key for lists (`memberships.id` or `account:<user_id>`). */
  listKey: string;
  /** Supabase `profiles.user_id` — required for detail / KYC / manual enroll. */
  userId: string;
  /** Active membership row id when `plan !== 'account'`. */
  membershipId: string | null;
  /** Library-style label shown in UI (e.g. MEM-1112). */
  id: string;
  /** `profiles.device_user_id` as string (matches website “Device user id” column). */
  libraryNumber: string;
  /** Raw DB `memberships.plan_kind` (e.g. long_term). */
  planKind: string;
  /** Raw DB `memberships.status`. */
  membershipStatus: string;
  /** Library-day window from admin list API (`window_state`). */
  windowState?: MembershipWindowState;
  validFrom?: string | null;
  validUntil?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  name: string;
  email: string;
  phone: string;
  /** Marketing plan id (`row-hall` | `main-hall`) for pricing copy. */
  plan: string;
  seatNo: string;
  joinDate: string;
  expiryDate: string;
  /** Coverage window label (website-style date range when available). */
  windowLabel: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'account';
  lastPayment: { amount: number; date: string; method: string };
  /** From `profiles` via admin list — same family as website KYC column. */
  verificationStatus: string;
};

export function getPlan(info: LibraryInfoJson, planId: string): Plan | undefined {
  return info.plans.find((p) => p.id === planId);
}

export function planName(info: LibraryInfoJson, planId: string): string {
  if (planId === 'account') return 'No membership yet';
  if (!planId.trim()) return '—';
  return getPlan(info, planId)?.name ?? planId;
}

export function daysUntil(dateStr: string, ref: Date = new Date()): number {
  const d = new Date(dateStr);
  const ms = d.getTime() - ref.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Website-style payment row status colouring (`StaffPaymentsPanel`). */
export function adminPaymentStatusTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'azure' | 'warn' {
  const s = status.toLowerCase();
  if (s === 'paid') return 'success';
  if (s === 'pending') return 'azure';
  if (s === 'failed') return 'danger';
  if (s === 'refunded') return 'warn';
  return 'neutral';
}

export function adminPaymentStatusLabel(status: string): string {
  const t = status.trim();
  if (!t) return '—';
  return t.replace(/_/g, ' ');
}

/** Human label for website “KYC” / verification column. */
export function verificationStatusLabel(v: string): string {
  const s = v.toLowerCase();
  if (s === 'approved') return 'Verified';
  if (s === 'pending') return 'Pending review';
  if (s === 'rejected') return 'Rejected';
  if (s === 'resubmit') return 'Resubmit';
  if (s === 'none') return 'None';
  return v || '—';
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(info: LibraryInfoJson, n: number): string {
  return `${info.currencySymbol}${n.toLocaleString('en-IN')}`;
}

/** Short plan label aligned with the staff website subscriptions table. */
export function membershipPlanKindLabel(planKind: string): string {
  const k = planKind.toLowerCase();
  if (k === 'long_term') return 'Long term';
  if (k === 'short_term') return 'Short term';
  return planKind.replace(/_/g, ' ') || '—';
}

export function membershipRowStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'cancelled') return 'Cancelled';
  if (s === 'pending_payment') return 'Pending payment';
  if (s === 'expired') return 'Expired';
  if (s === 'none') return 'Account';
  return status || '—';
}

/** Human-readable status (DB status + library-day window) — mirrors web `display-status.ts`. */
export function membershipDisplayStatusLabel(
  status: string,
  windowState?: MembershipWindowState | string,
): string {
  const s = status.toLowerCase();
  if (s === 'active' && windowState === 'starts_future') return 'Upcoming';
  if (s === 'active' && windowState === 'ended_past') return 'Expired';
  if (s === 'pending_payment') return 'Pending payment';
  return membershipRowStatusLabel(status);
}

export function isMembershipWindowExpired(m: Member): boolean {
  return m.windowState === 'ended_past';
}

/** True when membership is active on the library calendar today (not upcoming / ended). */
export function isMemberCurrentlyActive(m: Member): boolean {
  if (m.plan === 'account') return false;
  const s = m.membershipStatus.toLowerCase();
  return s === 'active' && m.windowState !== 'starts_future' && m.windowState !== 'ended_past';
}

export function membershipStatusHint(m: Member): string | null {
  if (m.plan === 'account') return null;
  if (isMembershipWindowExpired(m)) {
    const ended =
      m.planKind === 'short_term'
        ? formatDateTimeShort(m.endsAt ?? '')
        : formatYmdDdMmYyyy(ymdFromIsoish(m.validUntil));
    return ended && ended !== '—' ? `Ended ${ended}` : 'Period ended';
  }
  const s = m.membershipStatus.toLowerCase();
  if (s !== 'active') return null;
  if (m.windowState === 'current') return 'Current today';
  if (m.windowState === 'starts_future') {
    const starts =
      m.planKind === 'short_term'
        ? formatDateTimeShort(m.startsAt ?? '')
        : formatYmdDdMmYyyy(ymdFromIsoish(m.validFrom));
    return starts && starts !== '—' ? `Starts ${starts}` : 'Starts soon';
  }
  if (m.windowState === 'unknown') return 'Window missing';
  return null;
}

type ColorTokens = {
  emerald100: string;
  emerald800: string;
  amber100: string;
  amber800: string;
  red100: string;
  red700: string;
  azure50: string;
  azure700: string;
  ink100: string;
  ink700: string;
  ink800: string;
  border: string;
};

export function membershipStatusColors(
  m: Member,
  c: ColorTokens,
): { bg: string; fg: string; border: string } {
  if (m.plan === 'account') {
    return { bg: c.amber100, fg: c.amber800, border: c.amber100 };
  }
  const s = m.membershipStatus.toLowerCase();
  const expired = s === 'active' && m.windowState === 'ended_past';
  if (expired) {
    return { bg: c.ink100, fg: c.ink800, border: c.border };
  }
  if (s === 'active' && m.windowState === 'starts_future') {
    return { bg: c.amber100, fg: c.amber800, border: c.amber100 };
  }
  if (s === 'active' && (m.windowState === 'current' || !m.windowState)) {
    return { bg: c.emerald100, fg: c.emerald800, border: c.emerald100 };
  }
  if (s === 'pending_payment' || m.status === 'pending') {
    return { bg: c.azure50, fg: c.azure700, border: c.azure50 };
  }
  if (s === 'cancelled' || m.status === 'cancelled') {
    return { bg: c.red100, fg: c.red700, border: c.red100 };
  }
  return { bg: c.ink100, fg: c.ink700, border: c.border };
}

export function membershipStatusDisplayLabel(m: Member): string {
  if (m.plan === 'account') return 'No membership';
  return membershipDisplayStatusLabel(m.membershipStatus, m.windowState);
}
