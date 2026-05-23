import { formatIndianPhoneDisplay, normalizeIndianMobile10 } from '@/lib/indianPhone';

/** DB `profiles.phone` is bigint — 10-digit string for UI when valid. */
export function phoneFromProfileDb(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  let digits = '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    digits = String(Math.trunc(value));
  } else if (typeof value === 'string') {
    digits = value.replace(/\D/g, '');
  }
  if (!digits.length) return undefined;
  return normalizeIndianMobile10(digits) ?? digits;
}

/** Legacy rows sometimes store login email in `profiles.phone`. */

export function isEmailLike(value: string): boolean {
  return value.trim().includes('@');
}

export function normalizeMemberContact(
  email?: string | null,
  phone?: string | null,
): { email?: string; phone?: string } {
  let e = email?.trim() || undefined;
  let p = phone?.trim() || undefined;
  if (p && isEmailLike(p)) {
    if (!e) e = p;
    p = undefined;
  }
  if (e && p && e.toLowerCase() === p.toLowerCase()) p = undefined;
  return { email: e, phone: p };
}

export function formatContactDisplay(email?: string, phone?: string): { phone: string; email: string } {
  const n = normalizeMemberContact(email, phone);
  return {
    phone: n.phone ? formatIndianPhoneDisplay(n.phone) : '—',
    email: n.email || '—',
  };
}
