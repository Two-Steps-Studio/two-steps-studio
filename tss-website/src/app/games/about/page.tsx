import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function Page() {
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
                        <Badge className="bg-[var(--color-games)]/20 text-[var(--color-games)] hover:bg-[var(--color-games)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
                            Games
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
                            <span className="text-[var(--color-games)]">About Games</span>
                        </h1>
                        <p className="text-white max-w-2xl mx-auto font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
                            Odkryj światy, które tworzymy. Od epickich przygód po szybkie rozgrywki – znajdź coś dla siebie.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                    { name: "Games", href: "/games" },
                    { name: "Shop", href: "/games/shop" },
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
            
        </>
    );
}