import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Export a flag to check if Supabase is configured
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// NOTE: there used to be a `hardlinks` option spread in here, meant as a
// "Turbopack hardlink fix" gated by NEXT_PUBLIC_SUPABASE_USE_HARDLINKS.
// createBrowserClient's options type has no such field -- TS flagged the
// call as not matching any overload -- and passing an unknown key on a
// plain options object is simply ignored at runtime, so it never did
// anything either way. Removed rather than kept as a misleading no-op; if
// Turbopack fetch issues come back, that env var and any real fix belong in
// next.config.ts, not here.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Session expiry configuration
 * - access_token: 15-60 minutes (default)
 * - refresh_token: 7-30 days (default)
 * - auto-renewal enabled for seamless sessions
 * - Session expiry can be controlled via Supabase Dashboard
 * - Default: 24 hours for access tokens in production
 */
export const SESSION_EXPIRY_HOURS = parseInt(process.env.SUPABASE_SESSION_EXPIRY || '24', 10);

/**
 * Session security settings
 */
export const SESSION_SECURITY = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  requireEmailVerification: true,
  sessionTimeoutMinutes: SESSION_EXPIRY_HOURS * 60,
};
