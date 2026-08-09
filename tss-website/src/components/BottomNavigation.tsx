"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Gamepad2,
  Zap,
  MessageSquare,
  Music2,
} from "lucide-react";
import { cn } from "../lib/utils";

const BOTTOM_NAV_ITEMS = {
  home: { label: "Strona główna", href: "/" },
  profile: { label: "Profil", href: "/profile" },
  games: { label: "Games", href: "/games" },
  esport: { label: "E-sport", href: "/e-sport" },
  records: { label: "Records", href: "/records" },
  dev: { label: "Dev", href: "/dev" },
  notifications: { label: "Powiadomienia", href: "/notifications" },
};

export function BottomNavigation() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const mediaQuery = "(max-width: 1023px)";

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
          : "rgba(255,255,255,0.15)",
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
      case "/dev":           return <Zap {...props} />;
      case "/notifications": return <MessageSquare {...props} />;
      default:               return null;
    }
  };

  return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border-color)]">
        <div className="mx-auto max-w-[1400px] px-4">
          <ul className="flex items-center justify-around h-16">
            {Object.entries(BOTTOM_NAV_ITEMS).map(([key, item]) => {
              const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                  <li key={key} className="flex-1">
                    <Link
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 py-3 transition-all",
                            isActive ? "opacity-100" : "opacity-60 hover:opacity-90"
                        )}
                    >
                      {getIcon(item.href)}
                      <span className="text-[8px] font-bold text-[var(--text)] text-center leading-none">
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