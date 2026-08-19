"use client";

import { useSidebar } from "@/hooks/use-sidebar";
import { Sidebar } from "./Sidebar";
import { useState, useEffect } from "react";

export function SidebarLayout() {
  const { isOpen } = useSidebar();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const sidebarOpen = isDesktop || isOpen;

  return (
    // Sidebar renders null when closed, but this wrapper stayed put: a
    // 240px-wide, full-height, z-50 box sitting above the mobile header
    // (z-40), swallowing taps on the header's logo and hamburger. Disable
    // hit-testing while it has nothing to show.
    <div
      className={`fixed inset-y-0 left-0 z-50 w-[240px] lg:w-[240px] ${
        sidebarOpen ? "" : "pointer-events-none"
      }`}
    >
      <Sidebar isOpen={sidebarOpen} suppressHydrationWarning={true} />
    </div>
  );
}
