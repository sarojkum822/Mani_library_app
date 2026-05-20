/** Shared Supabase public config — avoids createClient() on invalid URLs (EAS builds missing env). */

export function getSupabasePublicConfig(): { url: string; anon: string } | null {
  const url =
    typeof process.env.EXPO_PUBLIC_SUPABASE_URL === 'string' ? process.env.EXPO_PUBLIC_SUPABASE_URL.trim() : '';
  const anon =
    typeof process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'string' ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim() : '';
  if (!url || !anon) return null;
  if (url === 'undefined' || url === 'null') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { url, anon };
}
