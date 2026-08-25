"use client"

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-translation";

export default function AboutPage() {
    const { t } = useLanguage();
    return (
        <div className="container mx-auto p-6 mt-20 max-w-7xl">
            {/* Hero Section */}
            <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
                <img 
                    src="/assets/HeroSection/dev-about.avif" 
                    alt="" 
                    className="absolute inset-0 h-full w-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-dev)]/20 via-transparent to-transparent opacity-50" />
                <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-dev)]/20 blur-3xl animate-pulse" />

                <div className="relative z-10 space-y-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
                        <span className="text-[var(--color-dev)]">{t.devAbout.title}</span>
                    </h1>
                    <p className="text-white max-w-2xl mx-auto font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
                        {t.devAbout.subtitle}
                    </p>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                    { name: t.devAbout.navDev, href: "/dev" },
                    { name: t.devAbout.navRecruitment, href: "/dev/recruitment" },
                ].map((item, i) => (
                    <a
                        key={i}
                        href={item.href}
                        className="rounded-3xl border border-[var(--color-dev)]/20 bg-[var(--color-dev)]/5 hover:bg-[var(--color-dev)]/10 transition-all p-5 shadow-sm group"
                    >
                        <div className="text-lg font-bold text-black dark:text-white group-hover:text-[var(--color-dev)] transition-colors">
                            {item.name}
                        </div>
                    </a>
                ))}
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* Co tworzymy */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-space)]">
                            {t.devAbout.whatWeBuildTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-zinc-400 font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.devAbout.whatWeBuildP1}
                        </p>
                        <p className="text-zinc-400 font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.devAbout.whatWeBuildP2}
                        </p>
                    </CardContent>
                </Card>

                {/* Jak pracujemy */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-space)]">
                            {t.devAbout.howWeWorkTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className=" font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.devAbout.howWeWorkP1}
                        </p>
                        <p className=" font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.devAbout.howWeWorkP2}
                        </p>
                    </CardContent>
                </Card>

                {/* Nasze podejście */}
                <Card className="">
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-space)]">
                            {t.devAbout.approachTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-2xl font-black text-[var(--color-dev)] font-[family-name:var(--font-space)]">
                            {t.devAbout.approachTagline}
                        </p>
                        <p className=" font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            {t.devAbout.approachP1}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}