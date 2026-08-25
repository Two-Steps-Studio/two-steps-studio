
import type { Metadata } from "next";
import { validateEnv } from "@/lib/env-validation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Two Steps Studio",
  description: "Witaj w Two Steps Studio",
  manifest: "/manifest.json",
  metadataBase: new URL('https://twostepsstudio.vercel.app'),
  openGraph: {
    title: 'Two Steps Studio',
    description: 'Witaj w Two Steps Studio',
    url: 'https://twostepsstudio.vercel.app',
    siteName: 'Two Steps Studio',
    locale: 'pl_PL',
    type: 'website',
  },
};

export function generateJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Two Steps Studio',
    url: 'https://twostepsstudio.vercel.app',
    logo: 'https://twostepsstudio.vercel.app/logo.png',
    description: 'Witaj w Two Steps Studio',
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
    <html lang="pl" suppressHydrationWarning className={`${spaceGrotesk.variable} ${outfit.variable}`}>
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
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="aa14c20f-df41-43d4-909e-60a5384ae872"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/route-messenger.js"
          strategy={process.env.NODE_ENV === "production" ? "afterInteractive" : "workerDoc"}
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug={process.env.NODE_ENV !== "production"}
          data-custom-data={process.env.NODE_ENV !== "production" ? `{"appName": "TwoStepsStudio", "version": "1.0.0"}` : ""}
        />
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
      </body>
    </html>
  );
}
