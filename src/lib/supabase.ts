import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseClient } from '@supabase/supabase-js';

// This is a singleton to ensure we only have one Supabase client.
let supabase: SupabaseClient | null = null;

/**
 * Get a Supabase client.
 *
 * @returns {SupabaseClient} A Supabase client.
 */
export function getSupabase() {
  if (!supabase) {
    supabase = createPagesBrowserClient();
  }

  return supabase;
}
