import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import { timingSafeEqualString } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/api-rate-limit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  
  // If auth failed, return isAdmin: false (for compatibility)
  if (isAuthError(auth)) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }

  // Check if user is admin using new helper
  const adminCheck = requireAdmin(auth);
  
  const isAdmin = adminCheck === null;
  return NextResponse.json({ isAdmin }, { status: 200 });
}

export async function POST(req: NextRequest) {
  // Check rate limit. (The previous hand-rolled version here never actually
  // blocked anyone: `now < record.resetTime` compared a millisecond epoch
  // timestamp against a 60000 window-length constant, always false, and
  // `record?.count || 0 + 1` parses as `record.count || 1` — due to
  // operator precedence — so the counter got stuck at 1 and never
  // incremented. checkRateLimit() is the same correct, already-used
  // limiter the rest of the API relies on.)
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateLimit = checkRateLimit(`admin-auth:${ip}`, "admin");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  try {
    const body = await req.json();
    const password = (body?.password as string) || "";
    const name = (body?.name as string) || "";
    const secret = process.env.ADMIN_CONSOLE_PASSWORD || "";
    const allowedUser = (process.env.ADMIN_CONSOLE_USER || "TwoStepsStudioAdmin").trim().toLowerCase();
    
    if (!secret) {
      return NextResponse.json({ error: "Brak konfiguracji hasła" }, { status: 500 });
    }
    if (!password || !name) {
      return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
    }
    if (name.trim().toLowerCase() !== allowedUser) {
      return NextResponse.json({ error: "Nieprawidłowa nazwa" }, { status: 401 });
    }
    if (!timingSafeEqualString(password, secret)) {
      return NextResponse.json({ error: "Hasło nieprawidłowe" }, { status: 401 });
    }

    // Add debug headers if enabled
    let headers: HeadersInit = {};
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true') {
      headers = {
        "X-Debug-Mode": "enabled",
        "X-Environment": process.env.NODE_ENV || 'unknown',
      };
    }

    return NextResponse.json({ ok: true }, headers);
  } catch {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
