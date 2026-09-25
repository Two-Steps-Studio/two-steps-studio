import { createClient } from "@/lib/supabase-server";
import type { MusicTrack } from "@/types/games-records";
import MusicPageClient from "./MusicPageClient";

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props.
export default async function MusicPage() {
  let initialTracks: MusicTrack[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("music_tracks")
      .select("id, title, artist, album, genre, cover_image_url, duration_seconds, plays, spotify_url, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(200);
    initialTracks = (data || []) as MusicTrack[];
  } catch (error) {
    console.error("Błąd pobierania utworów:", error);
  }

  return <MusicPageClient initialTracks={initialTracks} />;
}
