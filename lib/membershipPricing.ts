/**
 * Mirrors `manilibrary/src/lib/payments/pricing.ts` for client-side totals and labels
 * (must stay in sync with server `computeOrderAmountRupees`).
 */

export type MembershipPlanKind = 'short_term' | 'long_term';

export type ShortTermDurationKey = 'st_1d' | 'st_7d' | 'st_hub_1m' | 'st_hub_3m' | 'st_hub_6m';
export type LongTermDurationKey = 'lt_1m' | 'lt_3m' | 'lt_6m' | 'lt_12m';

export const MAIN_HALL_PRICE_PER_MONTH = 1500;
export const ROW_HALL_PRICE_PER_MONTH = 800;

const HUB_MONTH_HOURS = 30 * 6;

export const SHORT_TERM_DURATION_OPTIONS: { key: ShortTermDurationKey; label: string }[] = [
  { key: 'st_1d', label: '1 day (24 hours)' },
  { key: 'st_7d', label: '7 days (168 hours)' },
  { key: 'st_hub_1m', label: '1 month (6 hrs/day)' },
  { key: 'st_hub_3m', label: '3 months (6 hrs/day)' },
  { key: 'st_hub_6m', label: '6 months (6 hrs/day)' },
];

export const LONG_TERM_DURATION_OPTIONS: { key: LongTermDurationKey; label: string }[] = [
  { key: 'lt_1m', label: '1 calendar month' },
  { key: 'lt_3m', label: '3 calendar months' },
  { key: 'lt_6m', label: '6 calendar months' },
  { key: 'lt_12m', label: '12 calendar months' },
];

function rowHallHubMonths(durationKey: string): number | null {
  if (durationKey === 'st_hub_1m') return 1;
  if (durationKey === 'st_hub_3m') return 3;
  if (durationKey === 'st_hub_6m') return 6;
  return null;
}

export function computeOrderAmountRupees(planKind: MembershipPlanKind, durationKey: string): number | null {
  if (planKind === 'long_term') {
    const map: Record<string, number> = { lt_1m: 1, lt_3m: 3, lt_6m: 6, lt_12m: 12 };
    const months = map[durationKey];
    if (!months) return null;
    return months * MAIN_HALL_PRICE_PER_MONTH;
  }
  const sd = SHORT_TERM_DURATION_OPTIONS.find((o) => o.key === durationKey);
  if (!sd) return null;
  if (sd.key === 'st_1d' || sd.key === 'st_7d') return 100;
  const months = rowHallHubMonths(sd.key);
  if (months == null) return null;
  return months * ROW_HALL_PRICE_PER_MONTH;
}

export function longTermKeyForHubMonths(m: 1 | 3 | 6): LongTermDurationKey {
  if (m === 1) return 'lt_1m';
  if (m === 3) return 'lt_3m';
  return 'lt_6m';
}

export function shortHubKeyForMonths(m: 1 | 3 | 6): ShortTermDurationKey {
  if (m === 1) return 'st_hub_1m';
  if (m === 3) return 'st_hub_3m';
  return 'st_hub_6m';
}

export function planTitle(kind: MembershipPlanKind, durationLabel: string): string {
  const base = kind === 'short_term' ? 'Row hall' : 'Main hall (1st floor)';
  return `${base} · ${durationLabel}`;
}

/** Calendar months for hub checkout keys (used for inclusive end date on success screen). */
export function calendarMonthsFromDurationKey(durationKey: string): number | null {
  if (durationKey === 'lt_1m' || durationKey === 'st_hub_1m') return 1;
  if (durationKey === 'lt_3m' || durationKey === 'st_hub_3m') return 3;
  if (durationKey === 'lt_6m' || durationKey === 'st_hub_6m') return 6;
  if (durationKey === 'lt_12m') return 12;
  return null;
}
