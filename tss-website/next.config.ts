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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.jsdelivr.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.supabase.co https://*.supabase.co wss:",
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
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || "'self'",
          },
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
        source: '/pages/e-sport.html',
        destination: '/e-sport',
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
        source: '/pages/ustawienia.html',
        destination: '/ustawienia',
        permanent: true,
      },
      {
        source: '/games',
        destination: '/',
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
