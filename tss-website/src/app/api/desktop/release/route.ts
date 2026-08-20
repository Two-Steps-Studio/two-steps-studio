import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import {
  DESKTOP_RELEASES_BUCKET,
  DESKTOP_RELEASE_MANIFEST,
  isDesktopRelease,
} from "@/lib/desktop-release";

// The manifest is written by scripts/publish-desktop-release.mjs. Reading it
// through the service client keeps the bucket free to be private later without
// changing the website; nothing user-supplied reaches Storage here.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(DESKTOP_RELEASES_BUCKET)
      .download(DESKTOP_RELEASE_MANIFEST);

    if (error || !data) {
      // No release published yet is a normal state, not a failure.
      return NextResponse.json(
        { release: null, reason: "not-published" },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    const parsed: unknown = JSON.parse(await data.text());
    if (!isDesktopRelease(parsed)) {
      return NextResponse.json({ release: null, reason: "invalid-manifest" }, { status: 500 });
    }

    return NextResponse.json(
      { release: parsed },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    console.error("[desktop-release] failed to read manifest", error);
    return NextResponse.json({ release: null, reason: "error" }, { status: 500 });
  }
}
