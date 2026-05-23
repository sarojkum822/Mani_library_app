/** 10-digit Indian mobile for profiles.phone (bigint). +91 is display-only. */

export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export function stripIndianPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('91') && d.length > 10) d = d.slice(2);
  if (d.startsWith('0') && d.length > 10) d = d.slice(1);
  return d.slice(0, 10);
}

export function normalizeIndianMobile10(raw: string): string | null {
  const d = stripIndianPhoneInput(raw);
  return INDIAN_MOBILE_RE.test(d) ? d : null;
}

export function formatIndianPhoneDisplay(digits: string | null | undefined): string {
  if (!digits?.trim()) return '—';
  const p = digits.trim();
  if (p.includes('@')) return '—';
  const n = normalizeIndianMobile10(p) ?? (INDIAN_MOBILE_RE.test(p) ? p : null);
  if (!n) return p;
  return `+91 ${n}`;
}
