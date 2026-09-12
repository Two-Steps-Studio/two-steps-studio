// Discord CDN avatar URLs fail to load as a direct <img src>/AvatarImage on
// this site specifically (verified live: the same URL loads fine navigated
// to directly or embedded from discordapp.com itself, but fails - no
// network request even completes - from twostepsstudio.gg, despite this
// site's CSP img-src explicitly allowing https: sources). Routing through
// our own origin (api/avatar-proxy/route.ts) sidesteps it. First fixed only
// on the dashboard's leaderboard avatars; TopBar, MobileHeader, and the
// profile page all had the same unproxied src and the same silent failure.
//
// Only Discord CDN URLs get proxied - a custom-uploaded avatar (Supabase
// Storage, a different host) already loads fine directly, and
// avatar-proxy's own host allowlist would just 400 it if we routed it
// through anyway.
const DISCORD_CDN_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export function toProxiedAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && DISCORD_CDN_HOSTS.has(parsed.hostname)) {
      return `/api/avatar-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // Not a valid absolute URL (e.g. a relative path) - fall through to
    // using it as-is.
  }
  return url;
}
