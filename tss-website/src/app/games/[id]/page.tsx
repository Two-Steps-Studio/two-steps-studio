"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Download, Eye, Gamepad2, Monitor, Cpu, HardDrive, Tag } from "lucide-react";
import Link from "next/link";
import { GameInstallControls } from "@/components/Games/GameInstallControls";
import type { GameWithDetails } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";
import { getGameCategoryLabels, getGameStatusLabels } from "@/lib/game-labels";

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage();
  const CATEGORY_LABELS = getGameCategoryLabels(t);
  const STATUS_LABELS = getGameStatusLabels(t);
  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unwrappedParams = use(params);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games?id=${unwrappedParams.id}`);
        if (!res.ok) {
          throw new Error("Błąd pobierania danych gry");
        }
        const data = await res.json();

        if (!data.success || !data.data) {
          throw new Error("Gra nie została znaleziona");
        }

        setGame(data.data);
      } catch (err) {
        console.error("[GAME DETAIL] Error:", err);
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [unwrappedParams.id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-games)]"></div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 mb-8">
          <strong>Błąd:</strong> {error || "Gra nie została znaleziona"}
        </div>
        <Link href="/games" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors shadow-lg">
          <ArrowLeft size={18} />
          Wróć do gier
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-[var(--color-games)] hover:text-[var(--color-games)]/80 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Wróć do gier</span>
        </Link>
      </div>

      {/* Banner */}
      {game.banner_url && (
        <div className="relative mb-8 h-64 md:h-96 rounded-[2.5rem] overflow-hidden">
          <img
            src={game.banner_url}
            alt={game.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="relative mb-12 p-8 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/20 via-transparent to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/20 blur-3xl animate-pulse" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-[var(--color-games)]/20 text-[var(--color-games)] hover:bg-[var(--color-games)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
              Two Steps Studio
            </Badge>
            {game.category && (
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                {CATEGORY_LABELS[game.category]}
              </Badge>
            )}
            {game.status && game.status !== 'published' && (
              <Badge variant="secondary" className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                {STATUS_LABELS[game.status]}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
            <span className="text-[var(--color-games)]">{game.title}</span>
          </h1>
          {game.short_description && (
            <p className="text-zinc-400 max-w-2xl font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
              {game.short_description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {game.full_description && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Opis gry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {game.full_description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screenshots */}
          {game.game_screenshots && game.game_screenshots.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Zrzuty ekranu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {game.game_screenshots
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map((screenshot) => (
                      <div key={screenshot.id} className="relative rounded-2xl overflow-hidden aspect-video">
                        <img
                          src={screenshot.url}
                          alt={screenshot.caption || "Screenshot"}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {screenshot.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-sm">
                            <p className="text-white text-sm">{screenshot.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Requirements */}
          {game.game_requirements && game.game_requirements.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Wymagania systemowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {game.game_requirements.map((req) => (
                  <div key={req.id} className="space-y-3">
                    <Badge className="bg-[var(--color-games)]/20 text-[var(--color-games)] border-[var(--color-games)]/30">
                      {req.requirement_type === 'minimum' ? 'Minimalne' : 'Zalecane'}
                    </Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {req.os && (
                        <div className="flex items-center gap-3">
                          <Monitor className="text-[var(--color-games)]" size={18} />
                          <span className="text-zinc-300">OS: {req.os}</span>
                        </div>
                      )}
                      {req.processor && (
                        <div className="flex items-center gap-3">
                          <Cpu className="text-[var(--color-games)]" size={18} />
                          <span className="text-zinc-300">Procesor: {req.processor}</span>
                        </div>
                      )}
                      {req.memory && (
                        <div className="flex items-center gap-3">
                          <HardDrive className="text-[var(--color-games)]" size={18} />
                          <span className="text-zinc-300">RAM: {req.memory}</span>
                        </div>
                      )}
                      {req.graphics && (
                        <div className="flex items-center gap-3">
                          <Gamepad2 className="text-[var(--color-games)]" size={18} />
                          <span className="text-zinc-300">Karta graficzna: {req.graphics}</span>
                        </div>
                      )}
                      {req.storage && (
                        <div className="flex items-center gap-3">
                          <HardDrive className="text-[var(--color-games)]" size={18} />
                          <span className="text-zinc-300">Miejsce: {req.storage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Changelog */}
          {game.changelog && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Historia zmian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {game.changelog}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {/* Actions */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Akcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {game.id !== undefined && <GameInstallControls gameId={game.id} title={game.title} />}
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Informacje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Wersja:</span>
                <span className="text-white font-mono">{game.version || "N/D"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Deweloper:</span>
                <span className="text-white">{game.developer || "N/D"}</span>
              </div>
              {game.publisher && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Wydawca:</span>
                  <span className="text-white">{game.publisher}</span>
                </div>
              )}
              {game.release_date && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Data wydania:</span>
                  <span className="text-white">{new Date(game.release_date).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Wyświetlenia:</span>
                <div className="flex items-center gap-1">
                  <Eye size={14} className="text-[var(--color-games)]" />
                  <span className="text-white">{game.views || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Pobrania:</span>
                <div className="flex items-center gap-1">
                  <Download size={14} className="text-[var(--color-games)]" />
                  <span className="text-white">{game.downloads || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag size={18} className="text-[var(--color-games)]" />
                  Tagi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Genres */}
          {game.genres && game.genres.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Gatunki</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="bg-[var(--color-games)]/10 text-[var(--color-games)] border-[var(--color-games)]/20">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}