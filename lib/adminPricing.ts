export type ManualPlanKind = 'short_term' | 'long_term';

export const SHORT_TERM_DURATION_OPTIONS = [
  { key: 'st_1d', label: '1 day (24 hours)' },
  { key: 'st_7d', label: '7 days (168 hours)' },
  { key: 'st_hub_1m', label: '1 month (6 hrs/day)' },
  { key: 'st_hub_3m', label: '3 months (6 hrs/day)' },
  { key: 'st_hub_6m', label: '6 months (6 hrs/day)' },
] as const;

export const LONG_TERM_DURATION_OPTIONS = [
  { key: 'lt_1m', label: '1 calendar month' },
  { key: 'lt_3m', label: '3 calendar months' },
  { key: 'lt_6m', label: '6 calendar months' },
  { key: 'lt_12m', label: '12 calendar months' },
] as const;

export const MANUAL_PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi_external', label: 'UPI (external)' },
  { key: 'bank_transfer', label: 'Bank transfer' },
  { key: 'card_terminal', label: 'Card terminal' },
  { key: 'other', label: 'Other' },
] as const;

export function defaultDurationKey(planKind: ManualPlanKind): string {
  return planKind === 'long_term' ? 'lt_1m' : 'st_1d';
}

export function durationOptionsForPlan(planKind: ManualPlanKind) {
  return planKind === 'long_term' ? LONG_TERM_DURATION_OPTIONS : SHORT_TERM_DURATION_OPTIONS;
}

export function marketingPlanToKind(plan: string): ManualPlanKind {
  return plan === 'main-hall' ? 'long_term' : 'short_term';
}
