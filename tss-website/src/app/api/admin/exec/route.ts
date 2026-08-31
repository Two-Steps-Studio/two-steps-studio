import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminInitialized } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/api-rate-limit";
import { timingSafeEqualString } from "@/lib/api-auth";

const adminSecurityLog = (action: string, ip: string, endpoint: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SECURITY] Admin API ${action} - ${endpoint} | IP: ${ip}`);
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // --- Rate Limiting ---
  // The previous counter here was a no-op: `now < WINDOW_MS` compared a
  // millisecond epoch timestamp against a 30000 window-length constant
  // (always false — Date.now() is billions), so the 429 branch could
  // never run, and the line right after it (`requestCount = 0`) reset the
  // counter on every single request regardless, so it could never exceed
  // 1 anyway. checkRateLimit() is the same correct, shared limiter used
  // elsewhere in the API.
  const rateLimit = checkRateLimit(`admin-exec:${ip}`, "admin");
  if (!rateLimit.allowed) {
    adminSecurityLog(`Rate limit exceeded`, ip, req.url);
    return NextResponse.json(
      { error: "Za wiele zapytań. Proszę spróbować później." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // --- Input Validation ---
  try {
    const body = await req.json();
    const password = (body?.password as string) || "";
    const name = (body?.name as string) || "";
    const command = (body?.command as string) || "";
    const secret = process.env.ADMIN_CONSOLE_PASSWORD || "";
    const allowedUser = (process.env.ADMIN_CONSOLE_USER || "TwoStepsStudioAdmin").trim().toLowerCase();

    // --- Admin Authentication ---
    if (!secret) {
      return NextResponse.json({ error: "Konfiguracja nieprawidlowa" }, { status: 500 });
    }
    if (name.trim().toLowerCase() !== allowedUser) {
      adminSecurityLog(`Invalid name`, ip, req.url);
      return NextResponse.json({ error: "Nieprawidlowa nazwa uzytkownika" }, { status: 401 });
    }
    if (!password || !timingSafeEqualString(password, secret)) {
      adminSecurityLog(`Invalid password`, ip, req.url);
      return NextResponse.json({ error: "Nieprawidlowe haslo" }, { status: 401 });
    }

    // --- Check if Supabase admin client is initialized ---
    if (!isSupabaseAdminInitialized || !supabaseAdmin) {
      return NextResponse.json({
        error: "Funkcja niedostepna - brak uwierasciwienia Supabase",
        details: "SUPABASE_SERVICE_ROLE_KEY nie jest ustawiony"
      }, { status: 503 });
    }

    // --- Command Validation ---
    if (!command) {
      return NextResponse.json({ error: "Brak komendy" }, { status: 400 });
    }

    const parts = command.split(" ").filter(Boolean);
    const cmd = parts[0];
    let result = "";

    // Validate role names
    const VALID_ROLES = ["OWNER", "ADMIN", "MOD", "VIP", "DEV", "PROD", "MKT", "LD"];
    if (cmd === "set-role" && parts.length >= 3) {
      if (!VALID_ROLES.includes(parts[2].toUpperCase())) {
        return NextResponse.json({ error: "Nieprawidlowa nazwa roli" }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("profiles").update({ rank: parts[2] }).eq("id", parts[1]);
      if (error) throw new Error(error.message);
      result = `Ustawiono role ${parts[2]} dla ${parts[1]}`;
    }
    // Validate level range
    else if (cmd === "set-level" && parts.length >= 3) {
      const level = parseInt(parts[2], 10);
      if (!Number.isFinite(level) || level < 1 || level > 100) {
        return NextResponse.json({ error: "Poziom musi byc liczbą od 1 do 100" }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("profiles").update({ level }).eq("id", parts[1]);
      if (error) throw new Error(error.message);
      result = `Ustawiono level ${level} dla ${parts[1]}`;
    }
    // Validate XP range
    else if (cmd === "add-xp" && parts.length >= 3) {
      const amount = parseInt(parts[2], 10);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1000) {
        return NextResponse.json({ error: "Ilosc XP musi byc liczbą od 0 do 1000" }, { status: 400 });
      }
      const { data, error: selErr } = await supabaseAdmin.from("profiles").select("xp").eq("id", parts[1]).single();
      if (selErr) throw new Error(selErr.message);
      const next = (data?.xp || 0) + amount;
      const { error } = await supabaseAdmin.from("profiles").update({ xp: next }).eq("id", parts[1]);
      if (error) throw new Error(error.message);
      result = `Dodano ${amount} XP (${next}) dla ${parts[1]}`;
    }
    else {
      return NextResponse.json({ error: "Nieznana komenda. Uzyj: set-role <id> <role>, set-level <id> <level>, add-xp <id> <xp>" }, { status: 400 });
    }

    adminSecurityLog(`Success`, ip, req.url);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    adminSecurityLog(`Error`, ip, req.url);
    return NextResponse.json({ error: "Blad serwera", details: String(err) }, { status: 500 });
  }
}
