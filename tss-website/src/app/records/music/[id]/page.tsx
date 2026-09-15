import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import MusicDetailClient from "./MusicDetailClient";

type Props = { params: Promise<{ id: string }> };

// Server-side metadata so a link to a specific track (shared on Discord,
// Twitter, etc.) shows a real title/description/cover image instead of the
// site-wide default - MusicDetailClient is "use client" and fetches its
// own data in the browser, which link-preview crawlers never execute.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trackId = parseInt(id, 10);
  if (Number.isNaN(trackId)) return {};

  try {
    const supabase = await createClient();
    const { data: track } = await supabase
      .from("music_tracks")
      .select("title, artist, description, cover_image_url, visibility")
      .eq("id", trackId)
      .single();

    // Same gate /api/music?id= uses for anonymous access - only a public
    // track gets rich sharing metadata.
    if (!track || track.visibility !== "public") {
      return {};
    }

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

export default function MusicDetailPage({ params }: Props) {
  return <MusicDetailClient params={params} />;
}
