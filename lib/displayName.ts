import { displayPersonName, formatPersonName } from '@/lib/formatPersonName';

/** @deprecated Use `displayPersonName` — kept for existing imports. */
export function formatDisplayName(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '';
  const s = String(raw).trim();
  if (s === '—') return '—';
  return formatPersonName(s);
}

export { displayPersonName };

/** First letter of first name + first letter of last name; single word → first two letters. */
export function initialsFromPersonName(name: string | null | undefined, email?: string, phone?: string): string {
  const formatted = formatDisplayName(name ?? '');
  const parts = formatted.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0].charAt(0);
    const b = parts[parts.length - 1].charAt(0);
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const raw = (name ?? '').trim();
  if (raw.length >= 2 && !/\s/.test(raw)) {
    return raw.slice(0, 2).toUpperCase();
  }
  if (email && email.length >= 2) return email.slice(0, 2).toUpperCase();
  if (phone && phone.length >= 2) return phone.replace(/\D/g, '').slice(-2) || 'ME';
  return 'ME';
}
