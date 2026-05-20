import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabasePublicConfig } from '@/lib/supabaseConfig';

export function createMobileSupabaseAuthClient(): SupabaseClient | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;
  return createClient(cfg.url, cfg.anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
