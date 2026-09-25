import { Suspense } from "react";
import { getBeats, type Beat } from "@/lib/beats";
import BeatsPageClient from "./BeatsPageClient";

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props. Wrapped in Suspense because
// BeatsPageClient reads useSearchParams() (for the Stripe success/canceled
// redirect toast), which Next.js requires a Suspense boundary for.
export default async function BeatyPage() {
  let initialBeats: Beat[] = [];
  try {
    initialBeats = await getBeats();
  } catch (error) {
    console.error("Błąd pobierania beatów:", error);
  }

  return (
    <Suspense>
      <BeatsPageClient initialBeats={initialBeats} />
    </Suspense>
  );
}
