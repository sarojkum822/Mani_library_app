export type PunchRecord = {
  Empcode: string;
  Name: string;
  INTime: string;
  OUTTime: string;
  WorkTime: string;
  OverTime: string;
  BreakTime: string;
  Status: 'P' | 'A' | 'HD' | 'WO' | 'H' | string;
  DateString: string;
  Remark: string;
  Erl_Out: string;
  Late_In: string;
};

export type AttendanceResponse = {
  InOutPunchData: PunchRecord[];
};

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    P: 'Present',
    A: 'Absent',
    HD: 'Half Day',
    WO: 'Week Off',
    H: 'Holiday',
  };
  return map[status] ?? status;
}

export function hasTime(t: string): boolean {
  return Boolean(t) && t !== '--:--' && t !== '00:00';
}

export function parseDMY(s: string): Date {
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDMY(s: string): string {
  try {
    return parseDMY(s).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

export function todayDMY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function groupByEmployee(records: PunchRecord[]): Map<string, PunchRecord[]> {
  const map = new Map<string, PunchRecord[]>();
  for (const r of records) {
    const list = map.get(r.Empcode) ?? [];
    list.push(r);
    map.set(r.Empcode, list);
  }
  return map;
}

export function todayRecords(records: PunchRecord[]): PunchRecord[] {
  const today = todayDMY();
  return records.filter((r) => r.DateString === today);
}

export function sortRecords(records: PunchRecord[]): PunchRecord[] {
  return [...records].sort((a, b) => {
    if (a.Status === b.Status) return a.Name.localeCompare(b.Name);
    if (a.Status === 'P') return -1;
    if (b.Status === 'P') return 1;
    return a.Name.localeCompare(b.Name);
  });
}

/** Newest calendar day first, then present-first within a day. */
export function sortRecordsByDate(records: PunchRecord[]): PunchRecord[] {
  return [...records].sort((a, b) => {
    const da = parseDMY(a.DateString).getTime();
    const db = parseDMY(b.DateString).getTime();
    if (da !== db) return db - da;
    if (a.Status === b.Status) return a.Name.localeCompare(b.Name);
    if (a.Status === 'P') return -1;
    if (b.Status === 'P') return 1;
    return a.Name.localeCompare(b.Name);
  });
}

export type AttendanceDateSection = { title: string; dateDmy: string; data: PunchRecord[] };

export function groupRecordsByDate(records: PunchRecord[]): AttendanceDateSection[] {
  const map = new Map<string, PunchRecord[]>();
  for (const r of records) {
    const list = map.get(r.DateString) ?? [];
    list.push(r);
    map.set(r.DateString, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => parseDMY(b[0]).getTime() - parseDMY(a[0]).getTime())
    .map(([dateDmy, data]) => ({
      dateDmy,
      title: formatDMY(dateDmy),
      data: sortRecords(data),
    }));
}
