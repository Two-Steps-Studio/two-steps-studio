import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/profile/', '/settings/', '/login/', '/dev/game/', '/unity-game/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/profile/', '/settings/', '/login/', '/dev/game/', '/unity-game/'],
      },
    ],
    sitemap: 'https://twostepsstudio.gg/sitemap.xml',
  }
}
