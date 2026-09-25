import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'

// Dynamic detail pages (games/[id], records/music/[id], news/[id],
// records/podcasts/[id]) - the actual majority of the site's indexable
// content - were never queried here, only the static section pages
// below. Missing from the sitemap means no sitemap-driven priority/
// freshness signal, and an unfeatured/older item with few internal links
// pointing at it may simply never get crawled at all.
async function getDynamicUrls(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient()

    const [games, tracks, podcasts, news] = await Promise.all([
      supabase.from('games').select('id, updated_at')
        .eq('visibility', 'public').eq('status', 'published'),
      supabase.from('music_tracks').select('id, updated_at')
        .eq('visibility', 'public'),
      supabase.from('podcasts').select('id, updated_at')
        .eq('visibility', 'public'),
      supabase.from('news').select('id, published_at')
        .not('published_at', 'is', null).lte('published_at', new Date().toISOString()),
    ])

    return [
      ...(games.data || []).map((g) => ({
        url: `${baseUrl}/games/${g.id}`,
        lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...(tracks.data || []).map((t) => ({
        url: `${baseUrl}/records/music/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
      ...(podcasts.data || []).map((p) => ({
        url: `${baseUrl}/records/podcasts/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
      ...(news.data || []).map((n) => ({
        url: `${baseUrl}/news/${n.id}`,
        lastModified: n.published_at ? new Date(n.published_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ]
  } catch (error) {
    console.error('[sitemap] dynamic URL fetch failed:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://twostepsstudio.gg'
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: tomorrow,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/records`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dev`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      // Canonical services page - /services redirects here (see
      // next.config.ts).
      url: `${baseUrl}/dev/services`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dev/about`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/dev/recruitment`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/games/about`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/games/shop`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/records/beats`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/records/music`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/records/podcasts`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/recruitment`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/download`,
      lastModified: today,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: today,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms/regulations`,
      lastModified: today,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: today,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  const dynamicUrls = await getDynamicUrls(baseUrl)

  return [...staticUrls, ...dynamicUrls]
}
