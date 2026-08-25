"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Clock,
  Calendar,
  Mic2,
  User
} from "lucide-react";
import Link from "next/link";
import type { PodcastWithSeries } from "@/types/games-records";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

export default function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [podcast, setPodcast] = useState<PodcastWithSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    volume,
    handlePlayPause,
    handleTimeUpdate,
    handleSeek,
    handleVolumeChange,
    handleSkip,
    formatTime,
  } = useAudioPlayer();

  const unwrappedParams = use(params);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        const res = await fetch(`/api/podcasts?id=${unwrappedParams.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Podcast nie został znaleziony");
          }
          throw new Error("Błąd pobierania danych podcastu");
        }
        const data = await res.json();

        if (!data.success || !data.data) {
          throw new Error("Podcast nie został znaleziony");
        }

        setPodcast(data.data);
      } catch (err) {
        console.error("[PODCAST DETAIL] Error:", err);
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    fetchPodcast();
  }, [unwrappedParams.id]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-records)]"></div>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 mb-8">
          <strong>Błąd:</strong> {error || "Podcast nie został znaleziony"}
        </div>
        <Link href="/records/podcasts" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-records)] hover:bg-[var(--color-records)]/90 text-white rounded-full font-medium transition-colors shadow-lg">
          <ArrowLeft size={18} />
          Wróć do podcastów
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/records/podcasts"
          className="inline-flex items-center gap-2 text-[var(--color-records)] hover:text-[var(--color-records)]/80 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Wróć do podcastów</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header with Thumbnail */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {podcast.thumbnail_url && (
                <div className="aspect-square md:aspect-auto md:h-full">
                  <img
                    src={podcast.thumbnail_url}
                    alt={podcast.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-8 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {podcast.episode_number && (
                      <Badge className="bg-[var(--color-records)]/20 text-[var(--color-records)] border-[var(--color-records)]/30">
                        Odcinek {podcast.episode_number}
                      </Badge>
                    )}
                    {podcast.season && (
                      <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                        Sezon {podcast.season}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)]">
                    {podcast.title}
                  </h1>
                  {podcast.host && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <User size={18} />
                      <span>{podcast.host}</span>
                    </div>
                  )}
                  {podcast.podcast_series && (
                    <p className="text-zinc-400">{podcast.podcast_series.title}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{formatDuration(podcast.duration_seconds)}</span>
                    </div>
                    {podcast.published_date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{new Date(podcast.published_date).toLocaleDateString('pl-PL')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Audio Player */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
            <CardContent className="p-6">
              {podcast.audio_file_url && (
                <audio
                  ref={audioRef}
                  src={podcast.audio_file_url}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={podcast.duration_seconds || 0}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatDuration(podcast.duration_seconds)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(-10)} className="text-zinc-400 hover:text-white">
                    <SkipBack size={24} />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={!podcast.audio_file_url}
                    className="w-16 h-16 rounded-full bg-[var(--color-records)] hover:bg-[var(--color-records)]/90 text-white"
                  >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(10)} className="text-zinc-400 hover:text-white">
                    <SkipForward size={24} />
                  </Button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3 justify-center">
                  <Volume2 size={18} className="text-zinc-400" />
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-32 cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {podcast.description && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {podcast.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guests */}
          {podcast.guests && podcast.guests.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Goście</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {podcast.guests.map((guest) => (
                    <Badge key={guest} variant="secondary" className="bg-white/10 text-white border-white/20">
                      {guest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {/* Info */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Informacje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {podcast.host && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Prowadzący:</span>
                  <span className="text-white">{podcast.host}</span>
                </div>
              )}
              {podcast.episode_number && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Numer odcinka:</span>
                  <span className="text-white">{podcast.episode_number}</span>
                </div>
              )}
              {podcast.season && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Sezon:</span>
                  <span className="text-white">{podcast.season}</span>
                </div>
              )}
              {podcast.published_date && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Data publikacji:</span>
                  <span className="text-white">{new Date(podcast.published_date).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Odtworzenia:</span>
                <div className="flex items-center gap-1">
                  <Mic2 size={14} className="text-[var(--color-records)]" />
                  <span className="text-white">{podcast.plays || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {podcast.tags && podcast.tags.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Tagi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {podcast.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                      {tag}
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
