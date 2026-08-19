"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useSidebar } from "@/hooks/use-sidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export function MobileHeader() {
  const { theme, setTheme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<string | undefined>(undefined);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setResolvedTheme("light");
    const themeChange = () => setResolvedTheme(mediaQuery ? "dark" : "light");
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeChange);
    theme?.onChange?.(themeChange);
    return () => {
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", themeChange);
    };
  }, [theme]);
  const { toggle } = useSidebar();
  const { user, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const emailName = (user.email ?? "").split("@")[0] || "";
      setDisplayName(user.user_metadata?.full_name || emailName);
      const metaAvatar = (user.user_metadata as any)?.avatar_url || null;
      setAvatarUrl(metaAvatar);
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("profile_changes:" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
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
        {/* Lewa strona: Logo i menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Menu size={22} className="text-[var(--text)]" />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-general)] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">TSS</span>
            </div>
            <span className="hidden whitespace-nowrap font-black text-[var(--text)] sm:inline">TWO STEPS</span>
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
                key={resolvedTheme}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
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
        </div>
      </div>
    </header>
  );
}
