"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/use-translation";

// Chromium's install event - not in TypeScript's DOM lib.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tss-pwa-install-dismissed";
const noopSubscribe = () => () => {};

function isStandalone() {
  // navigator.standalone is iOS Safari's own flag for home-screen apps.
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Notification support/permission. Permission is only requested through
// requestPermission(), meant to be called from a user action: this used to
// call Notification.requestPermission() on every page load for every
// visitor - an unprompted browser dialog (Chrome quiets or penalizes sites
// doing that), and nothing in the app actually sends notifications yet.
export function usePWA() {
  const [, rerender] = useState(0);
  const isSupported = useSyncExternalStore(noopSubscribe, () => "Notification" in window && "PushManager" in window, () => false);
  const isInstalled = useSyncExternalStore(noopSubscribe, isStandalone, () => false);
  // Re-read on every render; rerender() after a permission change picks it up.
  const permission = useSyncExternalStore(
    noopSubscribe,
    (): NotificationPermission => ("Notification" in window ? Notification.permission : "denied"),
    (): NotificationPermission => "default"
  );

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) return "denied";
    const result = await Notification.requestPermission();
    rerender((n) => n + 1);
    return result;
  };

  const sendNotification = (title: string, body: string, data?: unknown) => {
    if (!isSupported || permission !== "granted") return;
    const notification = new Notification(title, {
      body,
      icon: "/assets/Logo/Glowne/Two Steps Studio Bez Tła.png",
      badge: "/assets/Logo/Glowne/Two Steps Studio Bez Tła.png",
      data,
      tag: Date.now().toString(),
      requireInteraction: false,
      silent: true,
    });
    setTimeout(() => notification.close(), 30000);
  };

  return { isSupported, isInstalled, permission, requestPermission, sendNotification };
}

// "Install the app" banner. Driven by the standard beforeinstallprompt
// event (Chromium: Chrome, Edge, Android) - it previously waited for a
// `window.webkit.installPrompt` API that no browser has, so it never showed.
// Other browsers don't fire the event and simply never see the banner.
export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Our banner replaces Chrome's own mini-infobar; the browser's install
      // button in the address bar stays available either way.
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setPromptEvent(null);
  };

  const install = async () => {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "dismissed") dismiss();
    else setPromptEvent(null);
  };

  return (
    <div role="dialog" aria-label={t.compPWAController.installPrompt} className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 lg:bottom-6">
      <div className="glass flex items-center gap-4 rounded-2xl p-4 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4">
        <div className="size-12 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--color-general)]">
          <img src="/assets/Logo/Glowne/Two Steps Studio Bez Tła.png" alt="" className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-[var(--text)]">{t.compPWAController.installPrompt}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t.compPWAController.installDesc}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="ghost" size="sm" onClick={dismiss} className="rounded-xl">
            {t.compPWAController.notNow}
          </Button>
          <Button variant="outline" size="sm" onClick={install} className="rounded-xl">
            {t.compPWAController.install}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mounted once in the root layout. The banner used to sit inside a
// `fixed inset-0 pointer-events-none z-0` wrapper, which would have made its
// buttons unclickable and put it under the page content.
function PWAController() {
  return <PWAInstallPrompt />;
}

export default PWAController;
