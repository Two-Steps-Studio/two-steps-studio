"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, User as UserIcon, Menu, Bell, Search, Command, LogIn, Languages, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSidebar } from "@/hooks/use-sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LanguageSelect } from "./LanguageSelect";
import { supabase } from "@/lib/supabase";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { toggle } = useSidebar();
  const { t, language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unread, setUnread] = useState<number>(0);
  const [plnBalance, setPlnBalance] = useState<string>("0,00");

  // Hydrate plnBalance from localStorage on client only (after mount)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pln_balance");
      if (stored !== null) {
        setPlnBalance(
          Number(stored).toLocaleString("pl-PL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateCount = () => {
      const c = Number(localStorage.getItem("notif_unread_count") || "0");
      setUnread(Number.isFinite(c) ? c : 0);
    };
    updateCount();
    const handler = (e: any) => {
      const d = e?.detail || {};
      if (typeof d.count === "number") setUnread(d.count);
    };
    window.addEventListener("notifications:count", handler as any);
    window.addEventListener("storage", updateCount as any);
    return () => {
      window.removeEventListener("notifications:count", handler as any);
      window.removeEventListener("storage", updateCount as any);
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const emailName = (user.email ?? "").split("@")[0] || "";
      setDisplayName(user.user_metadata?.full_name || emailName);
      const metaAvatar = (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture || null;
      if (metaAvatar) setAvatarUrl(metaAvatar);
      const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url,username,pln_balance")
          .eq("id", user.id)
          .maybeSingle();
      // Handle error (PGRST116 = 0 rows, or other errors)
      if (error || !data) {
        console.log('[TopBar] Profile not found, using fallback values');
      }
      // Use data if available, otherwise use fallbacks
      const profileData = data || { avatar_url: metaAvatar, username: null, pln_balance: 0 };
      setAvatarUrl(profileData.avatar_url ?? null);
      setDisplayName((profileData.username as string) || user.user_metadata?.full_name || emailName);
      if (profileData.pln_balance !== undefined) {
        localStorage.setItem("pln_balance", String(profileData.pln_balance));
        setPlnBalance(
          Number(profileData.pln_balance).toLocaleString("pl-PL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail || {};
      if (d.avatar_url) setAvatarUrl(d.avatar_url);
      if (d.username) setDisplayName(d.username);
      if (d.pln_balance !== undefined) {
        localStorage.setItem("pln_balance", String(d.pln_balance));
        setPlnBalance(
          Number(d.pln_balance).toLocaleString("pl-PL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
    };
    window.addEventListener("profile:updated", handler as any);
    return () => {
      window.removeEventListener("profile:updated", handler as any);
    };
  }, []);

  // Realtime subscription removed - profile data is synced via regular queries
  // See: https://supabase.com/docs/guides/realtime#react-client
  // The profile is already loaded on mount and refetched when user changes

  return (
      <header className={cn(
          "fixed top-0 right-0 left-0 lg:left-[240px] z-[40] transition-all duration-500 px-4 pt-4",
          isScrolled ? "h-[70px]" : "h-[80px]"
      )}>
        <div className={cn(
            "h-full w-full glass rounded-3xl px-4 md:px-6 flex items-center justify-between transition-all duration-500",
            isScrolled ? "shadow-2xl shadow-black/10 translate-y-[-4px]" : ""
        )}>
          {/* Left Side: Mobile Menu & Search */}
          <div className="flex items-center gap-4 flex-1">
            <button
                onClick={toggle}
                aria-label="Otwórz menu"
                className="lg:hidden p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Menu size={22} />
            </button>

            <div className="hidden md:flex items-center relative max-w-md w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-[var(--color-general)] " size={18} />
              <input
                  maxLength={50}
                  type="text"
                  placeholder={t.nav.searchPlaceholder}
                  className="w-full rounded-2xl py-2.5 pl-12 pr-12 text-sm font-medium focus:ring-2 focus:ring-[var(--color-general)]/20 transition-all outline-none bg-[var(--bg)] border border-[var(--border-color)]"
                  onInput={(e) => {
                    const valid = /^[^\n\r\t]+$/;
                    if (!valid.test(e.currentTarget.value)) {
                      e.currentTarget.value = e.currentTarget.value.replace(/[\n\r\t]/g, '');
                    }
                  }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 border border-white/5 opacity-50 group-focus-within:opacity-100 transition-opacity">
                <Command size={10} className="font-bold" />
              </div>
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1.5">
              {mounted && (
                  <LanguageSelect showImport={false} />
              )}

              <Link href="/notifications">
                <Button variant="ghost" size="icon" aria-label="Powiadomienia" className="rounded-2xl w-11 h-11 relative bg-[var(--bg)] border border-[var(--border-color)] transition-all hover:scale-105 active:scale-95 cursor-pointer">
                  <Bell size={20} />
                  {unread > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--color-general)] text-white text-[10px] font-black flex items-center justify-center border-2 border-[var(--bg)]">
                    {unread}
                  </span>
                  ) : (
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-[var(--color-general)] rounded-full border-2 border-[var(--bg)] opacity-60" />
                  )}
                </Button>
              </Link>
            </div>

            <div className="w-px h-8 bg-[var(--border-color)] mx-1" />



                  {/* Balans PLN */}
                  <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs text-muted-foreground font-medium">Saldo:</span>
                    <span className="text-sm font-black text-[var(--color-general)]">
                      {plnBalance} zł
                    </span>
                  </div>
            
                  {!loading && user ? (
                      <div className="flex items-center gap-1">
                        {/* Nazwa użytkownika */}
                        <div className="hidden sm:flex flex-col items-end mr-1">
                          <span className="text-xs text-muted-foreground font-medium text-[var(--text)]">Witaj,</span>
                          <span className="text-sm font-black text-[var(--color-general)] truncate max-w-[160px]">
                            {displayName || "Użytkownik"}
                          </span>
                        </div>

                  <Link href="/profile">
                    <motion.div
                        whileHover={{ scale: 1.05, borderColor: "var(--color-general)" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-11 h-11 rounded-full border-2 border-[var(--border-color)] overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5 cursor-pointer transition-all relative group"
                    >
                      <Avatar className="w-11 h-11">
                        {avatarUrl ? (
                            <AvatarImage src={avatarUrl} alt="Avatar" onError={() => setAvatarUrl(null)} />
                        ) : (
                            <AvatarFallback className="uppercase font-bold">
                              {(displayName?.[0] || "U").toUpperCase()}
                            </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute inset-0 bg-[var(--color-general)] opacity-0 group-hover:opacity-10 transition-opacity" />
                    </motion.div>
                  </Link>
                </div>
            ) : (
                <Link href="/login">
                  <Button variant="outline" className="rounded-2xl h-11 px-4 border-white/10 hover:bg-white/5 font-bold flex items-center gap-2">
                    <LogIn size={18} />
                    <span className="hidden sm:inline">{t.nav.login}</span>
                  </Button>
                </Link>
            )}
          </div>
        </div>
      </header>
  );
}