import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex items-center justify-center"
      >
        {/* Outer Ring */}
        <div className="w-24 h-24 rounded-full border-t-2 border-l-2 border-transparent border-t-[var(--color-general)] border-l-[var(--color-general)] animate-spin" />

        {/* Middle Ring - Counter rotation */}
        <div className="absolute w-20 h-20 rounded-full border-b-2 border-r-2 border-transparent border-b-[var(--color-general)] border-r-[var(--color-general)] animate-[spin_1.5s_linear_infinite_reverse]" />

        {/* Inner Ring - Fast rotation */}
        <div className="absolute w-16 h-16 rounded-full border-t-2 border-r-2 border-transparent border-t-[var(--color-general)] border-r-[var(--color-general)] animate-[spin_0.8s_linear_infinite]" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="text-[var(--color-general)]" size={32} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
