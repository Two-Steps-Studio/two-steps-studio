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
      // Bez max-w-md i z węższymi marginesami (left-2/right-2 zamiast
      // left-4/right-4) pasek dostaje więcej realnej szerokości na telefonie
      // - przy 6 pozycjach i długich etykietach (np. niem. "Benachrichtigungen")
      // to wciąż za mało samo w sobie, więc etykieta łamie się do 2 linii
      // (usunięty `truncate`) zamiast obcinać się wielokropkiem w środku słowa.
      <nav className="fixed left-2 right-2 z-50" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-lg">
          <ul className="flex items-start justify-around gap-0.5 py-2 px-1.5 rounded-3xl glass border border-[var(--border-color)] shadow-lg shadow-black/10">
            {Object.entries(BOTTOM_NAV_ITEMS).map(([key, item]) => {
              const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                  <li key={key} className="min-w-0 flex-1">
                    <Link
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-2xl transition-all",
                            isActive ? "opacity-100 bg-[var(--color-general)]/10" : "opacity-60 hover:opacity-90"
                        )}
                    >
                      {getIcon(item.href)}
                      <span className="w-full px-0.5 text-center text-[8px] font-bold leading-[1.15] text-[var(--text)] break-words">
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