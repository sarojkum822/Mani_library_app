/** ISO `YYYY-MM-DD` → eTime `DD/MM/YYYY` (admin attendance API). */
export function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}

export function todayIsoYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIsoYmd(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** `DD/MM/YYYY` → ISO `YYYY-MM-DD`. */
export function dmyToIso(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split('/').map((p) => p.trim());
  if (!dd || !mm || !yyyy) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** Compare ISO dates (inclusive range check). */
export function isoCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Days between two ISO dates (inclusive count). */
export function inclusiveDaySpan(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t2 - t1) / 86_400_000) + 1;
}

/** Padded device user id for `empcode` query param. */
export function deviceUserIdToEmpcode(deviceUserId: string): string {
  const n = parseInt(deviceUserId.trim(), 10);
  if (!Number.isFinite(n)) return deviceUserId.trim();
  return String(n).padStart(4, '0');
}
