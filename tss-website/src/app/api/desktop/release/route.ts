import { NextResponse } from "next/server";
import { getDesktopRelease } from "@/lib/desktop-release-server";

// Manifest read logic lives in lib/desktop-release-server.ts, shared with
// download/page.tsx's server-side initial fetch. Written by
// scripts/publish-desktop-release.mjs.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const release = await getDesktopRelease();
    if (!release) {
      return NextResponse.json(
        { release: null, reason: "not-published" },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }
    return NextResponse.json(
      { release },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    console.error("[desktop-release] failed to read manifest", error);
    return NextResponse.json({ release: null, reason: "error" }, { status: 500 });
  }
}
