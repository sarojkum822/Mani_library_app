import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AdminDateRange, DateRangePreset } from '@/components/admin/AdminDateRangeFilter';
import type { PunchRecord } from '@/lib/attendance';

const KEY = 'admin_attendance_prefs_v1';
const DATA_PREFIX = 'admin_attendance_data:';
const DATA_TTL_MS = 8 * 60 * 1000;

export type AdminAttendancePrefs = {
  range: AdminDateRange;
  libraryFilter: string;
};

const PRESETS: DateRangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'custom'];

function isValidRange(r: unknown): r is AdminDateRange {
  if (!r || typeof r !== 'object') return false;
  const o = r as AdminDateRange;
  return (
    typeof o.fromIso === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.fromIso) &&
    typeof o.toIso === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.toIso) &&
    PRESETS.includes(o.preset)
  );
}

export async function loadAdminAttendancePrefs(): Promise<AdminAttendancePrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminAttendancePrefs>;
    if (!isValidRange(parsed.range)) return null;
    return {
      range: parsed.range,
      libraryFilter: typeof parsed.libraryFilter === 'string' ? parsed.libraryFilter : '',
    };
  } catch {
    return null;
  }
}

export async function saveAdminAttendancePrefs(prefs: AdminAttendancePrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

type DiskPayload = { savedAt: number; rows: PunchRecord[] };

export async function loadAttendanceDiskCache(cacheKey: string): Promise<PunchRecord[] | null> {
  try {
    const raw = await AsyncStorage.getItem(DATA_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiskPayload;
    if (!parsed?.rows || !Array.isArray(parsed.rows)) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > DATA_TTL_MS) return null;
    return parsed.rows;
  } catch {
    return null;
  }
}

export async function saveAttendanceDiskCache(cacheKey: string, rows: PunchRecord[]): Promise<void> {
  try {
    const payload: DiskPayload = { savedAt: Date.now(), rows };
    await AsyncStorage.setItem(DATA_PREFIX + cacheKey, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
