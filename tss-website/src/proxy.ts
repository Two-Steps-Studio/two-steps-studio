import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// --- Rate Limiting & Security ---
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 100;
const WINDOW_MS = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // No record yet, or the previous window expired: start a fresh window.
  if (!record || now >= record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // SECURITY: Sanitize IP address to prevent injection
    const ip = forwarded.split(",")[0].trim();
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^localhost$/;
    if (ipRegex.test(ip)) {
      return ip;
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    const ip = realIp.trim();
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^localhost$/;
    if (ipRegex.test(ip)) {
      return ip;
    }
  }

  // Edge runtime's NextRequest has no underlying socket to fall back to —
  // without a forwarding header from the proxy in front of it, there is no
  // real client IP available here.
  return "unknown";
}

// --- Bot Detection & Protection ---
const BOT_PATTERNS = [
  /bot|crawler|spider|scraper/i,
  /curl|wget|python|ruby|perl|node\.js|java/i,
  /sqlmap|nikto|nuclei|nmap/i,
];

async function detectBot(request: NextRequest): Promise<{ isBot: boolean; botType: string | null }> {
  const ua = request.headers.get("user-agent") || "";

  // Check for bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      const match = ua.match(pattern);
      return { isBot: true, botType: match?.[0]?.replace(/\/gi/g, '') || 'unknown-bot' };
    }
  }

  // Check for suspicious header combinations
  const accept = request.headers.get("accept") || "";
  if (accept.includes('*/*') && !ua.includes('Mozilla')) {
    return { isBot: true, botType: 'suspicious-accept' };
  }

  return { isBot: false, botType: null };
}

function handleBotRequest(request: NextRequest, botType: string): NextResponse {
  // Log bot detection
  const ip = getClientIp(request);
  console.log(`[${new Date().toISOString()}] [BOT-DETECTION] Blocked: ${botType} from ${ip}`);

  // Rate limit for bots (stricter)
  if (rateLimitStore.has(ip) && rateLimitStore.get(ip)!.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Block known attack tools immediately
  if (/sqlmap|nikto|nuclei/i.test(botType)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: { "X-Content-Type-Options": "nosniff" } }
    );
  }

  // Warn about scraper/crawler
  if (/crawler|scraper/i.test(botType)) {
    return NextResponse.json(
      { error: "Scraping is disabled on this site" },
      { status: 403 }
    );
  }

  // Allow basic user agents with "bot" in name (Googlebot, Bingbot, etc.)
  if (/googlebot|bingbot|baidu|yandex/i.test(botType)) {
    return NextResponse.next();
  }

  // Default: block unknown bots
  return NextResponse.json(
    { error: "Access denied" },
    { status: 403 }
  );
}

// --- Logging for security monitoring ---
const securityLog = (endpoint: string, action: string, user?: string, ip?: string, details?: string) => {
  const logEntry = `[${new Date().toISOString()}] [SECURITY] ${action} - ${endpoint} | User: ${user || 'N/A'} | IP: ${ip || 'N/A'}${details ? ` | ${details}` : ''}`;
  console.log(logEntry);
};

export async function proxy(request: NextRequest) {
  const ip = getClientIp(request);

  // Add secure headers
  const headers: HeadersInit = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
    "Cache-Control": "public, max-age=31536000, stale-while-revalidate=31536000",
  };

  // Production: add HSTS
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
    headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'none'; object-src 'none';";
  }

  // Apply security headers
  headers[
    "X-Download-Options"
  ] = "noopen";
  headers[
    "X-XSS-Protection"
  ] = "1; mode=block";
  headers[
    "X-Permitted-Cross-Domain-Policies"
  ] = "none";

  // Detect bots before rate limiting
  const botDetection = await detectBot(request);
  if (botDetection.isBot) {
    return handleBotRequest(request, botDetection.botType || '');
  }

  // Check request rate limit
  if (!checkRateLimit(ip)) {
    securityLog(request.url, "RATE_LIMIT_EXCEEDED", undefined, ip);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Only create Supabase client if credentials exist
  let user = null;
  let supabase = null;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // PERF: supabase.auth.getUser() performs a network round-trip to Supabase
  // to validate the JWT (unlike getSession(), which reads locally), costing
  // ~100ms on every request for a signed-in user. Only a handful of path
  // prefixes below actually consult `user`, so for everything else — most
  // notably /api/*, where each route already calls requireAuth() and would
  // repeat the very same lookup — skip the client entirely and return early.
  const pathname = request.nextUrl.pathname;
  const AUTH_AWARE_PREFIXES = [
    "/profile", "/settings", "/notifications", // protected
    "/login", "/registration",                    // redirect-if-signed-in
    "/dev", "/games", "/records",                 // project access + category visibility
  ];
  if (!AUTH_AWARE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return response;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    user = (await supabase.auth.getUser()).data.user;
  }

  // Protected routes
  const protectedRoutes = ["/profile", "/settings", "/notifications"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // DEV routes - check specific project access for /dev/projects/[id] routes
  const isDevRoute = request.nextUrl.pathname.startsWith("/dev");
  const projectMatch = request.nextUrl.pathname.match(/^\/dev\/projects\/(\d+)/);
  if (isDevRoute && user && supabase && projectMatch) {
    try {
      const projectId = parseInt(projectMatch[1]);

      // Check if user has access to this specific project
      const { data: project, error: projectError } = await supabase
        .from("dev_projects")
        .select("id, owner_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.redirect(new URL("/dev?project-not-found=true", request.url));
      }

      // Check if user is owner or member
      const isOwner = project.owner_id === user.id;
      const { count: memberCount } = await supabase
        .from("dev_project_members")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      if (!isOwner && (!memberCount || memberCount === 0)) {
        // User doesn't have access to this specific project
        return NextResponse.redirect(new URL("/dev?project-access-denied=true", request.url));
      }
    } catch (error) {
      console.error("DEV project access check failed:", error);
      // Allow access if check fails to avoid blocking legitimate users
    }
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id), not
  // the Supabase Auth UUID — user.id never matched the real row for a
  // Discord-linked account, so `profile` below was always null and every
  // logged-in Discord user got redirected away from /games and /records
  // via the `!profile` branch, regardless of their actual setting.
  const discordId = user ? (user.user_metadata as any)?.provider_id || user.id : null;

  // Games routes - check if Games category is visible
  const isGamesRoute = request.nextUrl.pathname.startsWith("/games");
  if (isGamesRoute && user && supabase) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("games_visible")
        .eq("id", discordId)
        .single();

      // Default to true if not set
      if (!profile || profile.games_visible === false) {
        return NextResponse.redirect(new URL("/?category-disabled=games", request.url));
      }
    } catch (error) {
      console.error("Games visibility check failed:", error);
    }
  }

  // Records routes - check if Records category is visible
  const isRecordsRoute = request.nextUrl.pathname.startsWith("/records");
  if (isRecordsRoute && user && supabase) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("records_visible")
        .eq("id", discordId)
        .single();

      // Default to true if not set
      if (!profile || profile.records_visible === false) {
        return NextResponse.redirect(new URL("/?category-disabled=records", request.url));
      }
    } catch (error) {
      console.error("Records visibility check failed:", error);
    }
  }

  // Auth routes (redirect to profile if already logged in)
  const authRoutes = ["/login", "/registration"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    securityLog(request.url, "UNAUTHORIZED_ACCESS", undefined, ip, `Attempted access to: ${request.nextUrl.pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - handled separately if needed, or included)
     * - manifest.webmanifest (PWA manifest)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$|manifest.webmanifest).*)",
  ],
};
