import { createClient } from "@/lib/supabase-server";
import NewsPageClient from "./NewsPageClient";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  author?: string;
}

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props. Same published_at gate
// api/news/route.ts's GET already enforces.
export default async function NewsPage() {
  let initialNews: NewsItem[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("news")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(10);
    initialNews = (data || []) as NewsItem[];
  } catch (error) {
    console.error("Błąd pobierania newsów:", error);
  }

  return <NewsPageClient initialNews={initialNews} />;
}
