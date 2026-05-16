import { isoCompare } from '@/lib/adminDates';
import type { Member } from '@/lib/members';

function memberRank(row: Member): number {
  let s = 0;
  if (row.plan !== 'account') s += 100;
  if (row.status === 'active') s += 50;
  return s;
}

/** One roster row per person — prefer active membership with latest end date. */
export function dedupeMembersByUser(members: Member[]): Member[] {
  const byUser = new Map<string, Member>();
  for (const m of members) {
    if (!m.userId) continue;
    const existing = byUser.get(m.userId);
    if (!existing) {
      byUser.set(m.userId, m);
      continue;
    }
    const rankM = memberRank(m);
    const rankE = memberRank(existing);
    if (rankM > rankE) byUser.set(m.userId, m);
    else if (rankM === rankE && isoCompare(m.expiryDate, existing.expiryDate) > 0) byUser.set(m.userId, m);
  }
  return Array.from(byUser.values());
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function digitsOnly(q: string): string {
  return q.replace(/\D/g, '');
}

export function searchMembers(members: Member[], query: string, limit = 25): Member[] {
  const t = normalizeQuery(query);
  if (!t) return [];
  const tDigits = digitsOnly(t);
  const deduped = dedupeMembersByUser(members);
  return deduped
    .filter((m) => {
      const lib = m.libraryNumber.padStart(4, '0');
      const libPlain = m.libraryNumber.replace(/^0+/, '') || '0';
      if (tDigits && (lib.includes(tDigits) || libPlain.includes(tDigits) || digitsOnly(m.id).includes(tDigits))) {
        return true;
      }
      if (m.name.toLowerCase().includes(t)) return true;
      if (m.email.toLowerCase().includes(t)) return true;
      if (m.phone.replace(/\s/g, '').toLowerCase().includes(t.replace(/\s/g, ''))) return true;
      if (m.userId.toLowerCase().includes(t)) return true;
      return false;
    })
    .slice(0, limit);
}
