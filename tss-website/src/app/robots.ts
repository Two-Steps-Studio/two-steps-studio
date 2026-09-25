import { MetadataRoute } from 'next'

// proxy.ts's protectedRoutes list is /profile, /settings, /notifications -
// notifications was missing here, an inconsistency that let crawlers spend
// budget on a route that just redirects unauthenticated visitors.
// /dashboard and /translations aren't auth-gated at all (confirmed - no
// useAuth/redirect in either), but are internal tooling (live community
// stats, an i18n string admin panel) with no reason to be indexed.
const DISALLOW = ['/api/', '/admin/', '/_next/', '/profile/', '/settings/', '/notifications/', '/login/', '/dev/game/', '/unity-game/', '/dashboard/', '/translations/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: 'https://twostepsstudio.gg/sitemap.xml',
  }
}
