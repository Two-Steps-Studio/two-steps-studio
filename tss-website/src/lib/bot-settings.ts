import { createServiceClient } from "@/lib/supabase-server";

// Mirrors tss-dc-bot/settings.js's getSetting() precedence: a value saved
// in bot_settings (editable from /admin/bot) wins, falling back to the
// .env var of the same name so nothing breaks for keys nobody has set
// from the panel yet.
export async function getBotSetting(key: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("bot_settings").select("value").eq("key", key).maybeSingle();
    if (data?.value && data.value.trim() !== "") return data.value;
  } catch (e) {
    console.error(`[bot-settings] fetch error for ${key}:`, e instanceof Error ? e.message : e);
  }
  return process.env[key] || null;
}
