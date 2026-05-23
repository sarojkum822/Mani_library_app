/** In-memory cache for non-sensitive API payloads (lists, overview stats). Cleared on sign-out. */
export const DATA_CACHE_TTL_MS = 8 * 60 * 1000;

type Entry = { data: unknown; expiresAt: number };

const store = new Map<string, Entry>();

export function getDataCache<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function setDataCache<T>(key: string, data: T, ttlMs = DATA_CACHE_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearDataCache(): void {
  store.clear();
}

export function invalidateDataCacheKey(key: string): void {
  store.delete(key);
}

export const cacheKeys = {
  adminOverview: 'admin:overview',
  adminMembers: 'admin:members:list',
  adminPaymentsScreen: 'admin:payments:screen',
  adminPendingKyc: 'admin:pending-kyc',
  adminFeedback: 'admin:feedback:list',
  adminGallery: 'admin:gallery:list',
  adminAttendance: (fromIso: string, toIso: string, empcode: string) =>
    `admin:attendance:${fromIso}:${toIso}:${empcode}`,
  memberProfile: 'member:profile',
  memberDocuments: 'member:documents',
} as const;
