import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// OAuth logins (Discord/Google) used to redirect straight to a protected
// route (/profile). proxy.ts checks auth server-side on every request and
// redirects unauthenticated visitors to /login - but the PKCE `code` in
// the OAuth redirect only gets exchanged for a real session client-side,
// in the browser. On that first request to /profile?code=..., no session
// exists yet, so proxy.ts bounced straight back to /login, stripping the
// code before the page's own JS ever got a chance to exchange it. Login
// "succeeded" against Discord but never actually signed the user in.
//
// This route exchanges the code for a session server-side (so proxy.ts
// sees a real, cookie-backed session on the very next request) before
// redirecting anywhere protected.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/profile";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    } catch (err: any) {
      console.error("[auth/callback] error:", err.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
