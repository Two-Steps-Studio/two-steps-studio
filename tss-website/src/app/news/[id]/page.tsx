import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import NewsDetailClient from "./NewsDetailClient";

type Props = { params: Promise<{ id: string }> };

// Server-side metadata so a shared news link (Discord, Twitter, etc.) shows
// a real title/description instead of the site-wide default -
// NewsDetailClient is "use client" and fetches its own data in the
// browser, which link-preview crawlers never execute. Mirrors
// games/[id]/page.tsx's generateMetadata.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: item } = await supabase
      .from("news")
      .select("title, content, published_at")
      .eq("id", id)
      .single();

    // Same gate /api/news?id= uses for anonymous access - an unpublished
    // (or not-yet-scheduled) item never leaks into a link preview.
    if (!item || !item.published_at || new Date(item.published_at) > new Date()) {
      return {};
    }

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

export default function NewsDetailPage({ params }: Props) {
  return <NewsDetailClient params={params} />;
}
