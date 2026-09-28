"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Respects the OS-level "reduce motion" setting - previously this
  // transition ran unconditionally for every visitor, motion-sensitive or
  // not, with no way to opt out.
  const shouldReduceMotion = useReducedMotion();

  return (
    // mode="wait" (the previous value) makes an exit finish before the next
    // enter starts, so navigating twice quickly had to sit through the
    // first page's full exit animation before the second page could even
    // begin appearing. Default ("sync") lets them overlap instead.
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02, y: -10 }}
        // Spring instead of a fixed-duration eased tween - a spring
        // continues from wherever it currently is if a new navigation
        // interrupts it mid-flight, instead of jumping.
        transition={
          shouldReduceMotion
            ? { duration: 0.15, ease: "linear" }
            : { type: "spring", bounce: 0, duration: 0.4 }
        }
        className="w-full origin-top"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
