import { createClient } from "@/lib/supabase-server";
import type { Game } from "@/types/games-records";
import GamesShopPageClient from "./GamesShopPageClient";

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props.
export default async function GamesShopPage() {
  let initialGames: Game[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("games")
      .select("id, title, thumbnail_url, featured, created_at, downloads, developer, short_description, category, status, views, release_date")
      .eq("visibility", "public")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    initialGames = (data || []) as Game[];
  } catch (error) {
    console.error("Błąd pobierania gier:", error);
  }

  return <GamesShopPageClient initialGames={initialGames} />;
}
