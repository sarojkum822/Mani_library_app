import { useCallback, useEffect, useRef, useState } from 'react';

import { DATA_CACHE_TTL_MS, getDataCache, setDataCache } from '@/lib/dataCache';

/** Show cached data immediately, then refresh from the API in the background. */
export function useStaleWhileRevalidate<T>({
  cacheKey,
  fetcher,
  ttlMs = DATA_CACHE_TTL_MS,
  refreshKey = 0,
  enabled = true,
}: {
  cacheKey: string;
  fetcher: () => Promise<T>;
  ttlMs?: number;
  refreshKey?: number;
  enabled?: boolean;
}) {
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readCache = useCallback((): T | null => getDataCache<T>(cacheKey), [cacheKey]);

  const persist = useCallback(
    (value: T) => {
      setDataCache(cacheKey, value, ttlMs);
      setData(value);
      setError(null);
    },
    [cacheKey, ttlMs],
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const cached = readCache();

    queueMicrotask(() => {
      if (cancelled) return;

      if (cached != null) {
        setData(cached);
        setLoading(false);
        setRevalidating(true);
      } else {
        setLoading(true);
        setRevalidating(false);
      }

      void (async () => {
        try {
          const fresh = await fetcherRef.current();
          if (cancelled) return;
          persist(fresh);
        } catch (e) {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : 'Could not load data.';
          if (cached == null) setError(message);
        } finally {
          if (!cancelled) {
            setLoading(false);
            setRevalidating(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, refreshKey, enabled, readCache, persist]);

  return { data, loading, revalidating, error, setData: persist };
}
