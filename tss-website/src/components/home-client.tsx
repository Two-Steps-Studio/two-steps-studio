"use client";

import dynamic from "next/dynamic";
import { useLanguage } from "../hooks/use-translation";
import { Star, ArrowRight, Rocket, Gamepad2, Mic2, Code2, Trophy, Library, FileVideo } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HomeHero } from "./home-hero";

export const metadata = {
  title: 'Two Steps Studio — Beatmapy, Gry i Społeczność',
  description: 'Strona internetowa Two Steps Studio — platforma z beatmapami, grami, podcastami . Dołącz do innych użytkowników i odkryj świat!',
  keywords: [ 'gry', 'discord', 'muzyka', 'podcasty'],
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://tss.net',
    siteName: 'Two Steps Studio',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Two Steps Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@two_stepstudio',
    creator: '@two_stepstudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};
const HomeSiteStats = dynamic(() => import("./home-site-stats").then(mod => mod.HomeSiteStats), {
  ssr: false,
  loading: () => <div className="h-40 rounded-[2.5rem] bg-white/5 animate-pulse" />
});
const OnlineChart = dynamic(() => import("./online-chart").then(mod => mod.OnlineChart), {
  ssr: false,
  loading: () => <div className="h-60 rounded-[2.5rem] bg-white/5 animate-pulse" />
});

const NewsFeed = dynamic(() => import("./news-feed").then(mod => mod.NewsFeed), {
  ssr: false,
  loading: () => <div className="h-96 rounded-[3rem] bg-white/5 animate-pulse" />
});

const DiscordStatsLive = dynamic(() => import("./discord-stats-live").then(mod => mod.DiscordStatsLive), {
  ssr: false,
  loading: () => <div className="h-40 rounded-[2.5rem] bg-white/5 animate-pulse" />
});

const NewsletterForm = dynamic(() => import("./newsletter-form").then(mod => mod.NewsletterForm), {
  ssr: false
});

const t = {
    pl: {
        hero: {
            badge: "",
            title: "TWO STEPS",
            titleAccent: "STUDIO",
            desc: "Kreatywny kolektyw przesuwający granice cyfrowego świata. Od epickich światów gier po nowoczesne rozwiązania programistyczne.",
            ctaPrimary: "POBIERZ NASZ APLIKACJĘ ",
            ctaSecondary: "DOŁĄCZ DO NAS",
        },
        marquee: ["Nowe projekty", "E-sport", "Games", "Records", "DEV", "Community",],
        sections: {
            games: { title: "Games", desc: "Interaktywne światy.", stats: "0 gier" },
            records: { title: "Records", desc: "Brzmienie pasji.", stats: "0 utwory" },
            dev: { title: "DEV", desc: "Kod przyszłości.", stats: "1 projektów" },
        }
    },
    en: {
        hero: {
            badge: "",
            title: "TWO STEPS",
            titleAccent: "STUDIO",
            desc: "A creative collective pushing the boundaries of the digital world. From epic game worlds to cutting-edge software solutions.",
            ctaPrimary: "DOWNLOAD OUR APP",
            ctaSecondary: "JOIN US",
        },
        marquee: ["New projects", "Games", "Records", "DEV", "Community"],
        sections: {
            games: { title: "Games", desc: "Interactive worlds.", stats: "0 games" },
            records: { title: "Records", desc: "Sound of passion.", stats: "0 tracks" },
            dev: { title: "DEV", desc: "Code of tomorrow.", stats: "1 projects" },
        }
    },
    de: {
        hero: {
            badge: "",
            title: "TWO STEPS",
            titleAccent: "STUDIO",
            desc: "Ein kreatives Kollektiv, das die Grenzen der digitalen Welt verschiebt. Von epischen Spielwelten bis zu modernen Softwarelösungen.",
            ctaPrimary: "APP HERUNTERLADEN",
            ctaSecondary: "MACH MIT",
        },
        marquee: ["Neue Projekte", "E-Sport", "Games", "Records", "DEV", "Community"],
        sections: {
            games: { title: "Games", desc: "Interaktive Welten.", stats: "0 Spiele" },
            records: { title: "Records", desc: "Klang der Leidenschaft.", stats: "0 Titel" },
            dev: { title: "DEV", desc: "Code der Zukunft.", stats: "1 Projekte" },
        }
    }
};

export function HomeClient() {
  const { language, t: translations } = useLanguage();
  const content = t[language as keyof typeof t] || t.pl;

  return (
    <div className="flex flex-col gap-16 md:gap-32 pb-20">
      <HomeHero language={language} content={content} />

      {/* Marquee Section */}
      <div className="relative py-4 overflow-hidden border-y border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm -mx-4 md:-mx-8">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap gap-12 items-center"
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center">
              {content.marquee.map((item) => (
                  <div key={item} className="flex items-center gap-4 pr-4">
                    <Star size={16} className="text-[var(--color-general)] fill-current" />
                      <span className="text-2xl font-black tracking-tight opacity-80">{item}</span>
                  </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bento Grid Sections */}
      <section className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[800px]">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.01, rotate: -0.2 }}
              viewport={{ once: true }}
              className="md:col-span-8 relative group cursor-pointer overflow-hidden rounded-[3rem] bg-[var(--color-games)] text-white p-10 md:p-16 flex flex-col justify-end transition-all duration-500 hover:shadow-[0_0_50px_rgba(220,53,69,0.3)]"
            >

            <div className="absolute top-10 right-10 w-40 h-40 bg-white/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div 
              className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700"
              style={{
                maskImage: 'url(/assets/Icons/sports_esports_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: 'url(/assets/Icons/sports_esports_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
              <div className="relative z-10">
                <span className="inline-block px-4 py-2 rounded-full bg-black/20 backdrop-blur-md text-xs font-black tracking-widest mb-6">{content.sections.games.stats}</span>
                  <h2 className="text-6xl md:text-8xl font-black tracking-tight mb-6 italic leading-none pr-4">{content.sections.games.title}</h2>
                <p className="text-xl md:text-2xl font-medium opacity-80 max-w-md">{content.sections.games.desc}</p>
              <Link href="/games" className="mt-10 inline-flex items-center gap-3 text-lg font-black group/link">
                {translations.homeExtra.exploreLink} <ArrowRight className="group-hover/link:translate-x-2 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, rotate: 0.5 }}
            viewport={{ once: true }}
            className="md:col-span-4 relative group cursor-pointer overflow-hidden rounded-[3rem] bg-[var(--color-records)] text-white p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_0_50px_rgba(173,131,248,0.3)] "
          >
            <div 
              className="absolute bottom-10 right-10 w-20 h-20 bg-white/10 group-hover:rotate-12 transition-transform duration-500 "
              style={{
                maskImage: 'url(/assets/Icons/music_note_2_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: 'url(/assets/Icons/music_note_2_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-black/20 text-[10px] font-black tracking-widest mb-4">{content.sections.records.stats}</span>
                  <h2 className="text-4xl font-black tracking-tight mb-4 italic pr-2">{content.sections.records.title}</h2>
                <p className="text-lg font-medium opacity-80">{content.sections.records.desc}</p>
              </div>
          </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, rotate: -0.5 }}
              viewport={{ once: true }}
              className="md:col-span-5 relative group cursor-pointer overflow-hidden rounded-[3rem] bg-[var(--color-dev)] text-white p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_0_50px_rgba(255,203,47,0.3)]"
            >

            <div 
              className="absolute top-10 right-10 w-24 h-24 bg-white/10 group-hover:scale-110 transition-transform duration-500"
              style={{
                maskImage: 'url(/assets/Icons/build_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: 'url(/assets/Icons/build_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
                <div>
                  <span className="inline-block px-4 py-1.5 rounded-full bg-black/20 text-[10px] font-black tracking-widest mb-4">{content.sections.dev.stats}</span>
                  <h2 className="text-4xl font-black tracking-tight mb-4 italic pr-2">{content.sections.dev.title}</h2>
                  <p className="text-lg font-medium opacity-80">{content.sections.dev.desc}</p>
                </div>
            </motion.div>
            
        </div>
      </section>

      {/* News Feed Section */}
      <section className="px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight uppercase italic leading-none mb-4 pr-4">
              {translations.home.newsTitle}
            </h2>
            <p className="text-xl font-medium opacity-60 max-w-xl">
              {translations.home.newsSubtitle}
            </p>
          </div>
          <Link href="/news" className="group flex items-center gap-3 text-lg font-black uppercase tracking-widest text-[var(--color-general)]">
            {translations.home.viewAll}
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-[var(--color-general)] group-hover:text-white transition-all">
              <ArrowRight size={20} />
            </div>
          </Link>
        </div>
        <NewsFeed />
      </section>

      {/* Community Stats Section */}
      <section className="px-4">
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic leading-none text-center mb-16 pr-4">
            {translations.home.communityTitle}
          </h2>
          <div className="grid grid-cols-1 gap-8">
            <HomeSiteStats />
            <DiscordStatsLive />
            <OnlineChart />
          </div>
        </div>
      </section>

      {/* Newsletter / CTA Section */}
      <section className="px-4">
        <div className="relative overflow-hidden rounded-[4rem] bg-black border border-white/5 p-12 md:p-32 flex flex-col items-center text-center border-[var(--border-color)]">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-[var(--color-general)]/20 blur-[150px] rounded-full" />
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10" />
          </div>
          
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="relative z-10 w-full"
            >
              <Rocket size={120} className="mb-10 animate-float mx-auto text-[var(--color-general)]" />
                <h2 className="text-5xl md:text-8xl font-black tracking-tight mb-8 italic leading-none pr-4 text-white">
                  {translations.home.newsletterTitle}
                </h2>
              <p className="text-xl md:text-2xl font-bold opacity-60 max-w-2xl mx-auto mb-16 text-gray-200">
                {translations.home.newsletterSubtitle}
              </p>
              
              <NewsletterForm />
              
                  <div className="flex flex-wrap justify-center gap-8 mt-20 opacity-40 text-white">
                    {["Games", "Records", "Dev"].map((item) => (
                      <span key={item} className="text-sm font-black tracking-[0.4em] uppercase">{item}</span>
                    ))}
                  </div>
            </motion.div>
        </div>
      </section>

    </div>
  );
}
