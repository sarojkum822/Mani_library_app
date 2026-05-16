import type { Membership } from '@/lib/api';

/** Active / upcoming plan — hide checkout (same as website `useActiveMembership().membership`). */
export function hasActiveMembership(m: Membership | null | undefined): boolean {
  if (!m) return false;
  return m.status === 'active' || m.status === 'expiring_soon' || m.status === 'upcoming';
}
