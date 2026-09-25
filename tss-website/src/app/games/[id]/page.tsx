import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import GameDetailClient from "./GameDetailClient";

type Props = { params: Promise<{ id: string }> };

// cache() dedupes this within a single request, so generateMetadata()
// below and the JSON-LD fetch in the page body share one query instead
// of two.
const getPublicGame = cache(async (gameId: number) => {
  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("title, short_description, thumbnail_url, banner_url, visibility, status, category, download_url")
    .eq("id", gameId)
    .single();

  // Same gate /api/games?id= uses for anonymous access - only a public,
  // published game gets rich sharing metadata / structured data, so a
  // private/draft game's title never leaks into a link preview.
  if (!game || game.visibility !== "public" || game.status !== "published") {
    return null;
  }
  return game;
});

// Server-side metadata so a link to a specific game (shared on Discord,
// Twitter, etc.) shows a real title/description/image instead of the
// site-wide default - GameDetailClient is "use client" and fetches its own
// data in the browser, which link-preview crawlers never execute.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (Number.isNaN(gameId)) return {};

  try {
    const game = await getPublicGame(gameId);
    if (!game) return {};

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

export default async function GameDetailPage({ params }: Props) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  // VideoGame structured data - the root layout only ever emits a
  // site-wide Organization schema (see generateJsonLd() there), never
  // anything per-page, so game detail pages - this site's actual public
  // product catalog - had zero eligibility for rich results (ratings,
  // platform, etc.) in search.
  let jsonLd: Record<string, unknown> | null = null;
  if (!Number.isNaN(gameId)) {
    try {
      const game = await getPublicGame(gameId);
      if (game) {
        jsonLd = {
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: game.title,
          description: game.short_description || undefined,
          image: game.banner_url || game.thumbnail_url || undefined,
          genre: game.category || undefined,
          applicationCategory: "Game",
          ...(game.download_url ? { offers: { "@type": "Offer", url: game.download_url, price: "0", priceCurrency: "PLN" } } : {}),
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
      <GameDetailClient params={params} />
    </>
  );
}
