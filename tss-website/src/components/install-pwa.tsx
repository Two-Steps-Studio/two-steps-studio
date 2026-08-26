"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Laptop, Gamepad2 } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../hooks/use-translation";
import { motion, AnimatePresence } from "framer-motion";

export function InstallPWA() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(true);
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleInstall = () => {
      // /download is the single source of truth for the current build: it reads
      // the published release manifest, so there is no installer path to keep
      // in sync here. (This used to point at /TwoStepsLauncher.exe, which was
      // never shipped, so the button silently downloaded a 404 page.)
      router.push("/download");
    };

    return (
      <AnimatePresence>
        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex -space-x-2 px-2">
              {mounted && [Laptop, Monitor, Gamepad2].filter(Boolean).map((Icon: any, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-[var(--color-general)]">
                  <Icon size={14} />
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 pr-2">
              {t.home.availableOn}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <Button
              onClick={handleInstall}
              size="lg"
              variant="outline"
              className="h-16 px-12 rounded-2xl border-2 border-[var(--color-general)]/30 hover:border-[var(--color-general)] bg-white/5 hover:bg-[var(--color-general)]/10 text-white transition-all flex items-center gap-3 group/btn shadow-2xl backdrop-blur-md font-black text-xl shadow-[var(--color-general)]/10"
            >
              <Gamepad2 className="group-hover/btn:rotate-12 transition-transform text-[var(--color-general)]" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-xs opacity-50 mb-1 font-bold uppercase tracking-wider">{t.home.ourApp}</span>
                <span>{t.home.installApp}</span>
              </div>
            </Button>
            
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all group-hover:-bottom-14 pointer-events-none shadow-xl">
              {t.home.installAppDesc}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
}
