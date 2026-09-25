import { getDesktopRelease } from "@/lib/desktop-release-server";
import type { DesktopRelease } from "@/lib/desktop-release";
import DownloadPageClient from "./DownloadPageClient";

// See games/page.tsx for why this moved from a client useEffect(fetch())
// to a server-side fetch passed down as props.
export default async function DownloadPage() {
  let initialRelease: DesktopRelease | null = null;
  let initialStatus: "ready" | "empty" | "error" = "empty";
  try {
    initialRelease = await getDesktopRelease();
    initialStatus = initialRelease ? "ready" : "empty";
  } catch (error) {
    console.error("[desktop-release] page fetch failed:", error);
    initialStatus = "error";
  }

  return <DownloadPageClient initialRelease={initialRelease} initialStatus={initialStatus} />;
}
