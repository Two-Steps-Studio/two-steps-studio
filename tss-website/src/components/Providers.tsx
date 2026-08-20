"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "./ui/sonner";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { ColorThemeProvider } from "@/hooks/use-color-theme";
import { TranslationProvider } from "@/hooks/use-translation";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorThemeProvider>
        <AuthProvider>
          <TranslationProvider>
            <SidebarProvider>
              {children}
              <Toaster />
            </SidebarProvider>
          </TranslationProvider>
        </AuthProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  );
}
