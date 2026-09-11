import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminInitialized } from "@/lib/supabase-admin";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

export async function POST() {
  // Uses the service-role admin client for a privileged storage operation -
  // had no auth check at all, so anyone could invoke it repeatedly.
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  // Check if Supabase admin client is initialized
  if (!isSupabaseAdminInitialized || !supabaseAdmin) {
    return NextResponse.json({
      error: "Avatar bucket creation is disabled - contact administrator"
    }, { status: 503 });
  }

  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }
  const exists = (buckets || []).some((b: any) => b.name === "avatars");
  if (!exists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: true });
  }
  return NextResponse.json({ ok: true, created: false });
}
