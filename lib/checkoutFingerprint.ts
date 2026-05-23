import type { MembershipPlanKind } from '@/lib/membershipPricing';

export function buildCheckoutFingerprint(args: {
  planKind: MembershipPlanKind;
  seatNumber: number | null;
  membershipStartDate: string;
  durationKey: string;
}): string {
  return `${args.planKind}:${args.seatNumber ?? 'null'}:${args.membershipStartDate}:${args.durationKey}`;
}
