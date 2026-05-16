import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';

export type MembershipPlanId = LibraryInfoJson['plans'][number]['id'];

export type MembershipPlanOption = {
  id: MembershipPlanId;
  title: string;
  subtitle: string;
  priceLabel: string;
  bullets: string[];
};

export function membershipPlansFromLibrary(info: LibraryInfoJson): MembershipPlanOption[] {
  return info.plans.map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: `${p.hours} · ${p.duration}`,
    priceLabel: `${info.currencySymbol}${p.price.toLocaleString('en-IN')} ${p.duration}`,
    bullets: [...p.features],
  }));
}

export function planById(info: LibraryInfoJson, id: string): MembershipPlanOption | undefined {
  return membershipPlansFromLibrary(info).find((x) => x.id === id);
}

/** Main hall (long_term) uses the 100-seat hall map (F1–F100). Row hall uses the short-term rows map (S…). */
export function planUsesFullDaySeatMap(planId: string): boolean {
  return planId === 'main-hall';
}
