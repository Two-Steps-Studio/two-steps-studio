"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gamepad2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { GameInstallControls } from "@/components/Games/GameInstallControls";
import type { Game, GameCategory, GameStatus } from "@/types/games-records";

const CATEGORY_LABELS: Record<GameCategory, string> = {
  action: 'Akcja',
  adventure: 'Przygodowa',
  rpg: 'RPG',
  strategy: 'Strategia',
  simulation: 'Symulacja',
  sports: 'Sportowa',
  racing: 'Wyścigi',
  puzzle: 'Logiczna',
  horror: 'Horror',
  indie: 'Indie',
  other: 'Inne',
};

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: 'Szkic',
  published: 'Opublikowana',
  archived: 'Zarchiwizowana',
  coming_soon: 'Wkrótce',
};

export default function Page() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.error("Nie udało się załadować gier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        {/* Hero Section */}
        <div className="relative mb-16 p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/20 blur-3xl animate-pulse" />

          <div className="relative z-10 space-y-4">
            <Badge className="bg-[var(--color-games)]/20 text-[var(--color-games)] hover:bg-[var(--color-games)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
              Two Steps Studio
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
              <span className="text-[var(--color-games)]">Loucher Gier</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
              Odkryj światy, które tworzymy. Od epickich przygód po szybkie rozgrywki – znajdź coś dla siebie.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="container mx-auto px-6 mb-10 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Games", href: "/games" },
            { name: "Info o grach", href: "/games/info-o-grach" },
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

      {/* Games List */}
      <div className="container mx-auto px-6 pb-12 max-w-7xl">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="rounded-[2rem] bg-black/40 border border-white/10 animate-pulse h-64"
              />
            ))}
          </div>
        ) : games.length === 0 ? (
          <Card className="w-full rounded-[2.5rem] bg-black/40 border border-white/10">
            <CardContent className="p-12 text-center">
              <Gamepad2 className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
              <h2 className="text-2xl font-bold mb-2 text-white">Brak gier</h2>
              <p className="text-zinc-400">
                Brak dostępnych gier w bazie.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Card
                key={game.id}
                className="group relative overflow-hidden rounded-[2rem] bg-black/40 border border-white/10 hover:border-[var(--color-games)] transition-all duration-300 hover:-translate-y-1"
              >
                {game.thumbnail_url && (
                  <div className="h-48 overflow-hidden bg-white/5">
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-bold text-white font-[family-name:var(--font-space)] line-clamp-2">
                      {game.title}
                    </CardTitle>
                    {game.status && game.status !== 'published' && (
                      <Badge variant="secondary" className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 text-xs shrink-0">
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
                        Szczegóły
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