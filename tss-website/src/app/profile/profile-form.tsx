"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Image as ImageIcon, Save, Check, Frame, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import AvatarFrame from "@/components/AvatarFrame";
import { useLanguage } from "@/hooks/use-translation";

interface OwnedItem {
  id: string;
  name: string;
  value: string;
}

// Same 19 backgrounds the Discord bot's profile card can draw (see
// tss-dc-bot/assets/discord/backgrounds and profileGenerator.js's
// availableBackgrounds) - mirrored under tss-website/public/assets/discord/
// backgrounds/ so a filename picked here renders identically on both.
export const BACKGROUND_OPTIONS = [
  "Two Steps Studio", "Two Steps DEV", "Two Steps Games", "Two Steps Records", "Two Steps E-Sport",
  "Blue", "Light Blue", "Green", "Light Green", "Yellow", "Orange", "Red", "Pink", "Purple", "Brown",
  "Triangles", "Flowers", "Zebra", "Cow", "Panther",
];

export default function ProfileForm({
  user,
  discordId,   // ← Zawsze provider_id z Discorda
  profile,
  onUpdated,
}: {
  user: any;
  discordId: string;
  profile: any;
  onUpdated?: (p: { username?: string; avatar_url?: string; pln_balance?: number; money?: number; background?: string; equipped_frame?: string | null; equipped_nick_color?: string | null }) => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [balance, setBalance] = useState(profile?.pln_balance || 0);
  const [money, setMoney] = useState(profile?.money || 0);
  const [background, setBackground] = useState(profile?.background && profile.background !== "default" ? profile.background : "Two Steps Studio");
  const [equippedFrame, setEquippedFrame] = useState<string | null>(profile?.equipped_frame ?? null);
  const [equippedNickColor, setEquippedNickColor] = useState<string | null>(profile?.equipped_nick_color ?? null);
  const [ownedFrames, setOwnedFrames] = useState<OwnedItem[]>([]);
  const [ownedNickColors, setOwnedNickColors] = useState<OwnedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // What this user has actually bought in /shop - only owned frames/nick
  // colors are selectable here, same restriction the purchase_shop_item RPC
  // enforces server-side.
  useEffect(() => {
    if (!supabase || !discordId) return;
    supabase
      .from("user_inventory")
      .select("shop_items(id, category, name, value)")
      .eq("user_id", discordId)
      .then(({ data }) => {
        const frames: OwnedItem[] = [];
        const colors: OwnedItem[] = [];
        for (const row of (data as any[]) || []) {
          const item = row.shop_items;
          if (!item) continue;
          if (item.category === "frame") frames.push(item);
          else if (item.category === "nick_color") colors.push(item);
        }
        setOwnedFrames(frames);
        setOwnedNickColors(colors);
      });
  }, [discordId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveErrorMsg("");

    // ── KLUCZ: używamy discordId zamiast user.id ──
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: discordId,
        username,
        avatar_url: avatarUrl,
        pln_balance: balance,
        money: money,
        background,
        equipped_frame: equippedFrame,
        equipped_nick_color: equippedNickColor,
        updated_at: new Date().toISOString(),
      });

    setLoading(false);
    if (!error) {
      onUpdated?.({ username, avatar_url: avatarUrl, pln_balance: balance, money: money, background, equipped_frame: equippedFrame, equipped_nick_color: equippedNickColor });
      router.refresh();
    } else {
      // Was silently swallowed before - a blocked write (e.g. an RLS policy
      // rejecting the upsert) looked identical to a successful save with no
      // feedback at all. Surface it like handleFileChange already does.
      //
      // Logged as separate primitives, not the raw error object: a native
      // Error/AbortError (e.g. from the supabase-js auth lock being stolen
      // by a concurrent request) has non-enumerable message/name/stack, so
      // `console.error(label, error)` prints it as "{}" in the browser
      // console - useless for diagnosing which failure actually happened.
      console.error("[ProfileForm] upsert failed:", {
        name: (error as any)?.name,
        message: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      setSaveErrorMsg(error.message || t.profileForm.genericSaveError);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg("");

    try {
      await fetch("/api/avatars/ensure", { method: "POST" });
    } catch {}

    const fd = new FormData();
    fd.append("file", file);
    fd.append("userId", discordId);  // ← discordId zamiast user.id
    fd.append("username", username);

    try {
      // Try to use API route first (which handles permissions)
      const res = await fetch("/api/avatars/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        // Fallback to direct upload (bucket is now private)
        // Never use the original filename as (part of) the storage key:
        // Supabase Storage rejects characters like `~` and `[`/`]`, which
        // show up in filenames straight from phone/TikTok/etc. downloads
        // (e.g. "...~tplv-tiktokx-cropcenter_1080_1080.jpeg") and made
        // every such upload fail with "Invalid key: ...".
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const filePath = `${discordId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          setErrorMsg(json.error || uploadError.message || t.profileForm.genericUploadError);
        } else {
          // For private bucket, we need signed URL for public access
          const { data: urlData } = await supabase.storage
            .from("avatars")
            .createSignedUrl(filePath, 3600); // 1 hour signed URL

          if (urlData && urlData.signedUrl) {
            setAvatarUrl(urlData.signedUrl);

            await supabase.from("profiles").upsert({
              id: discordId,
              username,
              avatar_url: urlData.signedUrl,
              pln_balance: balance,
              money: money,
              background,
              equipped_frame: equippedFrame,
              equipped_nick_color: equippedNickColor,
              updated_at: new Date().toISOString(),
            });

            onUpdated?.({ username, avatar_url: urlData.signedUrl, pln_balance: balance, money: money, background, equipped_frame: equippedFrame, equipped_nick_color: equippedNickColor });
            window.dispatchEvent(new CustomEvent("profile:updated", { detail: { avatar_url: urlData.signedUrl, username } }));
            router.refresh();
          } else {
            throw new Error("Failed to create signed URL");
          }
        }
      } else {
        const url = json.url as string;
        setAvatarUrl(url);
        onUpdated?.({ username, avatar_url: url, pln_balance: balance, money: money });
        window.dispatchEvent(new CustomEvent("profile:updated", { detail: { avatar_url: url, username } }));
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(t.profileForm.connectionUploadError);
    }

    setUploading(false);
  };

  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-[var(--bg)] border border-[var(--border-color)] backdrop-blur-xl shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="relative z-10 border-b border-[var(--border-color)] pb-6">
        <CardTitle className="font-[family-name:var(--font-space)] text-xl flex items-center gap-2">
          <User className="text-[var(--color-general)]" /> {t.profileForm.editProfile}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 pt-6">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="username" className="text-[var(--text)] ml-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
                <User size={14} /> {t.profileForm.usernameLabel}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-2xl border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
                placeholder={t.profileForm.usernamePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarFile" className="text-[var(--text)] ml-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
                <ImageIcon size={14} /> {t.profileForm.uploadFileLabel}
              </Label>
              <Input
                id="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="rounded-2xl border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text)] file:text-[var(--text)] file:bg-[var(--color-general)] file:border-0 file:rounded-xl file:px-4 file:py-2 h-12"
              />
              <p className="text-xs text-[var(--text)] font-[family-name:var(--font-outfit)]">
                {uploading ? t.profileForm.uploading : t.profileForm.supportedFormats}
              </p>
              {errorMsg && <p className="text-xs text-red-500 font-[family-name:var(--font-outfit)]">{errorMsg}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--text)] ml-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
              <ImageIcon size={14} /> {t.profileForm.backgroundLabel}
            </Label>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_OPTIONS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBackground(bg)}
                  title={bg}
                  className={`relative w-24 aspect-[2/1] rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    background === bg
                      ? "border-[var(--color-general)] ring-2 ring-[var(--color-general)]/40"
                      : "border-[var(--border-color)] opacity-70 hover:opacity-100"
                  }`}
                >
                  <NextImage
                    src={`/assets/discord/backgrounds/${encodeURIComponent(bg)}.png`}
                    alt={bg}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                  {background === bg && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check size={18} className="text-white drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--text)] ml-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
              <Frame size={14} /> {t.profileForm.frameLabel}
            </Label>
            {ownedFrames.length === 0 ? (
              <p className="text-xs text-[var(--text)] opacity-60 font-[family-name:var(--font-outfit)]">
                {t.profileForm.noFramesOwnedPrefix}<Link href="/shop" className="text-[var(--color-general)] underline">{t.profileForm.visitShop}</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEquippedFrame(null)}
                  className={`h-12 w-12 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer ${
                    equippedFrame === null
                      ? "border-[var(--color-general)] ring-2 ring-[var(--color-general)]/40"
                      : "border-[var(--border-color)] opacity-70 hover:opacity-100"
                  }`}
                  title={t.profileForm.noFrame}
                >
                  {t.profileForm.noFrame}
                </button>
                {ownedFrames.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEquippedFrame(f.id)}
                    title={f.name}
                    className={`relative h-12 w-12 rounded-full shrink-0 cursor-pointer flex items-center justify-center transition-all ${
                      equippedFrame === f.id ? "ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--color-general)]" : ""
                    }`}
                  >
                    <span className="h-8 w-8 rounded-full bg-[var(--bg)]" />
                    <AvatarFrame frameId={f.id} className="absolute -inset-0.5" />
                    {equippedFrame === f.id && <Check size={14} className="absolute text-white drop-shadow z-10" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--text)] ml-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
              <Palette size={14} /> {t.profileForm.nickColorLabel}
            </Label>
            {ownedNickColors.length === 0 ? (
              <p className="text-xs text-[var(--text)] opacity-60 font-[family-name:var(--font-outfit)]">
                {t.profileForm.noColorsOwnedPrefix}<Link href="/shop" className="text-[var(--color-general)] underline">{t.profileForm.visitShop}</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEquippedNickColor(null)}
                  className={`h-9 w-9 rounded-full border-2 bg-white flex items-center justify-center shrink-0 cursor-pointer ${
                    equippedNickColor === null
                      ? "border-[var(--color-general)] ring-2 ring-[var(--color-general)]/40"
                      : "border-[var(--border-color)] opacity-70 hover:opacity-100"
                  }`}
                  title={t.profileForm.defaultColor}
                />
                {ownedNickColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEquippedNickColor(c.id)}
                    title={c.name}
                    className={`relative h-9 w-9 rounded-full border-2 shrink-0 cursor-pointer flex items-center justify-center ${
                      equippedNickColor === c.id ? "border-[var(--color-general)] ring-2 ring-[var(--color-general)]/40" : "border-[var(--border-color)]"
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {equippedNickColor === c.id && <Check size={14} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {saveErrorMsg && (
            <p className="text-sm text-red-500 font-[family-name:var(--font-outfit)] text-center md:text-right">{saveErrorMsg}</p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading || uploading}
              className="w-full md:w-auto px-8 rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 transition-all duration-300 shadow-[0_0_20px_-5px_var(--color-general)] hover:shadow-[0_0_25px_-5px_var(--color-general)] hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.profileForm.saving}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t.profileForm.saveChanges}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}