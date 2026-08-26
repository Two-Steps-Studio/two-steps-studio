"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Bell, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useSectionTheme } from "@/hooks/use-section-theme";
import { useLanguage } from "@/hooks/use-translation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export function MobileHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  // next-themes can't know the real theme during SSR (it lives in
  // localStorage), so resolvedTheme differs between the server-rendered
  // markup and the client's first paint. Gate the icon on mount - same
  // pattern Sidebar.tsx uses for its own theme toggle - instead of
  // rendering it from a value that disagrees with the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Same source the sidebar uses, so both swap to the section's own logo
  // (Games / Records / DEV / E-Sport / main) as the user moves around.
  const { logo, color: sectionColor } = useSectionTheme();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const emailName = (user.email ?? "").split("@")[0] || "";
      setDisplayName(user.user_metadata?.full_name || emailName);
      // Auth metadata only ever holds an OAuth-provided picture. The app's
      // own avatar upload (api/avatars/upload) writes solely to the
      // `profiles` row, never to metadata — so metadata-only was blank for
      // anyone who set an avatar through the app itself. Seed from metadata
      // for an instant paint, then overwrite with the real row once it loads
      // (mirrors TopBar, which already does this).
      const metaAvatar = (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture || null;
      if (metaAvatar) setAvatarUrl(metaAvatar);

      // profiles.id is the Discord snowflake (user_metadata.provider_id),
      // not the Supabase Auth UUID (user.id) — querying by user.id matched
      // a different, empty row instead of the real profile.
      const discordId = (user.user_metadata as any)?.provider_id || user.id;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url,username")
        .eq("id", discordId)
        .maybeSingle();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.username) setDisplayName(data.username);
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const discordId = (user.user_metadata as any)?.provider_id || user.id;

    // Unique-per-mount topic: supabase.channel(topic) dedupes by topic
    // string across the whole app, and supabase.removeChannel() is async
    // (it awaits a real unsubscribe round-trip before deregistering the
    // topic) — so a fixed topic risks a remount reusing a still-registered
    // channel from the previous mount and throwing on .on() after
    // .subscribe(). See src/app/profile/page.tsx for the same fix with the
    // full explanation.
    const channel = supabase
      .channel(`profile_changes:${discordId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${discordId}` },
        (payload: any) => {
          const row = payload.new || payload.old || {};
          if (row.avatar_url) setAvatarUrl(row.avatar_url);
          if (row.username) setDisplayName(row.username);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Odczyt licznika powiadomień po hydratacji
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      setUnread(Number(localStorage.getItem("notif_unread_count") || "0"));
    }
  }, []);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-[var(--border-color)]">
      <div className="h-16 flex items-center justify-between px-4">
        {/* Lewa strona: Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Two Steps Studio — strona główna"
            style={{ "--section-color": sectionColor } as React.CSSProperties}
            className="group relative flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--section-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            {/* Glow picks up the current section's colour, so the accent
                shifts along with the logo itself. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[var(--section-color)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
            />
            <Image
              key={logo}
              src={logo}
              alt="Two Steps Studio"
              width={64}
              height={64}
              priority
              className="w-16 h-16 shrink-0 object-contain transition-opacity duration-300"
            />
          </Link>
        </div>

        {/* Prawa strona: Akcje */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl w-10 h-10 bg-black/5 dark:bg-white/5"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mounted ? resolvedTheme : "placeholder"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {mounted ? (resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />) : <Moon size={20} className="opacity-0" />}
              </motion.div>
            </AnimatePresence>
          </Button>

          <Link href="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
            >
              <Bell size={20} className="text-[var(--text)]" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[var(--color-general)] text-white text-[9px] font-black flex items-center justify-center border border-[var(--border-color)]">
                  {unread}
                </span>
              )}
            </Button>
          </Link>

          {!loading && user ? (
            <Link href="/profile">
              <Button variant="ghost" size="icon" aria-label="Profil" className="rounded-xl w-10 h-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <Avatar className="w-8 h-8 border border-[var(--border-color)]">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : (
                    <AvatarFallback className="text-xs">{displayName?.[0]?.toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </Link>
          ) : !loading ? (
            <Link href="/login">
              <Button variant="ghost" className="rounded-xl h-10 px-3 gap-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <LogIn size={18} className="text-[var(--text)]" />
                <span className="text-sm font-bold text-[var(--text)]">{t.nav.login}</span>
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
