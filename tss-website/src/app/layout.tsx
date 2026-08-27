
import type { Metadata } from "next";
import { validateEnv } from "@/lib/env-validation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import ErrorReporter from "@/components/ErrorReporter";
import { Providers } from "@/components/Providers";
import AdminConsole from "@/components/AdminConsole";
import { TopBar } from "@/components/TopBar";
import { MobileHeader } from "@/components/MobileHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import PWAController from "@/components/PWAController";
import { PageTransition } from "@/components/PageTransition";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import { PresencePing } from "@/components/presence-ping";
import { Footer } from "@/components/Footer";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarLayout } from "@/components/SidebarLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FirstRunExperience from "@/components/Electron/FirstRunExperience";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Metropolis (Chris M. Simpson) - self-hosted from the @typehaus/metropolis
// webfont revival. Replaces the previous Space Grotesk / Outfit pairing as
// the single main font for both headings and body text - see
// src/fonts/metropolis/LICENSE.txt.
const metropolis = localFont({
  src: [
    { path: "../fonts/metropolis/Metropolis-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-400-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/metropolis/Metropolis-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-500-Italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/metropolis/Metropolis-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-600-Italic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/metropolis/Metropolis-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-700-Italic.woff2", weight: "700", style: "italic" },
    { path: "../fonts/metropolis/Metropolis-800.woff2", weight: "800", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-800-Italic.woff2", weight: "800", style: "italic" },
    { path: "../fonts/metropolis/Metropolis-900.woff2", weight: "900", style: "normal" },
    { path: "../fonts/metropolis/Metropolis-900-Italic.woff2", weight: "900", style: "italic" },
  ],
  variable: "--font-metropolis",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Two Steps Studio",
  description: "Welcome to Two Steps Studio",
  manifest: "/manifest.json",
  metadataBase: new URL('https://twostepsstudio.gg'),
  // Without this, iOS Safari's data detectors auto-linkify anything that
  // looks like an email/phone/address in the page text - underlined,
  // blue, tap-to-compose - which is what made the email badge on /profile
  // look like a broken/unstyled link specifically on mobile Safari.
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Two Steps Studio',
    description: 'Welcome to Two Steps Studio',
    url: 'https://twostepsstudio.gg',
    siteName: 'Two Steps Studio',
    locale: 'en_US',
    type: 'website',
  },
};

export function generateJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Two Steps Studio',
    url: 'https://twostepsstudio.gg',
    logo: 'https://twostepsstudio.gg/logo.png',
    description: 'Welcome to Two Steps Studio',
    sameAs: [
      'https://discord.gg/twostepsstudio',
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('[BUILD] RootLayout rendering at', new Date().toISOString());
  return (
    <html lang="pl" suppressHydrationWarning className={metropolis.variable}>
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased overflow-x-hidden" suppressHydrationWarning>
        <NoiseOverlay />
        <FirstRunExperience />
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-[var(--color-general)]/5 blur-[160px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-[var(--color-records)]/5 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: "3s" }} />
        </div>
        <ErrorReporter />
        <Providers>
          <SidebarProvider>
            <SidebarLayout />
          </SidebarProvider>
          <PresencePing />
          <MobileHeader />
          <PWAController />
          <div className="flex-1 lg:ml-[240px] lg:border-l lg:border-zinc-700/30 flex flex-col pt-[60px] transition-[margin] duration-300">
            <TopBar suppressHydrationWarning={true} className="hidden lg:flex" />
            <main className="p-4 md:p-6 lg:p-8 pt-8 md:pt-12 pb-20 lg:pb-0 max-w-[1400px] mx-auto w-full flex-1 flex flex-col">
              <ErrorBoundary>
                <PageTransition>
                  {children}
                </PageTransition>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
          <BottomNavigation />
          <AdminConsole />
        </Providers>
        <ServiceWorkerRegister />
        <InstallPrompt />
        <VisualEditsMessenger />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
