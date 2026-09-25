import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import MusicDetailClient from "./MusicDetailClient";

type Props = { params: Promise<{ id: string }> };

// cache() dedupes this within a single request, so generateMetadata()
// below and the JSON-LD fetch in the page body share one query instead
// of two.
const getPublicTrack = cache(async (trackId: number) => {
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("music_tracks")
    .select("title, artist, album, genre, description, cover_image_url, duration_seconds, visibility")
    .eq("id", trackId)
    .single();

  // Same gate /api/music?id= uses for anonymous access - only a public
  // track gets rich sharing metadata / structured data.
  if (!track || track.visibility !== "public") return null;
  return track;
});

// Server-side metadata so a link to a specific track (shared on Discord,
// Twitter, etc.) shows a real title/description/cover image instead of the
// site-wide default - MusicDetailClient is "use client" and fetches its
// own data in the browser, which link-preview crawlers never execute.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trackId = parseInt(id, 10);
  if (Number.isNaN(trackId)) return {};

  try {
    const track = await getPublicTrack(trackId);
    if (!track) return {};

    const title = track.artist ? `${track.title} - ${track.artist}` : track.title;
    const description = track.description || (track.artist ? `${track.artist} - Two Steps Studio Records` : undefined);
    const image = track.cover_image_url || undefined;

    return {
      title: `${title} - Two Steps Studio`,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : undefined,
        type: "music.song",
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function MusicDetailPage({ params }: Props) {
  const { id } = await params;
  const trackId = parseInt(id, 10);

  // MusicRecording structured data - the root layout only ever emits a
  // site-wide Organization schema, never anything per-page.
  let jsonLd: Record<string, unknown> | null = null;
  if (!Number.isNaN(trackId)) {
    try {
      const track = await getPublicTrack(trackId);
      if (track) {
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: track.title,
          byArtist: track.artist ? { "@type": "MusicGroup", name: track.artist } : undefined,
          inAlbum: track.album ? { "@type": "MusicAlbum", name: track.album } : undefined,
          genre: track.genre || undefined,
          duration: track.duration_seconds ? `PT${track.duration_seconds}S` : undefined,
          image: track.cover_image_url || undefined,
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
      <MusicDetailClient params={params} />
    </>
  );
}
