"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users
} from "lucide-react";

// Project/task/roadmap/files/description/technology management moved to
// Guidon (a separate app in this monorepo) — those pages and their DEV/
// components were removed rather than left as broken links.
const navItems = [
  { href: "/dev", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dev/recruitment", label: "Recruitment", icon: Users },
];

export function DevNavigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border-color)] bg-[var(--bg)]/0 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-1 px-4 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dev" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-[var(--color-dev)]/10 text-[var(--color-dev)] border-[var(--border-color)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
