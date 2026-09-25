import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import PodcastDetailClient from "./PodcastDetailClient";

type Props = { params: Promise<{ id: string }> };

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
    const supabase = await createClient();
    const { data: podcast } = await supabase
      .from("podcasts")
      .select("title, description, thumbnail_url, visibility")
      .eq("id", podcastId)
      .single();

    // Same gate /api/podcasts?id= uses for anonymous access - a private/
    // unlisted podcast's title never leaks into a link preview.
    if (!podcast || podcast.visibility !== "public") {
      return {};
    }

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

export default function PodcastDetailPage({ params }: Props) {
  return <PodcastDetailClient params={params} />;
}
