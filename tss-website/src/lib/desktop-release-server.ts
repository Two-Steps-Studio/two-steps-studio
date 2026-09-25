import { createServiceClient } from "@/lib/supabase-server";
import {
  DESKTOP_RELEASES_BUCKET,
  DESKTOP_RELEASE_MANIFEST,
  isDesktopRelease,
  type DesktopRelease,
} from "@/lib/desktop-release";

// Separate from lib/desktop-release.ts (which download/page.tsx's client
// half also imports for types/formatBytes) so that file stays free of
// server-only imports - createServiceClient() pulls in next/headers, which
// Next.js refuses to bundle into a "use client" file even if the specific
// export using it isn't the one imported.
//
// Shared between api/desktop/release/route.ts (the desktop app's own
// update check needs a JSON endpoint) and download/page.tsx (server-
// rendered initial state), same reasoning as lib/beats.ts.
export async function getDesktopRelease(): Promise<DesktopRelease | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(DESKTOP_RELEASES_BUCKET)
    .download(DESKTOP_RELEASE_MANIFEST);

  if (error || !data) {
    // No release published yet is a normal state, not a failure.
    return null;
  }

  const parsed: unknown = JSON.parse(await data.text());
  if (!isDesktopRelease(parsed)) {
    console.error("[desktop-release] invalid manifest");
    return null;
  }

  return parsed;
}
