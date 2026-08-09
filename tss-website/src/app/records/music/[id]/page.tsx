"use client";

import { useEffect, useState, use, useRef } from "react";
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
  Music,
  ExternalLink,
  Heart
} from "lucide-react";
import Link from "next/link";
import type { MusicTrack, MusicGenre } from "@/types/games-records";

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
  other: 'Inne',
};

export default function MusicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isLiked, setIsLiked] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const unwrappedParams = use(params);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const res = await fetch(`/api/music?id=${unwrappedParams.id}`);
        if (!res.ok) {
          throw new Error("Błąd pobierania danych utworu");
        }
        const data = await res.json();

        if (!data.success || !data.data) {
          throw new Error("Utwór nie został znaleziony");
        }

        setTrack(data.data);
      } catch (err) {
        console.error("[MUSIC DETAIL] Error:", err);
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [unwrappedParams.id]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
      setVolume(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  if (error || !track) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 mb-8">
          <strong>Błąd:</strong> {error || "Utwór nie został znaleziony"}
        </div>
        <Link href="/records/music" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-records)] hover:bg-[var(--color-records)]/90 text-white rounded-full font-medium transition-colors shadow-lg">
          <ArrowLeft size={18} />
          Wróć do muzyki
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/records/music"
          className="inline-flex items-center gap-2 text-[var(--color-records)] hover:text-[var(--color-records)]/80 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Wróć do muzyki</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header with Cover */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {track.cover_image_url && (
                <div className="aspect-square md:aspect-auto md:h-full">
                  <img
                    src={track.cover_image_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-8 flex flex-col justify-center">
                <div className="space-y-4">
                  {track.genre && (
                    <Badge className="bg-[var(--color-records)]/20 text-[var(--color-records)] border-[var(--color-records)]/30 w-fit">
                      {GENRE_LABELS[track.genre]}
                    </Badge>
                  )}
                  <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-space)]">
                    {track.title}
                  </h1>
                  <p className="text-2xl text-zinc-300 font-[family-name:var(--font-outfit)]">
                    {track.artist}
                  </p>
                  {track.album && (
                    <p className="text-zinc-400">{track.album}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{formatDuration(track.duration_seconds)}</span>
                    </div>
                    {track.release_date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{new Date(track.release_date).toLocaleDateString('pl-PL')}</span>
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
              {track.audio_file_url && (
                <audio
                  ref={audioRef}
                  src={track.audio_file_url}
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
                    max={track.duration_seconds || 0}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatDuration(track.duration_seconds)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                    <SkipBack size={24} />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={!track.audio_file_url}
                    className="w-16 h-16 rounded-full bg-[var(--color-records)] hover:bg-[var(--color-records)]/90 text-white"
                  >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
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
          {track.description && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {track.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lyrics */}
          {track.lyrics && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Tekst utworu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line font-mono text-sm">
                  {track.lyrics}
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
              <Button
                variant="outline"
                className="w-full border-[var(--color-records)]/30 text-[var(--color-records)] hover:bg-[var(--color-records)]/10 rounded-full"
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart size={18} className={`mr-2 ${isLiked ? 'fill-[var(--color-records)]' : ''}`} />
                {isLiked ? 'Ulubione' : 'Dodaj do ulubionych'}
              </Button>
            </CardContent>
          </Card>

          {/* External Links */}
          {(track.spotify_url || track.youtube_url || track.soundcloud_url) && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Linki zewnętrzne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {track.spotify_url && (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/10 rounded-full justify-start"
                    onClick={() => window.open(track.spotify_url, '_blank')}
                  >
                    <ExternalLink size={18} className="mr-2" />
                    Spotify
                  </Button>
                )}
                {track.youtube_url && (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/10 rounded-full justify-start"
                    onClick={() => window.open(track.youtube_url, '_blank')}
                  >
                    <ExternalLink size={18} className="mr-2" />
                    YouTube
                  </Button>
                )}
                {track.soundcloud_url && (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/10 rounded-full justify-start"
                    onClick={() => window.open(track.soundcloud_url, '_blank')}
                  >
                    <ExternalLink size={18} className="mr-2" />
                    SoundCloud
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Informacje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Wykonawca:</span>
                <span className="text-white">{track.artist}</span>
              </div>
              {track.album && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Album:</span>
                  <span className="text-white">{track.album}</span>
                </div>
              )}
              {track.release_date && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Data wydania:</span>
                  <span className="text-white">{new Date(track.release_date).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Odtworzenia:</span>
                <div className="flex items-center gap-1">
                  <Music size={14} className="text-[var(--color-records)]" />
                  <span className="text-white">{track.plays || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {track.tags && track.tags.length > 0 && (
            <Card className="bg-white/5 border-white/10 rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Tagi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {track.tags.map((tag) => (
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
