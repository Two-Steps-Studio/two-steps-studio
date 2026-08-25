"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic2, Calendar, Search, Filter, Play } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Podcast } from "@/types/games-records";
import { useLanguage } from "@/hooks/use-translation";

export default function PodcastyPage() {
  const { t } = useLanguage();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<number | "all">("all");

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const res = await fetch("/api/podcasts?visibility=public");
      const data = await res.json();
      setPodcasts(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania podcastów:", error);
      toast.error(t.recordsPodcasts.loadError);
    } finally {
      setLoading(false);
    }
  };

  const filteredPodcasts = podcasts.filter((podcast) => {
    const matchesSearch =
      searchQuery === "" ||
      podcast.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.host?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeason =
      selectedSeason === "all" || podcast.season === selectedSeason;

    return matchesSearch && matchesSeason;
  });

  const seasons = Array.from(new Set(podcasts.map((p) => p.season))).sort((a, b) => a - b);

  return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        {/* Hero Section */}
        <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
          <img
              src="/assets/HeroSection/records-podcast.avif"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-records)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-records)]/20 blur-3xl animate-pulse" />

        <div className="relative z-10 space-y-4 text-center">
          <Badge className="bg-[var(--color-records)]/20 text-[var(--color-records)] hover:bg-[var(--color-records)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
            {t.recordsPodcasts.badge}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
           <span className="text-[var(--color-records)]">{t.recordsPodcasts.title}</span>
          </h1>
          <p className="text-white max-w-2xl font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
            {t.recordsPodcasts.subtitle}
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { name: t.recordsPodcasts.navRecords, href: "/records" },
          { name: t.recordsPodcasts.navBeats, href: "/records/beats" },
          { name: t.recordsPodcasts.navMusic, href: "/records/music"}
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
            placeholder={t.recordsPodcasts.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-black/40 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>

        {seasons.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mr-4">
              <Filter size={16} />
              <span>{t.recordsPodcasts.seasonLabel}</span>
            </div>
            <Button
              variant={selectedSeason === "all" ? "default" : "outline"}
              onClick={() => setSelectedSeason("all")}
              className={`rounded-full ${
                selectedSeason === "all"
                  ? "bg-[var(--color-records)] text-white"
                  : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {t.recordsPodcasts.allSeasons}
            </Button>
            {seasons.map((season) => (
              <Button
                key={season}
                variant={selectedSeason === season ? "default" : "outline"}
                onClick={() => setSelectedSeason(season)}
                className={`rounded-full ${
                  selectedSeason === season
                    ? "bg-[var(--color-records)] text-white"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {`${t.recordsPodcasts.seasonPrefix}${season}`}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Podcasts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card
              key={i}
              className="rounded-[2rem] bg-black/40 border border-white/10 animate-pulse h-64"
            />
          ))}
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <Card className="w-full rounded-[2.5rem] bg-black/40 border border-white/10">
          <CardContent className="p-12 text-center">
            <Mic2 className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">{t.recordsPodcasts.emptyTitle}</h2>
            <p className="text-zinc-400">
              {searchQuery || selectedSeason !== "all"
                ? t.recordsPodcasts.emptyFiltered
                : t.recordsPodcasts.emptyNone}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPodcasts.map((podcast) => (
            <Card
              key={podcast.id}
              className="group relative overflow-hidden rounded-[2rem] bg-black/40 border border-white/10 hover:border-[var(--color-records)] transition-all duration-300 hover:-translate-y-1"
            >
              {podcast.thumbnail_url && (
                <div className="h-48 overflow-hidden bg-white/5">
                  <img
                    src={podcast.thumbnail_url}
                    alt={podcast.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl font-bold text-white font-[family-name:var(--font-space)] line-clamp-2">
                    {podcast.title}
                  </CardTitle>
                  {podcast.featured && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs shrink-0">
                      {t.recordsPodcasts.featuredBadge}
                    </Badge>
                  )}
                </div>
                {podcast.host && (
                  <CardDescription className="text-zinc-400 font-[family-name:var(--font-outfit)] text-sm">
                    {podcast.host}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {podcast.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2 font-[family-name:var(--font-outfit)]">
                    {podcast.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {podcast.season && (
                    <Badge variant="secondary" className="bg-[var(--color-records)]/10 text-[var(--color-records)] border border-[var(--color-records)]/20 text-xs">
                      {`${t.recordsPodcasts.seasonPrefix}${podcast.season}`}
                    </Badge>
                  )}
                  {podcast.episode_number && (
                    <span>{`${t.recordsPodcasts.episodePrefix}${podcast.episode_number}`}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>
                      {podcast.published_date
                        ? new Date(podcast.published_date).toLocaleDateString()
                        : t.recordsPodcasts.recentlyFallback}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play size={12} />
                    <span>{podcast.plays || 0}</span>
                  </div>
                </div>

                <Link href={`/records/podcasts/${podcast.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-[var(--color-records)]/30 text-[var(--color-records)] hover:bg-[var(--color-records)]/10 rounded-xl"
                  >
                    {t.recordsPodcasts.play}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

