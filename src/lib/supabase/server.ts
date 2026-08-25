import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * SERVER-ONLY. Never import this file from a 'use client' component or
 * anything that ships to the browser. It should only be used inside:
 *   - Route handlers (src/app/api/**\/route.ts)
 *   - Server Actions
 *   - Server Components that read admin-only data
 *
 * All admin dashboard reads/writes go through this client because the admin
 * session is authenticated by our own signed cookie (see src/lib/auth.ts),
 * not by Supabase Auth — RLS has no policies granting these tables to
 * anon/authenticated roles, so the service role key is what makes admin
 * operations possible at all.
 */
export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
