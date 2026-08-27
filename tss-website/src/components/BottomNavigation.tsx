"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Gamepad2,
  MessageSquare,
  Music2,
  Code,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "@/hooks/use-translation";

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  const mediaQuery = "(max-width: 1023px)";

  const BOTTOM_NAV_ITEMS = {
    home: { label: t.nav.home, href: "/" },
    profile: { label: t.nav.profile, href: "/profile" },
    games: { label: t.nav.games, href: "/games" },
    records: { label: "Records", href: "/records" },
    dev: { label: t.nav.dev, href: "/dev" },
    notifications: { label: t.nav.notifications, href: "/notifications" },
  };

  useEffect(() => {
    const checkMobile = () =>
        setIsMobile(window.matchMedia(mediaQuery).matches);
    checkMobile();
    const mobileMedia = window.matchMedia(mediaQuery);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mobileMedia.addEventListener("change", handler);
    return () => mobileMedia.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    console.log("--color-general-current:", style.getPropertyValue("--color-general-current"));
    console.log("--color-general:", style.getPropertyValue("--color-general"));
    console.log("--color-general-rgb:", style.getPropertyValue("--color-general-rgb"));
  }, []);

  if (!isMobile) return null;

  const getIcon = (href: string) => {
    const isActive =
        pathname === href || pathname.startsWith(`${href}/`);

    const props = {
      size: 18,
      color: isActive
          ? "var(--color-general-current)"
          : "var(--text)",
      className: cn(
          "transition-all duration-300",
          isActive
              ? "scale-125 drop-shadow-[0_0_8px_rgba(var(--color-general-rgb),0.5)]"
              : "scale-100"
      ),
    };

    switch (href) {
      case "/":              return <Home {...props} />;
      case "/profile":       return <User {...props} />;
      case "/games":         return <Gamepad2 {...props} />;
      case "/records":       return <Music2 {...props} />;
      case "/dev":           return <Code {...props} />;
      case "/notifications": return <MessageSquare {...props} />;
      default:               return null;
    }
  };

  return (
      // Back to a full pill (rounded-full) with a single-line label - the
      // 2-line wrap attempt made the whole bar taller and looked broken
      // against the pill shape. Instead the bar itself is pushed much wider
      // (left-1/right-1 insets, no max-width cap) so there's enough room for
      // the label on one line without needing to wrap; `truncate` stays only
      // as a last-resort safety net for whichever language's word is longest.
      <nav className="fixed left-1 right-1 z-50" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto">
          <ul className="flex items-center justify-around gap-0.5 h-16 px-2 rounded-full glass border border-[var(--border-color)] shadow-lg shadow-black/10">
            {Object.entries(BOTTOM_NAV_ITEMS).map(([key, item]) => {
              const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                  <li key={key} className="min-w-0 flex-1">
                    <Link
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 py-2.5 rounded-full transition-all",
                            isActive ? "opacity-100 bg-[var(--color-general)]/10" : "opacity-60 hover:opacity-90"
                        )}
                    >
                      {getIcon(item.href)}
                      <span className="w-full truncate px-0.5 text-center text-[8px] font-bold leading-none text-[var(--text)]">
                        {item.label}
                      </span>
                    </Link>
                  </li>
              );
            })}
          </ul>
        </div>
      </nav>
  );
}