import { getDataCache, setDataCache, invalidateDataCacheKey } from '@/lib/dataCache';

export const PUBLIC_GALLERY_CACHE_KEY = 'public:gallery:v1';
export const PUBLIC_HERO_CACHE_KEY = 'public:hero:v1';
export const PUBLIC_TESTIMONIALS_CACHE_KEY = 'public:testimonials:v1';
export const PUBLIC_CONTENT_TTL_MS = 30 * 60 * 1000;

export function readPublicCache<T>(key: string): T | null {
  return getDataCache<T>(key);
}

export function writePublicCache<T>(key: string, data: T): void {
  setDataCache(key, data, PUBLIC_CONTENT_TTL_MS);
}

export function invalidatePublicGalleryCache(): void {
  invalidateDataCacheKey(PUBLIC_GALLERY_CACHE_KEY);
}
