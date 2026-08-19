"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Library, ArrowLeft } from "lucide-react";
import { useIsElectron, useGameLibrary } from "@/hooks/useElectron";
import { GameInstallControls } from "@/components/Games/GameInstallControls";
import type { Game } from "@/types/games-records";

export default function GameLibraryPage() {
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
        <Library className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
        <h1 className="text-2xl font-bold text-white mb-2">Biblioteka gier</h1>
        <p className="text-zinc-400 mb-6">Biblioteka jest dostępna tylko w aplikacji desktopowej.</p>
        <Link href="/download" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors">
          Pobierz aplikację desktopową
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-5xl">
      <Link href="/games" className="inline-flex items-center gap-2 text-[var(--color-games)] hover:text-[var(--color-games)]/80 mb-6">
        <ArrowLeft size={18} /> <span>Wróć do gier</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
          <Library className="w-8 h-8 text-[var(--color-games)]" />
          Biblioteka
        </h1>
        <p className="text-zinc-400 mt-2">Twoje zainstalowane gry</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-games)]"></div>
        </div>
      ) : gameIds.length === 0 ? (
        <Card className="bg-black/40 border-white/10 rounded-[2.5rem]">
          <CardContent className="p-12 text-center">
            <Library className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">Brak zainstalowanych gier</h2>
            <p className="text-zinc-400 mb-6">Przeglądaj katalog i zainstaluj swoją pierwszą grę.</p>
            <Link href="/games" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors">
              Przeglądaj gry
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gameIds.map((gameId) => {
            const entry = library[gameId];
            const game = gamesById[Number(gameId)];
            return (
              <Card key={gameId} className="bg-black/40 border-white/10 rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  {game?.thumbnail_url ? (
                    <img src={game.thumbnail_url} alt={game.title} className="w-24 h-24 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                      <Library className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/games/${gameId}`} className="text-xl font-bold text-white hover:text-[var(--color-games)] transition-colors">
                      {game?.title || `Gra #${gameId}`}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-zinc-400 text-xs">
                        v{entry.version}
                      </Badge>
                      <span className="text-zinc-500 text-xs">{entry.installDir}</span>
                    </div>
                  </div>
                  <div className="w-full md:w-64 shrink-0">
                    {game ? <GameInstallControls gameId={game.id!} title={game.title} /> : null}
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
