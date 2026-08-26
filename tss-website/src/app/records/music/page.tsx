"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Search, Filter, Play, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { MusicTrack, MusicGenre } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";

const GENRES: MusicGenre[] = ['pop', 'rock', 'hip_hop', 'electronic', 'classical', 'jazz', 'blues', 'country', 'reggae', 'metal', 'indie', 'other'];

export default function MusicPage() {
  const { t } = useLanguage();

  const GENRE_LABELS: Record<MusicGenre, string> = {
    pop: 'Pop',
    rock: 'Rock',
    hip_hop: 'Hip-Hop',
    electronic: 'Electronic',
    classical: 'Classical',
    jazz: 'Jazz',
    blues: 'Blues',
    country: 'Country',
    reggae: 'Reggae',
    metal: 'Metal',
    indie: 'Indie',
    other: t.recordsMusic.genreOther,
  };

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<MusicGenre | "all">("all");

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const res = await fetch("/api/music?visibility=public");
      const data = await res.json();
      setTracks(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania utworów:", error);
      toast.error(t.recordsMusic.loadError);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      searchQuery === "" ||
      track.title?.toLowerCase ().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.album?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === "all" || track.genre === selectedGenre;

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      {/* Hero Section */}
      <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
        <img
            src="/assets/HeroSection/records-music.avif"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-records)]/20 via-transparent to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-records)]/20 blur-3xl animate-pulse" />

        <div className="relative z-10 space-y-4 text-center">
          <h1 className="text-5xl md:text-8xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
            <span className="text-[var(--color-records)]">{t.recordsMusic.title}</span>
          </h1>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { name: t.recordsMusic.navRecords, href: "/records" },
          { name: t.recordsMusic.navBeats, href: "/records/beats" },
          { name: t.recordsMusic.navPodcasts, href: "/records/podcasts" }
        ].map((item, i) => (
          <a
            key={i}
            href={item.href}
            className="rounded-3xl border border-[var(--color-records)]/20 bg-[var(--color-records)]/5 hover:bg-[var(--color-records)]/10 transition-all p-5 shadow-sm group"
          >
            <div className="text-lg font-bold text-black dark:text-white group-hover:text-[var(--color-records)] transition-colors">
              {item.name}
            </div>
          </a>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <Input
            placeholder={t.recordsMusic.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-black/40 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mr-4">
            <Filter size={16} />
            <span>{t.recordsMusic.genreLabel}</span>
          </div>
          <Button
            variant={selectedGenre === "all" ? "default" : "outline"}
            onClick={() => setSelectedGenre("all")}
            className={`rounded-full ${
              selectedGenre === "all"
                ? "bg-[var(--color-records)] text-white"
                : "border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            {t.recordsMusic.allGenres}
          </Button>
          {GENRES.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? "default" : "outline"}
              onClick={() => setSelectedGenre(genre)}
              className={`rounded-full ${
                selectedGenre === genre
                  ? "bg-[var(--color-records)] text-white"
                  : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {GENRE_LABELS[genre]}
            </Button>
          ))}
        </div>
      </div>

      {/* Tracks List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card
              key={i}
              className="rounded-[2rem] bg-black/40 border border-white/10 animate-pulse h-64"
            />
          ))}
        </div>
      ) : filteredTracks.length === 0 ? (
        <Card className="w-full rounded-[2.5rem] bg-black/40 border border-white/10">
          <CardContent className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">{t.recordsMusic.emptyTitle}</h2>
            <p className="text-zinc-400">
              {searchQuery || selectedGenre !== "all"
                ? t.recordsMusic.emptyFiltered
                : t.recordsMusic.emptyNone}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => (
            <Card
              key={track.id}
              className="group relative overflow-hidden rounded-[2rem] bg-black/40 border border-white/10 hover:border-[var(--color-records)] transition-all duration-300 hover:-translate-y-1"
            >
              {track.cover_image_url && (
                <div className="h-48 overflow-hidden bg-white/5">
                  <img
                    src={track.cover_image_url}
                    alt={track.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-white font-[family-name:var(--font-space)] line-clamp-1">
                  {track.title}
                </CardTitle>
                <CardDescription className="text-zinc-400 font-[family-name:var(--font-outfit)] text-sm">
                  {track.artist}
                  {track.album && ` • ${track.album}`}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {track.genre && (
                  <Badge variant="secondary" className="bg-[var(--color-records)]/10 text-[var(--color-records)] border border-[var(--color-records)]/20 text-xs">
                    {GENRE_LABELS[track.genre]}
                  </Badge>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{formatDuration(track.duration_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play size={12} />
                    <span>{track.plays || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/records/music/${track.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-[var(--color-records)]/30 text-[var(--color-records)] hover:bg-[var(--color-records)]/10 rounded-xl"
                    >
                      {t.recordsMusic.details}
                    </Button>
                  </Link>
                  {track.spotify_url && (
                    <Button
                      onClick={() => window.open(track.spotify_url, '_blank')}
                      variant="outline"
                      size="icon"
                      className="rounded-xl border-[var(--color-records)]/30 text-[var(--color-records)] hover:bg-[var(--color-records)]/10"
                    >
                      <ExternalLink size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
