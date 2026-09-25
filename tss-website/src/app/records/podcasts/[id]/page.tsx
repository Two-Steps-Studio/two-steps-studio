import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import PodcastDetailClient from "./PodcastDetailClient";

type Props = { params: Promise<{ id: string }> };

// cache() dedupes this within a single request, so generateMetadata()
// below and the JSON-LD fetch in the page body share one query instead
// of two.
const getPublicPodcast = cache(async (podcastId: number) => {
  const supabase = await createClient();
  const { data: podcast } = await supabase
    .from("podcasts")
    .select("title, description, host, season, episode_number, thumbnail_url, audio_file_url, duration_seconds, published_date, visibility")
    .eq("id", podcastId)
    .single();

  // Same gate /api/podcasts?id= uses for anonymous access - a private/
  // unlisted podcast's title never leaks into a link preview.
  if (!podcast || podcast.visibility !== "public") return null;
  return podcast;
});

// Server-side metadata so a shared podcast link (Discord, Twitter, etc.)
// shows a real title/description instead of the site-wide default -
// PodcastDetailClient is "use client" and fetches its own data in the
// browser, which link-preview crawlers never execute. Mirrors
// games/[id]/page.tsx's generateMetadata - this page had no split (and
// so no real metadata) at all before.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const podcastId = parseInt(id, 10);
  if (Number.isNaN(podcastId)) return {};

  try {
    const podcast = await getPublicPodcast(podcastId);
    if (!podcast) return {};

    return {
      title: `${podcast.title} - Two Steps Studio`,
      description: podcast.description || undefined,
      openGraph: {
        title: podcast.title,
        description: podcast.description || undefined,
        images: podcast.thumbnail_url ? [{ url: podcast.thumbnail_url }] : undefined,
        type: "website",
      },
      twitter: {
        card: podcast.thumbnail_url ? "summary_large_image" : "summary",
        title: podcast.title,
        description: podcast.description || undefined,
        images: podcast.thumbnail_url ? [podcast.thumbnail_url] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function PodcastDetailPage({ params }: Props) {
  const { id } = await params;
  const podcastId = parseInt(id, 10);

  // PodcastEpisode structured data - the root layout only ever emits a
  // site-wide Organization schema, never anything per-page.
  let jsonLd: Record<string, unknown> | null = null;
  if (!Number.isNaN(podcastId)) {
    try {
      const podcast = await getPublicPodcast(podcastId);
      if (podcast) {
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "PodcastEpisode",
          name: podcast.title,
          description: podcast.description || undefined,
          image: podcast.thumbnail_url || undefined,
          datePublished: podcast.published_date || undefined,
          episodeNumber: podcast.episode_number || undefined,
          seasonNumber: podcast.season || undefined,
          duration: podcast.duration_seconds ? `PT${podcast.duration_seconds}S` : undefined,
          associatedMedia: podcast.audio_file_url ? { "@type": "MediaObject", contentUrl: podcast.audio_file_url } : undefined,
          partOfSeries: { "@type": "PodcastSeries", name: "Two Steps Studio Podcast" },
        };
      }
    } catch {
      jsonLd = null;
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PodcastDetailClient params={params} />
    </>
  );
}
