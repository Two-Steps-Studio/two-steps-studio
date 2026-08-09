"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

// Mapa ścieżek do etykiet i ikon w Bottom Navigation
export const BOTTOM_NAV_ITEMS = {
  home: { label: "Home", href: "/" },
  profile: { label: "Profil", href: "/profile" },
  games: { label: "Gry", href: "/games" },
  esport: { label: "E-sport", href: "/e-sport" },
  records: { label: "Rekordy", href: "/records" },
  dev: { label: "Dev", href: "/dev" },
  notifications: { label: "Powiadomienia", href: "/notifications" },
};

export function useBottomNav() {
  const pathname = usePathname();

  const activeItem = useMemo(() => {
    return Object.values(BOTTOM_NAV_ITEMS).find(item =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
  }, [pathname]);

  const isScrollable = useMemo(() => {
    // Wyświetlaj bottom nav tylko na małych ekranach
    return typeof window !== "undefined" && window.innerWidth < 1024;
  }, []);

  return {
    activeItem,
    isScrollable,
    items: BOTTOM_NAV_ITEMS,
  };
}
