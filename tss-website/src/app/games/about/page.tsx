import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

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
                            Tworzymy gry, które łączą nasze pomysły, technologie i pasję do interaktywnej rozrywki. Od pierwszego prototypu po gotową grę - każdy projekt zaczyna się od pomysłu.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 max-w-7xl">
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

            {/* Main Content */}
            <div className="space-y-8">
                {/* Nasze gry */}
                <Card className="border-[var(--color-games)]/20 bg-[var(--color-games)]/5">
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)]">
                            Nasze gry
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-400 font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                            Gry to jeden z głównych sposobów, w jaki Two Steps Studio realizuje kreatywne pomysły. Eksperymentujemy z różnymi gatunkami, mechanikami i stylami, tworząc projekty, które pozwalają nam rozwijać zarówno umiejętności, jak i własne uniwersa.
                        </p>
                    </CardContent>
                </Card>

                {/* Od prototypu do gry */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)] mb-6">
                        Od prototypu do gry
                    </h2>
                    <p className="text-zinc-400 max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                        Każdy projekt zaczyna się od prostego pytania: „A co, gdyby…?”
                    </p>
                    <p className="text-zinc-400 max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed mt-4">
                        Potem budujemy prototyp, sprawdzamy mechaniki i rozwijamy te pomysły, które mają największy potencjał. Proces może się zmieniać wraz z projektem - czasem prowadzi do małej gry, a czasem do znacznie większej produkcji.
                    </p>
                </div>

                {/* Co jest dla nas ważne */}
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)] mb-6">
                        Co jest dla nas ważne?
                    </h2>
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">Gameplay first</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                Dobra gra powinna przede wszystkim sprawiać przyjemność. Mechaniki i systemy projektujemy z myślą o doświadczeniu gracza.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">Eksperymentowanie</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                Nie chcemy tworzyć ciągle tego samego. Testujemy nowe pomysły i szukamy własnych sposobów na podejście do znanych gatunków.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 p-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-space)] mb-3">Rozwój</h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
                                Każdy projekt daje nam nowe doświadczenia. To, czego uczymy się podczas jednej gry, wykorzystujemy przy kolejnych.
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
                        Poznaj nasze projekty
                    </a>
                    <p className="text-zinc-400 mt-4 font-[family-name:var(--font-outfit)]">
                        Zobacz gry, nad którymi pracujemy, i sprawdź, co aktualnie tworzymy.
                    </p>
                </div>
            </div>
        </>
    );
}