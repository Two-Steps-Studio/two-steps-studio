import { createClient } from "@/lib/supabase-server";
import type { Podcast } from "@/types/games-records";
import PodcastsPageClient from "./PodcastsPageClient";

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props.
export default async function PodcastyPage() {
  let initialPodcasts: Podcast[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("podcasts")
      .select("id, title, description, host, season, episode_number, thumbnail_url, published_date, plays, featured, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(200);
    initialPodcasts = (data || []) as Podcast[];
  } catch (error) {
    console.error("Błąd pobierania podcastów:", error);
  }

  return <PodcastsPageClient initialPodcasts={initialPodcasts} />;
}
