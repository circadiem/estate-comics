// Supabase server-side client (WO-04)
//
// Uses the SERVICE ROLE key, which bypasses row-level security. This module
// must only ever be imported from server code (API routes, server actions).
// Never import it from a client component — the key would land in the bundle.
//
// Lazy singleton, throw-if-missing: the same pattern as the Resend and
// Anthropic clients. A misconfigured deployment fails at first use with a
// clear message rather than silently returning empty results.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      // Server-side: no browser session, no token refresh loop.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
