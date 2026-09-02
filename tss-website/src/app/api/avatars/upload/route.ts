import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminInitialized } from "@/lib/supabase-admin";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

// --- SECURITY: Validate file extension and mime type before upload ---
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

async function validateFile(file: File | null): Promise<{ valid: boolean; extension?: string; mime?: string }> {
  if (!file) return { valid: false };

  const extension = file.name.split(".").pop()?.toLowerCase();
  const mime = file.type || "";

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME_TYPES.includes(mime)) {
    return { valid: false };
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false };
  }

  return { valid: true, extension, mime };
}

export async function POST(req: Request) {
  // SECURITY: Require authentication
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  // Check if Supabase admin client is initialized
  if (!isSupabaseAdminInitialized || !supabaseAdmin) {
    return NextResponse.json({
      error: "Avatar upload is disabled - contact administrator"
    }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const userId = (form.get("userId") as string) || "";
  const username = (form.get("username") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Brak userId" }, { status: 400 });
  }

  // SECURITY: Only allow uploading to your own profile. `profiles.id` is the
  // Discord snowflake (user_metadata.provider_id), not the Supabase Auth
  // UUID - mirrors the same lookup requireAuth() uses internally.
  const ownDiscordId = (auth.user.user_metadata as any)?.provider_id || auth.user.id;
  if (userId !== ownDiscordId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate file extension and mime type before upload
  const validation = await validateFile(file);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Nieprawidłowy typ pliku. Dozwolone: PNG, JPG, GIF, WEBP (max 10MB)" },
      { status: 400 }
    );
  }

  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b: any) => b.name === "avatars");
  if (!exists) {
    // Must match api/avatars/ensure/route.ts's public:true - both routes can
    // be the one to first create this bucket, and this file already reads
    // it back with getPublicUrl() a few lines down, which only serves
    // working URLs from a public bucket.
    const { error: createError } = await supabaseAdmin.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  }

  // Never use the original filename as (part of) the storage key: Supabase
  // Storage's key validation rejects characters like `~` and `[`/`]`, which
  // show up in filenames straight from phone/TikTok/etc. downloads (e.g.
  // "...~tplv-tiktokx-cropcenter_1080_1080.jpeg") and made every such
  // upload fail with "Invalid key: ...". The extension is already validated
  // above; that's the only part of the original name worth keeping.
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${validation.extension}`;
  const { error: uploadError } = await supabaseAdmin.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
  const url = publicData.publicUrl;

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    username,
    avatar_url: url,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, url });
}
