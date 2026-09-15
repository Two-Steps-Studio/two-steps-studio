import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import GameDetailClient from "./GameDetailClient";

type Props = { params: Promise<{ id: string }> };

// Server-side metadata so a link to a specific game (shared on Discord,
// Twitter, etc.) shows a real title/description/image instead of the
// site-wide default - GameDetailClient is "use client" and fetches its own
// data in the browser, which link-preview crawlers never execute.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (Number.isNaN(gameId)) return {};

  try {
    const supabase = await createClient();
    const { data: game } = await supabase
      .from("games")
      .select("title, short_description, thumbnail_url, banner_url, visibility, status")
      .eq("id", gameId)
      .single();

    // Same gate /api/games?id= uses for anonymous access - only a public,
    // published game gets rich sharing metadata, so a private/draft game's
    // title never leaks into a link preview.
    if (!game || game.visibility !== "public" || game.status !== "published") {
      return {};
    }

    const image = game.banner_url || game.thumbnail_url || undefined;

    return {
      title: `${game.title} - Two Steps Studio`,
      description: game.short_description || undefined,
      openGraph: {
        title: game.title,
        description: game.short_description || undefined,
        images: image ? [{ url: image }] : undefined,
        type: "website",
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: game.title,
        description: game.short_description || undefined,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default function GameDetailPage({ params }: Props) {
  return <GameDetailClient params={params} />;
}
