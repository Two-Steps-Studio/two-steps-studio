import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Unauthenticated env-var-presence probe with no caller anywhere in the
  // app - a leftover debug endpoint left reachable in production.
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  return NextResponse.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}
