"use client";

import Link from "next/link";
import Image from "next/image";
import {
  X,
  ChevronRight,
  Sun,
  Moon,
  Home,
  HomeIcon,
  User,
  Users,
  Settings,
  Bell,
  Gamepad,
  Trophy,
  Mic2,
  Music2,
  FolderOpen,
  Mail,
  Code,
  BookOpen,
  Book,
  Server,
  Layout,
  Database,
  Shield,
  Clipboard,
  Terminal,
  Search,
  TreePine,
  Cpu,
  File,
  NotebookText,
  CalendarFold,
  FileText, Map, CheckSquare, FolderKanban, Download,
  Briefcase,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSectionTheme } from "../hooks/use-section-theme";
import { useLanguage } from "../hooks/use-translation";
import { useTheme } from "next-themes";
import { BottomNavigation } from "./BottomNavigation";
import { SidebarStats } from "./SidebarStats";
import { supabase } from "@/lib/supabase";

export function Sidebar({ isOpen: sidebarOpen }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const { close } = useSidebar();
  const { t, language, setLanguage } = useLanguage();
  const { logo } = useSectionTheme();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [categoryVisibility, setCategoryVisibility] = useState({
    games: true,
    records: true,
    dev: true,
  });

  useEffect(() => {
    setMounted(true);
    
    // Load category visibility from profile
    const loadCategoryVisibility = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // profiles.id is the Discord snowflake, not the Supabase Auth UUID.
          const discordId = (user.user_metadata as any)?.provider_id || user.id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("games_visible, records_visible, dev_visible")
            .eq("id", discordId)
            .single();

          if (profile) {
            setCategoryVisibility({
              games: profile.games_visible ?? true,
              records: profile.records_visible ?? true,
              dev: profile.dev_visible ?? true,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load category visibility:", error);
      }
    };
    
    loadCategoryVisibility();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadCategoryVisibility();
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  const [stats, setStats] = useState({
    online_users: 0,
    total_members: 0,
    messages_today: 0
  });

  // Pobierz dane od razu, potem co 60 sekund
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setStats({
          online_users: data.online_users || 0,
          total_members: data.member_count || data.online_users || 0,
          messages_today: data.messages_today || 0,
        });
      } catch (error) {
        console.error('[Sidebar] Fetch stats failed:', error);
      }
    };

    fetchStats(); // Immediate fetch
    const interval = setInterval(fetchStats, 60000); // Then polling every 60s

    return () => clearInterval(interval);
  }, []);

  const isPathActive = useCallback((href: string) =>
      pathname === href || pathname.startsWith(`${href}/`), [pathname]);

  const getAriaCurrent = useCallback((href: string) => {
    return isPathActive(href) ? "page" : undefined;
  }, [isPathActive, pathname]);

  // Definicja sekcji z fallback dla wszystkich tłumaczeń
  const defaultSections = [
    { id: "home", type: "single", href: "/", label: t.nav.home || "Strona główna", icon: Home, ariaCurrent: getAriaCurrent("/") },
    { id: "profile", type: "single", href: "/profile", label: t.nav.profile || "Profil", icon: User, ariaCurrent: getAriaCurrent("/profile") },
    ...(categoryVisibility.games ? [{
      id: "games", type: "expandable", href: "/games", label: t.nav.games || "Games", icon: Gamepad, items: [
        { href: "/games/shop", label: t.nav.Shop || "Shop", icon: Gamepad },
        { href: "/games/about", label: "About", icon: BookOpen },
      ]}
    ] : []),
    ...(categoryVisibility.records ? [{
      id: "records", type: "expandable", href: "/records", label: t.nav.records || "Records", icon: Music2, items: [
        { href: "/records/podcasts", label: "Podcasty", icon: Book },
        { href: "/records/beats", label: "Beaty", icon: Mic2 },
      ]}
    ] : []),
    ...(categoryVisibility.dev ? [{
      id: "dev", type: "expandable", href: "/dev", label: t.nav.dev || "Dev", icon: Code, items: [
        { href: "/dev/about", label: "About Us", icon: Users },
        { href: "/dev/recruitment", label: "Recruitment", icon: Briefcase },
      ]}
    ] : []),
    { id: "notifications", type: "single", href: "/notifications", label: t.nav.notifications || "Powiadomienia", icon: Bell, ariaCurrent: getAriaCurrent("/ankiety/rating") },
  ];

  const sections = useMemo(() => defaultSections, [t, categoryVisibility, pathname]);

  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset hover state on pathname change
  useEffect(() => {
    setHoveredSectionId(null);
  }, [pathname]);

  const handleMouseEnter = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSectionId(id);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSectionId(null);
    }, 100);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Nie resetujemy isOpen przy zmianie pathname - to powoduje, że sidebar zamyka się przy każdej zmianie URL
  // Client-side navigation w Next.js nie powinien resetować stanu sidebara

  const SidebarContent = (
      <div className="flex flex-col h-full py-4 border border-[var(--border-color)]">
        {/* Logo Section */}
        <div className="px-6 mb-8 flex items-center justify-center relative">
          <Link href="/" className="block relative group w-full">
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 w-full h-[100px] flex items-center justify-center"
            >
              {mounted && (
                  <Image
                      src={logo}
                      alt="Two Steps Studio Logo"
                      width={240}
                      height={140}
                      className="transition-opacity duration-500 object-contain w-auto h-full max-h-[90px]"
                      unoptimized
                  />
              )}
            </motion.div>
            <div className="absolute inset-0 bg-[var(--color-general)] opacity-0 group-hover:opacity-10 blur-3xl transition-opacity rounded-full" />
          </Link>
          <button
              onClick={close}
              className="lg:hidden absolute right-4 p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-[var(--text)]" />
          </button>
        </div>

        {/* Stats Section */}
        <SidebarStats translations={t} stats={stats} />

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar pb-6" suppressHydrationWarning>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 px-4 opacity-30 text-[var(--text)]">{t.nav.mainMenu}</h2>
          <ul className="space-y-1">
            {sections.map((section) => {
              if (section.type === "single") {
                const isActive = isPathActive(section.href);
                return (
                    <li key={section.id}>
                      <Link
                          href={section.href}
                          aria-current={section.ariaCurrent}
                          className={cn(
                              "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all relative group overflow-hidden",
                              isActive
                                  ? "text-white"
                                  : "text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                      >
                        {mounted && isActive && (
                            <motion.div
                                layoutId={`active-bg-${section.id}`}
                                className="absolute inset-0 bg-gradient-to-r from-[var(--color-general)] to-[var(--color-records)] shadow-[0_0_20px_rgba(var(--color-general-rgb),0.3)] opacity-90"
                                initial={false}
                                transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                            />
                        )}

                        <div className="relative z-10 flex items-center gap-2 w-full">
                          <section.icon className="w-4 h-4 transition-all duration-300 group-hover:scale-110" strokeWidth={2.5} />
                          <span className={cn(
                              "text-sm tracking-tight transition-all duration-300",
                              isActive ? "font-black" : "font-bold opacity-60 group-hover:opacity-100"
                          )}>{section.label}</span>
                          {isActive && mounted && (
                              <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="ml-auto"
                              >
                                <ChevronRight size={14} className="opacity-50" />
                              </motion.div>
                          )}
                        </div>
                      </Link>
                    </li>
                );
              }

              const isExpandable = section.type === "expandable";
              const isSectionActive = isExpandable && section.items?.some((i) => isPathActive(i.href));
              const isExpanded = hoveredSectionId === section.id;

              return (
                  <li
                      key={section.id}
                      onMouseEnter={() => handleMouseEnter(section.id)}
                      onMouseLeave={handleMouseLeave}
                  >
                    <Link
                        href={section.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all relative group overflow-hidden w-full text-left",
                            isSectionActive
                                ? "text-white"
                                : "text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                        )}
                    >
                      {mounted && isSectionActive && (
                          <motion.div
                              layoutId={`active-bg-${section.id}`}
                              className="absolute inset-0 bg-gradient-to-r from-[var(--color-general)] to-[var(--color-records)] shadow-[0_0_20px_rgba(var(--color-general-rgb),0.3)] opacity-90"
                              initial={false}
                              transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                          />
                      )}

                      <div className="relative z-10 flex items-center gap-2 w-full">
                        <section.icon className="w-4 h-4 transition-all duration-300 group-hover:scale-110" strokeWidth={2.5} />
                        <span className={cn(
                            "text-sm tracking-tight transition-all duration-300",
                            isSectionActive ? "font-black" : "font-bold opacity-60 group-hover:opacity-100"
                        )}>{section.label}</span>

                        <div className={cn("ml-auto relative z-10 transition-transform duration-200", isExpanded && "rotate-90")}>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </Link>

                    <AnimatePresence>
                      {isExpanded && (
                          <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18 }}
                              className="mt-1 pl-0"
                          >
                            <ul className="space-y-1">
                              {isExpandable && section.items?.map((item) => {
                                const isActive = isPathActive(item.href);
                                return (
                                    <li key={item.href}>
                                      <Link
                                          href={item.href}
                                          className={cn(
                                              "flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all relative group overflow-hidden",
                                              isActive ? "text-white" : "text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                                          )}
                                      >
                                        {mounted && isActive && (
                                            <motion.div
                                                layoutId={`active-bg-${item.href}`}
                                                className="absolute inset-0 bg-black/10 dark:bg-white/10"
                                                initial={false}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}

                                        <div className="relative z-10 flex items-center gap-3 w-full pl-3">
                                          <item.icon className="w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110" strokeWidth={2.5} />
                                          <span className="text-sm font-bold tracking-tight truncate">{item.label}</span>
                                        </div>
                                      </Link>
                                    </li>
                                );
                              })}
                            </ul>
                          </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 pt-4 border-t border-[var(--border-color)] space-y-2">
          {mounted && (
              <button
                  onClick={() => {
                    const current = resolvedTheme === "dark" ? "light" : "dark";
                    setTheme(current);
                  }}
                  className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden border border-(--border-color)",
                      "text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                  )}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                  <AnimatePresence mode="wait">
                    <motion.div
                        key={resolvedTheme}
                        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                      {resolvedTheme === "light" ? <Sun size={18} /> : <Moon size={18} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span className="text-sm font-bold tracking-tight relative z-10">
                {resolvedTheme === "light" ? (t.nav.lightMode || "Tryb Jasny") : (t.nav.darkMode || "Tryb Ciemny")}
              </span>
              </button>
          )}

          <Link
              href="/settings"
              className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden border border-(--border-color)",
                  pathname === "/settings"
                      ? "text-white bg-(--color-general) shadow-lg shadow-(--color-general)/20 font-black"
                      : "text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
              )}
          >
            <div
                className={cn(
                    "w-[18px] h-[18px] flex items-center justify-center relative z-10",
                    pathname === "/settings" ? "opacity-100" : "opacity-70"
                )}
            >
              <Settings size={18} className="text-current group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <span className="text-sm font-bold tracking-tight relative z-10">{t.nav.settings}</span>
          </Link>
        </div>
      </div>
  );

  if (!sidebarOpen) return null;
  return SidebarContent;
}