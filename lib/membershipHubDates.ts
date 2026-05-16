/** Same zone as website `DEFAULT_LIBRARY_TZ` for start-date rules. */
export const DEFAULT_LIBRARY_TZ = 'Asia/Kolkata';

export const MAX_ADVANCE_BOOKING_DAYS = 120;

/** `YYYY-MM-DD` in library timezone (matches website hub). */
export function todayYmdInLibraryTz(ref: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_LIBRARY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ref);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) return ref.toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, mo, da] = ymd.split('-').map(Number);
  if (!y || !mo || !da) return ymd;
  const utc = Date.UTC(y, mo - 1, da + deltaDays);
  return new Date(utc).toISOString().slice(0, 10);
}

export function isOnOrAfterYmd(a: string, b: string): boolean {
  return a >= b;
}

export function yearMonthFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function ymdFromParts(y: number, month: number, day: number): string {
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday (UTC calendar math, same as `addCalendarDaysYmd`). */
export function weekdayOfParts(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatYmdLong(ymd: string, tz: string = DEFAULT_LIBRARY_TZ): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) return ymd;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, mo - 1, d)));
}

export function formatYearMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function formatYmdShort(ymd: string, tz: string = DEFAULT_LIBRARY_TZ): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) return ymd;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, mo - 1, d)));
}

/** Inclusive last day of access: N calendar months from start, minus one day (matches website checkout). */
export function membershipInclusiveEndYmd(validFromYmd: string, calendarMonths: number): string {
  const [y, mo, d] = validFromYmd.split('-').map(Number);
  if (!y || !mo || !d || !Number.isFinite(calendarMonths) || calendarMonths < 1) return validFromYmd;
  const endExclusive = new Date(Date.UTC(y, mo - 1 + calendarMonths, d));
  const inclusive = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);
  return inclusive.toISOString().slice(0, 10);
}
