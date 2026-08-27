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

  // Dedicated, shorter labels just for this bar - t.nav.* is written for
  // full page titles/headers ("Notifications" / "Benachrichtigungen") and
  // never fits 6-across on a phone no matter how the bar is sized; a
  // first-time visitor still needs *some* label under every icon, so this
  // shortens the text at the source instead of hiding/truncating it.
  const BOTTOM_NAV_ITEMS = {
    home: { label: t.bottomNav.home, href: "/" },
    profile: { label: t.bottomNav.profile, href: "/profile" },
    games: { label: t.bottomNav.games, href: "/games" },
    records: { label: t.bottomNav.records, href: "/records" },
    dev: { label: t.bottomNav.dev, href: "/dev" },
    notifications: { label: t.bottomNav.notifications, href: "/notifications" },
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
      // A first-time visitor can't tell what an icon-only nav means, so every
      // item keeps a visible label - t.bottomNav.* (short, dedicated strings,
      // not the full page-title translations) fixes the actual overflow
      // instead of hiding text: with real words this short, `truncate` is
      // just a safety net that shouldn't normally trigger.
      <nav className="fixed left-1 right-1 z-50" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-lg">
          <ul className="flex items-center justify-around gap-0 h-16 px-0.5 rounded-full glass border border-[var(--border-color)] shadow-lg shadow-black/10">
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
                      <span className="w-full truncate px-0 text-center text-[9px] font-bold leading-none text-[var(--text)]">
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