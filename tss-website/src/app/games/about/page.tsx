"use client";

import { redirect } from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-translation";

export default function Page() {
    const { t } = useLanguage();
    return (
        <>
            <div className="container mx-auto p-6 mt-20 max-w-7xl">
                {/* Hero Section */}
                <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
                    <img
                        src="/assets/HeroSection/games-about.avif"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/20 blur-3xl animate-pulse" />

                    <div className="relative z-10 space-y-4 text-center">
                        <h1 className="text-5xl md:text-8xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
                            <span className="text-[var(--color-games)]">{t.gamesAbout.title}</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 max-w-7xl">
                {/* Quick Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                    { name: t.gamesAbout.navGames, href: "/games" },
                    { name: t.gamesAbout.navShop, href: "/games/shop" },
                ].map((item, i) => (
                    <a
                        key={i}
                        href={item.href}
                        className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 hover:bg-[var(--color-games)]/10 transition-all p-5 shadow-sm group"
                    >
                        <div className="text-lg font-bold text-black dark:text-white group-hover:text-[var(--color-games)] transition-colors">
                            {item.name}
                        </div>
                    </a>
                ))}
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* Nasze gry */}
                <Card className="border-[var(--color-games)]/20 bg-[var(--color-games)]/5">
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)]">
                            {t.gamesAbout.ourGamesTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-400 font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.gamesAbout.ourGamesDesc}
                        </p>
                    </CardContent>
                </Card>

                {/* Od prototypu do gry */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)] mb-6">
                        {t.gamesAbout.prototypeTitle}
                    </h2>
                    <p className="text-zinc-400 max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                        {t.gamesAbout.prototypeP1}
                    </p>
                    <p className="text-zinc-400 max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed mt-4">
                        {t.gamesAbout.prototypeP2}
                    </p>
                </div>

                {/* Co jest dla nas ważne */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)] mb-6">
                        {t.gamesAbout.importantTitle}
                    </h2>
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">{t.gamesAbout.gameplayFirstTitle}</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                {t.gamesAbout.gameplayFirstDesc}
                            </p>
                        </div>
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">{t.gamesAbout.experimentingTitle}</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                {t.gamesAbout.experimentingDesc}
                            </p>
                        </div>
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">{t.gamesAbout.growthTitle}</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                {t.gamesAbout.growthDesc}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-8">
                    <a
                        href="/games"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--color-games)] hover:bg-[var(--color-games)]/80 text-white font-bold rounded-2xl transition-all text-lg"
                    >
                        {t.gamesAbout.ctaButton}
                    </a>
                    <p className="text-zinc-400 mt-4 font-[family-name:var(--font-outfit)]">
                        {t.gamesAbout.ctaDesc}
                    </p>
                </div>
            </div>
            </div>
        </>
    );
}