import type { MembershipPlanId } from '@/lib/membershipPlans';

/** Hall plan id used by the seat-map screen (`row-hall` → rows, `main-hall` → F desks). */
export function seatMapPlanIdForMarketingPlan(planId: string): MembershipPlanId {
  if (planId === 'row-hall' || planId === 'half-day') return 'row-hall';
  return 'main-hall';
}
