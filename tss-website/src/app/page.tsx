import { createClient } from "@/lib/supabase-server";
import { HomeClient } from "@/components/home-client";

// See games/page.tsx for why the homepage's news section moved from a
// client useEffect(fetch()) to a server-side fetch passed down as props -
// same published_at gate and limit api/news/route.ts's GET already used.
export default async function Home() {
  let initialNews: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("news")
      .select("id, title, content, image_url, category, published_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(10);
    initialNews = data || [];
  } catch (error) {
    console.error("Błąd pobierania newsów:", error);
  }

  return <HomeClient initialNews={initialNews} />;
}
