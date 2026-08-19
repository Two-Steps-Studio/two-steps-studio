"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Download as LucideDownload } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useRef, useState, useEffect } from "react";
import { InstallPWA } from "./install-pwa";

interface HomeHeroProps {
  language: string;
  content: any;
}

export function HomeHero({ language, content }: HomeHeroProps) {
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
      <section ref={containerRef} className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden rounded-[3rem] px-6 py-20 bg-black text-white">
        <div className="absolute inset-0 z-0">
          <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-general)] blur-[120px] rounded-full"
          />
          <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-records)] blur-[120px] rounded-full"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <motion.div style={{ y, opacity }} className="relative z-10 max-w-5xl mx-auto text-center">
          {content.hero.badge && (
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-xs font-black uppercase tracking-widest mb-10 text-[var(--color-general)]"
              >
                <Sparkles size={14} />
                {content.hero.badge}
              </motion.div>
          )}

          <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative w-full max-w-4xl mx-auto mb-14 flex flex-col items-center"
          >
            <div className="relative">
              <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter flex flex-col leading-[0.8]">
                <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                  TWO STEPS
                </span>
                  <span className="
                    bg-[linear-gradient(90deg,#AD83F8_0%,#DC3545_33%,#FFCB2F_66%,#1BBDBD_100%)]
                    bg-[length:200%_100%]
                    bg-clip-text
                    text-transparent
                    animate-gradient
                    drop-shadow-[0_0_40px_rgba(173,131,248,0.35)]"
                  > STUDIO </span>
              </h1>
            </div>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto mt-12 leading-tight font-medium"
            >
              {content.hero.desc}
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-8 mt-8"
            >
              <div className="flex flex-wrap justify-center items-center gap-6">
                {mounted && (
                    <Button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = "/TwoStepsLauncher.exe";
                          link.download = "TwoStepsLauncher.exe";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        size="lg"
                        className="h-14 px-6 sm:h-20 sm:px-16 rounded-[2rem] bg-white text-black hover:bg-[var(--color-general)] hover:text-white font-black text-base sm:text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative overflow-hidden group/btn cursor-pointer max-w-full"
                    >
                  <span className="relative z-10 flex items-center gap-2 sm:gap-4">
                    <LucideDownload size={20} className="shrink-0 animate-bounce sm:size-7" />
                    {content.hero.ctaPrimary}
                  </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                    </Button>
                )}

                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-16 px-12 rounded-2xl border-2 border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-black text-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 group/btn2 cursor-pointer">
                    <span className="relative z-10">{content.hero.ctaSecondary}</span>
                    <div className="absolute inset-0 bg-[var(--color-general)] opacity-0 group-hover/btn2:opacity-5 blur-xl transition-opacity" />
                  </Button>
                </Link>
              </div>
              <InstallPWA />
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            "/assets/Icons/sports_esports_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
            "/assets/Icons/gamepad_left_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
            "/assets/Icons/music_note_2_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg",
            "/assets/Icons/build_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
          ].map((iconPath, i) => (
              <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.2, 0], y: [-20, 20, -20], x: [-10, 10, -10] }}
                  transition={{ duration: 10 + i * 2, repeat: Infinity, delay: i * 2 }}
                  className="absolute bg-white/20"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: i % 2 === 0 ? `${10 + i * 5}%` : `${75 + i * 2}%`,
                    width: `${40 + i * 10}px`,
                    height: `${40 + i * 10}px`,
                    maskImage: `url(${iconPath})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskImage: `url(${iconPath})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                  }}
              />
          ))}
        </div>
      </section>
  );
}