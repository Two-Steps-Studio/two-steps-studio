"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";

export default function ServiceSuccessPage() {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="container mx-auto p-6 mt-20 max-w-xl text-center pb-20">
      {/* One-time post-checkout confirmation - the app's actual "delight
          budget" (rare, high-emotion moment), previously spent nowhere. */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0.2 } : { type: "spring", bounce: 0.25, duration: 0.5 }}
      >
        <CheckCircle2 className="mx-auto mb-6 text-[var(--color-general)]" size={64} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <h1 className="text-4xl font-black tracking-tight text-[var(--text)] font-[family-name:var(--font-space)] mb-4">
          {t.servicesPage.successTitle}
        </h1>
        <p className="text-lg text-[var(--text-muted)] mb-8">{t.servicesPage.successMessage}</p>
        <Button asChild className="rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold px-6">
          <Link href="/dev/services">{t.servicesPage.backToServices}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
