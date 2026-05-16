import { daysUntil, type Member } from '@/lib/members';
import { ymdFromIsoish } from '@/lib/dates';
import { todayYmdInLibraryTz } from '@/lib/membershipHubDates';

/** Mirrors web `StaffSubscriptionsPanel` `classify()`. */
export type SubscriptionGroup = 'active' | 'expiring' | 'pending' | 'expired' | 'cancelled';

function endYmd(m: Member): string | null {
  if (m.planKind === 'long_term') {
    const y = ymdFromIsoish(m.validUntil);
    return y || (m.expiryDate ? ymdFromIsoish(m.expiryDate) : null);
  }
  const fromEnds = ymdFromIsoish(m.endsAt);
  if (fromEnds) return fromEnds;
  return m.expiryDate ? ymdFromIsoish(m.expiryDate) : null;
}

export function classifyMemberSubscription(m: Member, todayYmd = todayYmdInLibraryTz()): SubscriptionGroup | null {
  if (m.plan === 'account') return null;

  const s = m.membershipStatus.toLowerCase();
  if (s === 'pending_payment') return 'pending';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'expired') return 'expired';

  if (s === 'active') {
    if (m.windowState === 'ended_past') return 'expired';
    if (m.windowState === 'starts_future') return 'active';

    const end = endYmd(m);
    if (m.planKind === 'long_term') {
      if (!end) return 'active';
      if (end < todayYmd) return 'expired';
      const days = Math.ceil(
        (new Date(end).getTime() - new Date(todayYmd).getTime()) / (24 * 60 * 60 * 1000),
      );
      if (days <= 7) return 'expiring';
      return 'active';
    }

    const endIso = m.endsAt ?? m.expiryDate;
    if (!endIso) return 'active';
    const endMs = Date.parse(String(endIso).includes('T') ? String(endIso) : `${endIso}T23:59:59`);
    if (!Number.isFinite(endMs)) return 'active';
    if (endMs < Date.now()) return 'expired';
    const hours = Math.ceil((endMs - Date.now()) / (60 * 60 * 1000));
    if (hours <= 6) return 'expiring';
    return 'active';
  }

  return 'active';
}

/** Current membership ending within 7 days (excludes upcoming-start plans). */
export function isExpiringWithin7Days(m: Member, todayYmd = todayYmdInLibraryTz()): boolean {
  if (m.plan === 'account') return false;
  if (m.windowState === 'starts_future') return false;
  return classifyMemberSubscription(m, todayYmd) === 'expiring';
}

/** Current membership ending in 8–30 days (renewal outreach window). */
export function isRenewalWindow8to30Days(m: Member): boolean {
  if (m.plan === 'account') return false;
  if (m.windowState === 'starts_future' || m.windowState === 'ended_past') return false;
  const g = classifyMemberSubscription(m);
  if (g !== 'active') return false;
  const d = daysUntil(m.expiryDate);
  return d > 7 && d <= 30;
}

export function isEndedSubscription(m: Member): boolean {
  if (m.plan === 'account') return false;
  const g = classifyMemberSubscription(m);
  return g === 'expired' || g === 'cancelled';
}
