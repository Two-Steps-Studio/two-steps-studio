"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, Play, ShoppingCart, Filter, Check, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-translation";

type BeatTier = "free" | "basic" | "premium" | "unlimited" | "exclusive";

interface BeatPackage {
  tier: BeatTier;
  price: number;
  description: string;
  features: string[];
  stripe_price_id?: string;
}

interface Beat {
  id: string;
  title: string;
  description?: string;
  bpm?: number;
  key?: string;
  duration?: number;
  audio_url?: string;
  preview_url?: string;
  cover_image?: string;
  packages: BeatPackage[];
  status: "available" | "sold" | "reserved";
  upload_date?: string;
}

const TIERS: BeatTier[] = ["free", "basic", "premium", "unlimited", "exclusive"];

export default function BeatyPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const TIER_CONFIG: Record<BeatTier, { label: string; color: string; bgColor: string; description: string; borderColor: string }> = {
    free: {
      label: "Free",
      color: "text-zinc-400",
      bgColor: "bg-zinc-500/10",
      borderColor: "border-zinc-500/30",
      description: t.recordsBeats.tierDescFree,
    },
    basic: {
      label: "Basic",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      description: t.recordsBeats.tierDescBasic,
    },
    premium: {
      label: "Premium",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
      description: t.recordsBeats.tierDescPremium,
    },
    unlimited: {
      label: "Unlimited",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      description: t.recordsBeats.tierDescUnlimited,
    },
    exclusive: {
      label: "Exclusive",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      description: t.recordsBeats.tierDescExclusive,
    },
  };

  const DEFAULT_PACKAGES: Record<BeatTier, string[]> = {
    free: [t.recordsBeats.featFreeNonCommercial, t.recordsBeats.featFreeStreamOnly, t.recordsBeats.featFreeNoDistribution],
    basic: [t.recordsBeats.featCommercial, t.recordsBeats.featUpTo100k, t.recordsBeats.featOneProject],
    premium: [t.recordsBeats.featCommercial, t.recordsBeats.featUpTo500k, t.recordsBeats.featThreeProjects, t.recordsBeats.featWav],
    unlimited: [t.recordsBeats.featCommercial, t.recordsBeats.featUnlimitedStreams, t.recordsBeats.featUnlimitedProjects, t.recordsBeats.featWavStems],
    exclusive: [t.recordsBeats.featFullCopyright, t.recordsBeats.featRemovedFromStore, t.recordsBeats.featAllFormats, t.recordsBeats.featPrioritySupport],
  };

  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<BeatTier | "all">("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Sprawdź czy użytkownik wrócił po płatności
    if (searchParams.get("success")) {
      toast.success(t.recordsBeats.paymentSuccess);
    }
    if (searchParams.get("canceled")) {
      toast.error(t.recordsBeats.paymentCanceled);
    }

    fetchBeats();
  }, []);

  const fetchBeats = async () => {
    try {
      const res = await fetch("/api/beaty");
      const data = await res.json();
      setBeats(data || []);
    } catch (error) {
      console.error("Błąd pobierania beatów:", error);
      toast.error("Nie udało się załadować beatów");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (beat: Beat, pkg: BeatPackage) => {
    if (pkg.tier === "free") {
      const downloadUrl = beat.audio_url || beat.preview_url;
      if (!downloadUrl) {
        toast.error(t.recordsBeats.noPreviewAvailable);
        return;
      }
      toast.info(t.recordsBeats.downloadingFree);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${beat.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatId: beat.id,
          beatTitle: beat.title,
          price: pkg.price,
          tier: pkg.tier,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(t.recordsBeats.checkoutError);
      }
    } catch (error) {
      console.error("Błąd płatności:", error);
      toast.error(t.recordsBeats.paymentError);
    }
  };

  const handlePlay = (beat: Beat) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === beat.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    const src = beat.preview_url || beat.audio_url;
    if (!src) {
      toast.error(t.recordsBeats.noPreviewAvailable);
      return;
    }

    audio.src = src;
    audio.play().catch(() => toast.error(t.recordsBeats.noPreviewAvailable));
    setPlayingId(beat.id);
  };

  const filteredBeats = selectedTier === "all"
    ? beats
    : beats.filter((beat) => beat.packages.some((p) => p.tier === selectedTier));

  return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
        {/* Hero Section */}
        <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
          <img 
              src="/assets/HeroSection/records-beats.avif" 
              alt="" 
              className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-records)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-records)]/20 blur-3xl animate-pulse" />

          <div className="relative z-10 space-y-4 text-center">
            <h1 className="text-5xl md:text-8xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
              {/* TODO: Add translation */}
              <span className="text-[var(--color-records)]">Beats</span>
            </h1>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { name: t.recordsBeats.navRecords, href: "/records" },
          { name: t.recordsBeats.navPodcasts, href: "/records/podcasts" },
          { name: t.recordsBeats.navMusic, href: "/records/music"}
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

      {/* Filtry tierów */}
      <div className="mb-8 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mr-4">
          <Filter size={16} />
          <span>{t.recordsBeats.filterLabel}</span>
        </div>
        <Button
          variant={selectedTier === "all" ? "default" : "outline"}
          onClick={() => setSelectedTier("all")}
          className={`rounded-full ${
            selectedTier === "all"
              ? "bg-[var(--color-records)] text-white"
              : "border-white/10 text-zinc-400 hover:text-white"
          }`}
        >
          {t.recordsBeats.allTiers}
        </Button>
        {TIERS.map((tier) => (
          <Button
            key={tier}
            variant={selectedTier === tier ? "default" : "outline"}
            onClick={() => setSelectedTier(tier)}
            className={`rounded-full ${
              selectedTier === tier
                ? `${TIER_CONFIG[tier].bgColor} ${TIER_CONFIG[tier].color} border-0`
                : "border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            {TIER_CONFIG[tier].label}
          </Button>
        ))}
      </div>

      {/* Lista beatów */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card
              key={i}
              className="rounded-[2.5rem] bg-black/40 border border-white/10 animate-pulse h-80"
            />
          ))}
        </div>
      ) : filteredBeats.length === 0 ? (
        <Card className="w-full glass rounded-[2.5rem] shadow-2xl">
          <CardContent className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">{t.recordsBeats.emptyTitle}</h2>
            <p className="text-zinc-400">
              {selectedTier === "all"
                ? t.recordsBeats.emptyNone
                : `${t.recordsBeats.emptyCategoryPrefix}${TIER_CONFIG[selectedTier].label}${t.recordsBeats.emptyCategorySuffix}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredBeats.map((beat) => (
            <Card
              key={beat.id}
              className={`group relative overflow-hidden rounded-[2.5rem] bg-black/40 border border-white/10 transition-all duration-500 ${
                beat.status !== "available" ? "opacity-50 grayscale" : "hover:border-[var(--color-records)]"
              }`}
            >
              {/* Header beatu */}
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {beat.cover_image ? (
                      <img
                        src={beat.cover_image}
                        alt={beat.title}
                        className="h-16 w-16 rounded-2xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl border border-white/10 bg-[var(--color-records)]/10 flex items-center justify-center">
                        <Music className="h-6 w-6 text-[var(--color-records)]" />
                      </div>
                    )}
                    {/* Was a fully-active-looking play button regardless of
                        whether there's actually anything to play - clicking
                        it just fired an error toast, which reads as broken
                        rather than "no preview yet". Beats can be published
                        with no audio attached (no upload requirement in the
                        admin form), so this needs to look intentional. */}
                    {beat.preview_url || beat.audio_url ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlay(beat)}
                        className="h-12 w-12 rounded-full bg-[var(--color-records)]/10 text-[var(--color-records)] hover:bg-[var(--color-records)]/20"
                      >
                        <Play size={20} className={playingId === beat.id ? "fill-current" : ""} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        title={t.recordsBeats.noPreviewAvailable}
                        className="h-12 w-12 rounded-full bg-white/5 text-zinc-500 opacity-60"
                      >
                        <VolumeX size={20} />
                      </Button>
                    )}
                    <div>
                      <CardTitle className="text-2xl font-bold text-white font-[family-name:var(--font-space)]">
                        {beat.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-zinc-500 font-[family-name:var(--font-outfit)] text-sm mt-1">
                        <Calendar size={14} />
                        {t.recordsBeats.addedLabel}{beat.upload_date ? new Date(beat.upload_date).toLocaleDateString() : t.recordsBeats.recentlyFallback}
                        {beat.bpm && <span className="mx-2">•</span>}
                        {beat.bpm && <span className="text-zinc-400">{beat.bpm} {t.recordsBeats.bpmUnit}</span>}
                        {beat.key && <span className="mx-2">•</span>}
                        {beat.key && <span className="text-zinc-400">{beat.key}</span>}
                      </CardDescription>
                    </div>
                  </div>
                  {beat.description && (
                    <p className="text-zinc-400 text-sm max-w-md font-[family-name:var(--font-outfit)]">
                      {beat.description}
                    </p>
                  )}
                </div>
              </CardHeader>

              {/* Pakiety */}
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {beat.packages.map((pkg) => {
                    const config = TIER_CONFIG[pkg.tier];
                    return (
                      <div
                        key={pkg.tier}
                        className={`relative rounded-2xl border p-4 transition-all hover:scale-[1.02] ${config.bgColor} ${config.borderColor}`}
                      >
                        {/* Label */}
                        <div className={`text-sm font-bold ${config.color} mb-1`}>{config.label}</div>

                        {/* Cena */}
                        <div className="text-2xl font-black text-white mb-2">
                          {pkg.price === 0 ? t.recordsBeats.freePriceLabel : `${pkg.price} ${t.recordsBeats.currencySuffix}`}
                        </div>

                        {/* Opis */}
                        <p className="text-xs text-zinc-400 mb-3">{pkg.description}</p>

                        {/* Features */}
                        <ul className="space-y-1.5 mb-4">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                              <Check size={12} className={`shrink-0 mt-0.5 ${config.color}`} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Przycisk */}
                        <Button
                          onClick={() => handleBuy(beat, pkg)}
                          disabled={beat.status !== "available"}
                          className={`w-full rounded-xl font-bold ${
                            pkg.tier === "free"
                              ? "bg-zinc-700 text-white hover:bg-zinc-600"
                              : "bg-[var(--color-records)] text-white hover:bg-[var(--color-records)]/80"
                          }`}
                          size="sm"
                        >
                          {pkg.tier === "free" ? t.recordsBeats.buyFree : t.recordsBeats.buyPaid}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info o tierach */}
      <div className="mt-12 p-8 rounded-[2rem] bg-black/40 border border-white/10">
        <h3 className="text-2xl font-bold text-white mb-6 font-[family-name:var(--font-space)]">
          {t.recordsBeats.licenseInfoTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIERS.map((tier) => {
            const config = TIER_CONFIG[tier];
            const features = DEFAULT_PACKAGES[tier];
            return (
              <div
                key={tier}
                className={`p-4 rounded-xl ${config.bgColor} border border-white/5`}
              >
                <h4 className={`font-bold mb-2 ${config.color}`}>
                  {config.label}
                </h4>
                <p className="text-xs text-zinc-400 mb-3">{config.description}</p>
                <ul className="space-y-1">
                  {features.map((f, i) => (
                    <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                      <Check size={10} className={`shrink-0 mt-0.5 ${config.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

