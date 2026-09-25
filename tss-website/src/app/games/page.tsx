import { createClient } from "@/lib/supabase-server";
import type { Game } from "@/types/games-records";
import GamesPageClient from "./GamesPageClient";

// Fetched server-side (same visibility=public/status=published gate as
// api/games?visibility=public&status=published) instead of the client
// doing its own useEffect(fetch()) on mount - that used to mean every
// visit to /games showed a loading state, then fired a second round-trip
// to the app's own API route, which then queried Supabase itself. This
// skips that extra hop and lets the catalog render on first paint.
export default async function GamesPage() {
  let initialGames: Game[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("games")
      .select("id, title, thumbnail_url, featured, created_at, downloads")
      .eq("visibility", "public")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    initialGames = (data || []) as Game[];
  } catch (error) {
    console.error("Błąd pobierania gier:", error);
  }

  return <GamesPageClient initialGames={initialGames} />;
}
