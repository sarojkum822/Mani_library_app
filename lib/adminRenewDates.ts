import { addDaysIsoYmd, isoCompare, todayIsoYmd } from '@/lib/adminDates';
import { formatDate } from '@/lib/members';

/** Earliest allowed start for a renewal: day after expiry, but not before today. */
export function minRenewStartDate(expiryYmd: string, today = todayIsoYmd()): string {
  const expiryDay = expiryYmd.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDay)) return today;
  const afterExpiry = addDaysIsoYmd(expiryDay, 1);
  return isoCompare(afterExpiry, today) >= 0 ? afterExpiry : today;
}

export function renewStartDateHint(expiryYmd: string, minStart: string): string {
  const expiryDay = expiryYmd.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDay)) {
    return `New period must start on or after ${formatDate(minStart)}.`;
  }
  return `Current membership ends ${formatDate(expiryDay)}. New period must start on or after ${formatDate(minStart)}.`;
}

export function isValidRenewStartDate(startYmd: string, minStart: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd)) return false;
  return isoCompare(startYmd, minStart) >= 0;
}
