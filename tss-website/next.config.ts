import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, "src/visual-edits/component-tagger-loader.js");
const isElectron = process.env.ELECTRON === 'true';

const nextConfig: NextConfig = {
  turbopack: {},
  // The desktop build ships a self-contained Node server (`.next/standalone`)
  // that Electron boots with its own bundled Node, so the packaged app needs
  // neither a Node install on the user's machine nor the full node_modules tree.
  output: isElectron ? 'standalone' : undefined,
  // C:/tss has its own package.json + lockfile, so Next would otherwise infer
  // the monorepo root and nest the output under .next/standalone/tss-website.
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: isElectron,
    // SECURITY: `/_next/image` is a public endpoint that fetches whatever
    // URL it's given -- wildcarding remotePatterns to '**' (any host, http
    // included) turned the image optimizer into an open fetcher/proxy
    // reachable by anyone, not just through images the app itself renders.
    // The only external <Image> sources in the app are Supabase Storage
    // URLs (avatars, game/music/podcast covers); scope to that.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
          {
            key: 'Content-Type',
            value: 'application/xml',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'",
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.jsdelivr.io https://va.vercel-scripts.com https://www.googletagmanager.com https://*.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.supabase.co https://*.supabase.co wss: https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com",
              "frame-src 'self' https://lottiefiles.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), camera=(), microphone=(), magnetometer=(), gyroscope=(), payment=()',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          // COOP: none of the app's window.open() calls (Steam/itch/Epic/
          // Spotify/YouTube links) rely on window.opener, so severing that
          // link for cross-origin popups is safe. CORP: nothing on the site
          // embeds our own pages/assets from another origin.
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Was `process.env.ALLOWED_ORIGIN || "'self'"` - 'self' quoted
          // like that is CSP syntax, not a valid Access-Control-Allow-Origin
          // value, so with ALLOWED_ORIGIN unset (the common case) every API
          // response sent that literal 7-character garbage string, which
          // browsers just discard. Omitting the header entirely in that
          // case is the correct "same-origin only" behavior - same-origin
          // requests never consult CORS headers at all, and cross-origin
          // fetches are blocked exactly as the broken value accidentally,
          // silently achieved.
          ...(process.env.ALLOWED_ORIGIN
            ? [{ key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN }]
            : []),
        ],
      },
      // Images matched the catch-all '/(.*)' above too, inheriting its
      // Cache-Control: no-store - iOS Safari specifically is known to fail
      // to render (or randomly blank out) images served with no-store, so
      // every image on the site could silently fail to draw there while
      // working fine elsewhere. These entries come after the catch-all, so
      // for these paths this Cache-Control overrides no-store instead of
      // stacking with it.
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
      {
        source: '/assets/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/pages/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pages/games.html',
        destination: '/games',
        permanent: true,
      },
      {
        // The E-Sport section itself was removed from the site (no
        // /e-sport route exists), so this used to redirect one dead legacy
        // URL straight into another 404 instead of somewhere real.
        source: '/pages/e-sport.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pages/records.html',
        destination: '/records',
        permanent: true,
      },
      {
        source: '/pages/dev.html',
        destination: '/dev',
        permanent: true,
      },
      {
        // The real route is /settings (English) - src/app/ustawienia/
        // doesn't exist, so this legacy URL 404'd instead of redirecting.
        source: '/pages/ustawienia.html',
        destination: '/settings',
        permanent: true,
      },
      {
        // /services and /dev/services rendered the same content at two
        // URLs (same /api/services fetch, same UI) - /dev/services was
        // kept as the canonical page, so this consolidates the
        // duplicate-content signal onto one URL instead of leaving both
        // live.
        source: '/services',
        destination: '/dev/services',
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      },
    };
    
    return config;
  },
};

export default nextConfig;
