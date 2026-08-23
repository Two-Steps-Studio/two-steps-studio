import { Metadata } from "next";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "DEV - Two Steps Studio",
  description: "Zespół deweloperski Two Steps Studio - projekty",
  openGraph: {
    title: "DEV - Two Steps Studio",
    description: "Zespół deweloperski Two Steps Studio - projekty",
    url: "https://twostepsstudio.vercel.app/dev",
  },
};

export default function DevPage() {
  return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        {/* Hero Section */}
        <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
          <img
              src="/assets/HeroSection/dev.avif"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-dev)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-dev)]/20 blur-3xl animate-pulse" />

          <div className="relative z-10 space-y-4 text-center">
            <Badge className="bg-[var(--color-dev)]/20 text-[var(--color-dev)] hover:bg-[var(--color-dev)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
              Two Steps Studio
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
              <span className="text-[var(--color-dev)]">DEV</span>
            </h1>
            <p className="text-white max-w-2xl mx-auto font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
              Tworzymy technologie, narzędzia i doświadczenia, które pomagają zamieniać pomysły w działające projekty. Od pierwszego prototypu po gotowy produkt - budujemy, testujemy i rozwijamy rozwiązania stojące za Two Steps Studio.
            </p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { name: "About Us", href: "/dev/about" },
            { name: "Recruitment", href: "/dev/recruitment" },
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

        {/* Development Section */}
        <div className="space-y-12">
          <Card className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)]">
            <CardContent className="p-8">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] font-[family-name:var(--font-space)] mb-4">
                Od pomysłu do działającego projektu
              </h2>
              <p className="text-[var(--text)] max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed">
                DEV to przestrzeń Two Steps Studio poświęcona tworzeniu technologii i oprogramowania. Łączymy programowanie, projektowanie systemów i kreatywne podejście do rozwiązywania problemów.
              </p>
              <p className="text-[var(--text)] max-w-3xl font-[family-name:var(--font-outfit)] text-lg leading-relaxed mt-4">
                Pracujemy nad własnymi projektami, narzędziami i rozwiązaniami, które pozwalają nam szybciej realizować kolejne pomysły. Nie chodzi tylko o pisanie kodu - zależy nam na tworzeniu rzeczy z konkretnym celem, które można dalej rozwijać.
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)] mb-3">Build</h3>
                <p className="text-[var(--text)] font-[family-name:var(--font-outfit)] leading-relaxed">
                  Budujemy własne projekty od podstaw, eksperymentując z technologiami i rozwiązaniami dopasowanymi do konkretnego problemu.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)] mb-3">Experiment</h3>
                <p className="text-[var(--text)] font-[family-name:var(--font-outfit)] leading-relaxed">
                  Testujemy nowe pomysły, technologie i podejścia, zanim zdecydujemy, które z nich warto rozwijać dalej.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)] mb-3">Improve</h3>
                <p className="text-[var(--text)] font-[family-name:var(--font-outfit)] leading-relaxed">
                  Każdy projekt jest okazją do nauki, usprawniania naszych procesów i tworzenia coraz lepszych rozwiązań.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}