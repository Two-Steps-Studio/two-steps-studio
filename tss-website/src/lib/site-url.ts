// Public base URL of the site, used for Stripe success/cancel URLs.
// NEXT_PUBLIC_APP_URL is the variable the rest of the app already uses;
// NEXT_PUBLIC_SITE_URL is accepted as an alias, and the request's own origin
// is the last resort so a missing env var never produces "undefined/...".
export function getSiteUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  return (configured || new URL(req.url).origin).replace(/\/$/, "");
}
