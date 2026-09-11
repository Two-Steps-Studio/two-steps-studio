import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Discord avatar URLs failed to load as <img src> directly from this site's
// origin (verified live: the exact same URL loads fine navigated to
// directly or embedded from discordapp.com itself, but fails - no network
// request even completes - when embedded on twostepsstudio.gg, despite
// this site's CSP img-src explicitly allowing https: sources). Proxying
// through our own origin sidesteps whatever cross-origin restriction is at
// play, since the browser then only ever loads from 'self'.
//
// Host allowlist prevents this becoming an open image-fetching proxy for
// arbitrary URLs (SSRF risk) - only Discord's own CDN hosts are permitted.
const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/png",
        // Discord avatar hashes change the URL when the avatar changes, so
        // this is safe to cache aggressively at both the browser and CDN.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (err) {
    console.error("[avatar-proxy] fetch failed:", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
