 "use client";

import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { Game } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";

export default function GamesPage() {
  const { t } = useLanguage();

  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games?visibility=public&status=published");
      const data = await res.json();
      setGames(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania gier:", error);
      toast.error(t.gamesCatalog.loadError);
    }
  };

  const featuredGames = games.filter((game) => game.featured).slice(0, 5);
  const latestGames = [...games]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 10);
  const popularGames = [...games]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 10);

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      {/* Hero Section */}
      <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
        <img
            src="/assets/HeroSection/games.avif"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/20 via-transparent to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/20 blur-3xl animate-pulse" />

        <div className="relative z-10 space-y-4 text-center">
          <h1 className="text-5xl md:text-8xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
            <span className="text-[var(--color-games)]">{t.gamesPage.title}</span>
          </h1>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { name: t.gamesPage.navGames, href: "/games" },
          { name: t.gamesPage.navLibrary, href: "/games/library" },
          { name: t.gamesPage.navShop, href: "/games/shop" },
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
    </div>
  );
}

function GameCarouselRow({ title, games }: { title: string; games: Game[] }) {
  if (games.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="mb-4 text-2xl font-bold text-white font-[family-name:var(--font-space)]">
        {title}
      </h2>
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent>
          {games.map((game) => (
            <CarouselItem key={game.id} className="basis-1/3">
              <Link href={`/games/${game.id}`} className="group block">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
                  {game.thumbnail_url ? (
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Gamepad2 className="h-10 w-10 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3">
                    <p className="truncate text-sm font-bold text-white">{game.title}</p>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
