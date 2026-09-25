import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import NewsDetailClient from "./NewsDetailClient";

type Props = { params: Promise<{ id: string }> };

// cache() dedupes this within a single request, so generateMetadata()
// below and the JSON-LD fetch in the page body share one query instead
// of two.
const getPublicNewsItem = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("news")
    .select("title, content, author, published_at")
    .eq("id", id)
    .single();

  // Same gate /api/news?id= uses for anonymous access - an unpublished
  // (or not-yet-scheduled) item never leaks into a link preview.
  if (!item || !item.published_at || new Date(item.published_at) > new Date()) {
    return null;
  }
  return item;
});

// Server-side metadata so a shared news link (Discord, Twitter, etc.) shows
// a real title/description instead of the site-wide default -
// NewsDetailClient is "use client" and fetches its own data in the
// browser, which link-preview crawlers never execute. Mirrors
// games/[id]/page.tsx's generateMetadata.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const item = await getPublicNewsItem(id);
    if (!item) return {};

    const description = item.content ? item.content.slice(0, 160) : undefined;

    return {
      title: `${item.title} - Two Steps Studio`,
      description,
      openGraph: {
        title: item.title,
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: item.title,
        description,
      },
    };
  } catch {
    return {};
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;

  // Article structured data - the root layout only ever emits a
  // site-wide Organization schema, never anything per-page.
  let jsonLd: Record<string, unknown> | null = null;
  try {
    const item = await getPublicNewsItem(id);
    if (item) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: item.title,
        articleBody: item.content || undefined,
        datePublished: item.published_at,
        author: item.author ? { "@type": "Person", name: item.author } : { "@type": "Organization", name: "Two Steps Studio" },
        publisher: { "@type": "Organization", name: "Two Steps Studio" },
      };
    }
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NewsDetailClient params={params} />
    </>
  );
}
