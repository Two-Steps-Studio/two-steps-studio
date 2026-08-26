"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/use-translation";

// Push Notification setup
export function usePWA() {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [permissions, setPermissions] = useState<NotificationPermission>("pending");

  useEffect(() => {
    // Check if Push API is supported
    if ('Notification' in window && 'PushManager' in window) {
      setIsSupported(true);
      const askPermission = async () => {
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        const currentPermission = Notification.permission;
        setPermissions(currentPermission as NotificationPermission);

        if (currentPermission !== 'granted') {
          try {
            const permission = await Notification.requestPermission();
            setPermissions(permission);
          } catch (error) {
            console.error('Error requesting notification permission:', error);
          }
        }
      };
      askPermission();
    } else {
      setIsSupported(false);
    }

    // Check if installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator?.standalone) {
      setIsInstalled(true);
    }
  }, []);

  const sendNotification = async (title: string, body: string, data?: any) => {
    if (!isSupported || permissions !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/assets/Logo/Glowne/Two Steps Studio Bez Tła.png',
      badge: '/assets/Logo/Glowne/Two Steps Studio Bez Tła.png',
      data,
      tag: Date.now().toString(),
      requireInteraction: false,
      silent: true,
    });

    // Clean up after 30 seconds
    setTimeout(() => notification.close(), 30000);
  };

  return {
    isSupported,
    isInstalled,
    permissions,
    sendNotification,
  };
}

// Install Prompt
export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const [promptReady, setPromptReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if browser supports install prompt
    if (typeof window !== 'undefined' && window?.webkit?.installPrompt) {
      const prompt = window.webkit.installPrompt;
      setDeferredPrompt(prompt);
      setPromptReady(true);

      // Handle install event
      window.addEventListener('appinstalled', () => {
        console.log('PWA installed!');
        // Optionally show success toast
      });
    }

    return () => {
      if (deferredPrompt) {
        deferredPrompt?.removeEventListener('cancel', handleCancel);
        deferredPrompt?.removeEventListener('confirm', handleConfirm);
      }
    };
  }, []);

  const handleCancel = () => {
    console.log('User cancelled install prompt');
    // Show user we noticed they cancelled
  };

  const handleConfirm = () => {
    console.log('User confirmed install');
    // Show success toast
  };

  if (!promptReady || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-auto">
      <div className="glass rounded-2xl p-4 flex items-center gap-4 shadow-2xl animate-slide-up max-w-[calc(100%-4rem)]">
        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[var(--color-general)] shrink-0">
          <img
            src="/assets/Logo/Glowne/Two Steps Studio Bez Tła.png"
            alt="TSS"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-[var(--text)]">
            {t.compPWAController.installPrompt}
          </h3>
          <p className="text-xs opacity-60">
            {t.compPWAController.installDesc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="rounded-xl text-sm h-auto py-0"
          >
            {t.compPWAController.notNow}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deferredPrompt.prompt()}
            className="rounded-xl text-sm h-auto py-0"
          >
            {t.compPWAController.install}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main PWA Controller component
function PWAController() {
  const { isSupported, isInstalled, permissions, sendNotification } = usePWA();

  if (!isSupported) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {isInstalled ? (
        // Already installed - no UI needed
        <div className="opacity-0" />
      ) : (
        // Not installed - show prompt
        <PWAInstallPrompt />
      )}
    </div>
  );
}

export default PWAController;
