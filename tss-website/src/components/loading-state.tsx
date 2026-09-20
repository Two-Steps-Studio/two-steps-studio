"use client";

import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  children?: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
  message?: string;
}

export function LoadingState({
  children,
  className,
  fullScreen = false,
  message = "Ładowanie..."
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 transition-all duration-300",
        fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "py-12",
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Spinner className="size-8 text-[var(--color-general)]" />
        <div className="absolute inset-0 animate-ping opacity-20">
          <Spinner className="size-8 text-[var(--color-general)]" />
        </div>
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground animate-pulse"
        >
          {message}
        </motion.p>
      )}

      {children && (
        <div className="w-full max-w-md">
          {children}
        </div>
      )}
    </div>
  );
}
