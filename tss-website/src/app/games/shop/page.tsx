"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gamepad2, Search, Filter, Download, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { GameInstallControls } from "@/components/Games/GameInstallControls";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { Game, GameCategory, GameStatus } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";
import { getGameCategoryLabels, getGameStatusLabels } from "@/lib/game-labels";

const CATEGORIES: GameCategory[] = ['action', 'adventure', 'rpg', 'strategy', 'simulation', 'sports', 'racing', 'puzzle', 'horror', 'indie', 'other'];

export default function Page() {
  const { t } = useLanguage();

  const CATEGORY_LABELS = getGameCategoryLabels(t);
  const STATUS_LABELS = getGameStatusLabels(t);

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "release_date" | "views" | "downloads">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      searchQuery === "" ||
      game.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.developer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.short_description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || game.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const modifier = sortOrder === "asc" ? 1 : -1;

    if (sortBy === "created_at") {
      return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * modifier;
    }
    if (sortBy === "release_date") {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return (new Date(a.release_date).getTime() - new Date(b.release_date).getTime()) * modifier;
    }
    if (sortBy === "views") {
      return ((a.views || 0) - (b.views || 0)) * modifier;
    }
    if (sortBy === "downloads") {
      return ((a.downloads || 0) - (b.downloads || 0)) * modifier;
    }
    return 0;
  });

  const featuredGames = games.filter((game) => game.featured).slice(0, 5);

  return (
    <>
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        {/* Hero Section */}
        <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
          <img
              src="/assets/HeroSection/games-shop.avif"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/20 blur-3xl animate-pulse" />

          <div className="relative z-10 space-y-4 text-center">
            <h1 className="text-5xl md:text-8xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
              <span className="text-[var(--color-games)]">{t.gamesShopPage.title}</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="container mx-auto px-6 mb-10 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: t.gamesShopPage.navGames, href: "/games" },
            { name: t.gamesShopPage.navAbout, href: "/games/about" },
          ].map((item, i) => (
            <a
              key={i}
              href={item.href}
              className="rounded-3xl border border-[var(--color-games)]/20 bg-[var(--color-games)]/5 hover:bg-[var(--color-games)]/10 transition-all p-5 shadow-sm group"
            >
              <div className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--color-games)] transition-colors">
                {item.name}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Featured Games Carousel */}
      {featuredGames.length > 0 && (
        <div className="container mx-auto px-6 mb-12 max-w-7xl">
          <h2 className="mb-4 text-2xl font-bold text-[var(--text)] font-[family-name:var(--font-space)]">
            {t.gamesCatalog.featuredTitle}
          </h2>
          <Carousel opts={{ loop: true, align: "start" }} className="w-full">
            <CarouselContent>
              {featuredGames.map((game) => (
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
      )}

      {/* Search and Filters */}
      <div className="container mx-auto px-6 mb-8 max-w-7xl space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <Input
            placeholder={t.gamesCatalog.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-[var(--card-bg)] border-[var(--border)] text-[var(--text)] placeholder:text-zinc-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mr-4">
            <Filter size={16} />
            <span>{t.gamesCatalog.categoryLabel}</span>
          </div>
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full ${
              selectedCategory === "all"
                ? "bg-[var(--color-games)] text-white"
                : "border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            {t.gamesCatalog.allCategories}
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full ${
                selectedCategory === category
                  ? "bg-[var(--color-games)] text-white"
                  : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {CATEGORY_LABELS[category]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mr-4">
            {t.gamesCatalog.sortLabel}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2 text-sm"
          >
            <option value="created_at">{t.gamesCatalog.sortAdded}</option>
            <option value="release_date">{t.gamesCatalog.sortReleased}</option>
            <option value="views">{t.gamesCatalog.sortViews}</option>
            <option value="downloads">{t.gamesCatalog.sortDownloads}</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="rounded-xl border-white/10 text-zinc-400 hover:text-white"
          >
            {sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </Button>
        </div>
      </div>

      {/* Games List */}
      <div className="container mx-auto px-6 pb-12 max-w-7xl">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Card
                key={i}
                className="rounded-[2rem] bg-[var(--card-bg)] border border-white/10 animate-pulse h-96"
              />
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <Card className="w-full rounded-[2.5rem] ">
            <CardContent className="p-12 text-center">
              <Gamepad2 className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
              <h2 className="text-2xl font-bold mb-2 text-white">{t.gamesCatalog.emptyTitle}</h2>
              <p className="text-zinc-400">
                {searchQuery || selectedCategory !== "all"
                  ? t.gamesCatalog.emptyFiltered
                  : t.gamesCatalog.emptyNone}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredGames.map((game) => (
              <Card
                key={game.id}
                className="group relative overflow-hidden rounded-[2rem] hover:border-[var(--color-games)] transition-all duration-300 hover:-translate-y-1"
              >
                {game.thumbnail_url && (
                  <div className="aspect-[2/3] w-full overflow-hidden bg-white/5">
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)] line-clamp-2">
                      {game.title}
                    </CardTitle>
                    {game.status && game.status !== 'published' && (
                      <Badge variant="secondary" className="bg-[var(--card-bg)] text-zinc-400 border border-[var(--border] text-xs shrink-0">
                        {STATUS_LABELS[game.status]}
                      </Badge>
                    )}
                  </div>
                  {game.developer && (
                    <CardDescription className="text-zinc-400 font-[family-name:var(--font-outfit)] text-sm">
                      {game.developer}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {game.short_description && (
                    <p className="text-sm text-zinc-400 line-clamp-2 font-[family-name:var(--font-outfit)]">
                      {game.short_description}
                    </p>
                  )}

                  {game.category && (
                    <Badge variant="secondary" className="bg-[var(--color-games)]/10 text-[var(--color-games)] border border-[var(--color-games)]/20 text-xs">
                      {CATEGORY_LABELS[game.category]}
                    </Badge>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Eye size={12} />
                      <span>{game.views || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download size={12} />
                      <span>{game.downloads || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/games/${game.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-[var(--color-games)]/30 text-[var(--color-games)] hover:bg-[var(--color-games)]/10 rounded-xl"
                      >
                        {t.gamesCatalog.details}
                      </Button>
                    </Link>
                    {game.id !== undefined && <GameInstallControls gameId={game.id} title={game.title} compact />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
