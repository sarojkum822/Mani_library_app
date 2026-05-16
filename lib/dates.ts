export function ymdFromIsoish(raw: string | null | undefined): string {
  if (!raw) return '';
  const t = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
}

export function formatYmdDdMmYyyy(ymd: string): string {
  if (!ymd) return '—';
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) return ymd;
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
