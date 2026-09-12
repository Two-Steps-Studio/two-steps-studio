import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Usługa niedostępna" }, { status: 503 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Zaloguj się, żeby odebrać kod." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = body?.code;
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Podaj kod." }, { status: 400 });
  }

  // profiles.id is the Discord snowflake (user_metadata.provider_id) or,
  // for an email-registered account, its own Supabase Auth UUID - same
  // convention as the rest of the site (api/user/settings/route.ts).
  const discordId = (user.user_metadata as any)?.provider_id || user.id;

  const service = createServiceClient();
  const { data, error } = await service.rpc("redeem_promo_code", {
    p_user_id: discordId,
    p_code: code,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "PGRST205") {
      return NextResponse.json({ error: "Kody promocyjne nie są jeszcze skonfigurowane." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data?.[0];
  if (!result?.success) {
    return NextResponse.json({ error: result?.message || "Nieprawidłowy kod." }, { status: 400 });
  }

  return NextResponse.json({
    rewardMoney: result.reward_money,
    rewardXp: result.reward_xp,
    newMoney: result.new_money,
  });
}
