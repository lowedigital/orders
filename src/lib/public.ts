import { createClient } from '@supabase/supabase-js';

/**
 * Anon-key Supabase client — subject to Row Level Security.
 *
 * Used ONLY to call the get_public_order_tracking() RPC from the public
 * tracking API route (src/app/api/track/route.ts). Because every table has
 * RLS enabled with no anon policies, this client cannot read any table
 * directly — the RPC is a SECURITY DEFINER function that hand-picks the
 * safe fields to return.
 *
 * This client is still only ever instantiated server-side (inside a route
 * handler), so the anon key never ships to the browser bundle either.
 */
export function getPublicClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.'
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
