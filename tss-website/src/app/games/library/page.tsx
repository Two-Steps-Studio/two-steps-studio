"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Library, ArrowLeft } from "lucide-react";
import { useIsElectron, useGameLibrary } from "@/hooks/useElectron";
import { GameInstallControls } from "@/components/Games/GameInstallControls";
import type { Game } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";
import { Skeleton } from "@/components/ui/skeleton";

export default function GameLibraryPage() {
  const { t } = useLanguage();
  const isElectron = useIsElectron();
  const { library, isLoading } = useGameLibrary();
  const [gamesById, setGamesById] = useState<Record<number, Game>>({});

  const gameIds = Object.keys(library);

  useEffect(() => {
    if (gameIds.length === 0) return;
    (async () => {
      try {
        const res = await fetch("/api/games");
        const data = await res.json();
        const map: Record<number, Game> = {};
        for (const g of data.data || []) {
          if (g.id !== undefined) map[g.id] = g;
        }
        setGamesById(map);
      } catch (error) {
        console.error("Failed to fetch games for library:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameIds.length]);

  if (!isElectron) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-3xl text-center">
        <Library className="w-16 h-16 mx-auto mb-6 text-[var(--text-muted)]" />
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{t.gamesLibrary.title}</h1>
        <p className="text-[var(--text-muted)] mb-6">{t.gamesLibrary.desktopOnly}</p>
        <Link href="/download" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors">
          {t.gamesLibrary.downloadDesktop}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-5xl">
      <Link href="/games" className="inline-flex items-center gap-2 text-[var(--color-games)] hover:text-[var(--color-games)]/80 mb-6">
        <ArrowLeft size={18} /> <span>{t.gamesLibrary.backToGames}</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--text)] flex items-center gap-3">
          <Library className="w-8 h-8 text-[var(--color-games)]" />
          {t.gamesLibrary.libraryTitle}
        </h1>
        <p className="text-[var(--text-muted)] mt-2">{t.gamesLibrary.librarySubtitle}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--card-bg)]">
              <Skeleton className="aspect-[2/3] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : gameIds.length === 0 ? (
        <Card className="bg-[var(--card-bg)] border-[var(--border-color)] rounded-[2.5rem]">
          <CardContent className="p-12 text-center">
            <Library className="w-16 h-16 mx-auto mb-6 text-[var(--text-muted)]" />
            <h2 className="text-2xl font-bold mb-2 text-[var(--text)]">{t.gamesLibrary.emptyTitle}</h2>
            <p className="text-[var(--text-muted)] mb-6">{t.gamesLibrary.emptyDesc}</p>
            <Link href="/games" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-[var(--text)] rounded-full font-medium transition-colors">
              {t.gamesLibrary.browseGames}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {gameIds.map((gameId) => {
            const entry = library[gameId];
            const game = gamesById[Number(gameId)];
            return (
              <Card
                key={gameId}
                className="group relative overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--color-games)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-[2/3] w-full overflow-hidden bg-[var(--surface)]">
                  {game?.thumbnail_url ? (
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Library className="w-10 h-10 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-[var(--text)] font-[family-name:var(--font-space)] line-clamp-1">
                    {game?.title || `${t.gamesLibrary.gameFallback}${gameId}`}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-muted)] text-xs">
                      v{entry.version}
                    </Badge>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs truncate">{entry.installDir}</p>

                  <div className="flex gap-2">
                    <Link href={`/games/${gameId}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-[var(--color-games)]/30 text-[var(--color-games)] hover:bg-[var(--color-games)]/10 rounded-xl"
                      >
                        {t.gamesCatalog.details}
                      </Button>
                    </Link>
                    {game && <GameInstallControls gameId={game.id!} title={game.title} compact />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
