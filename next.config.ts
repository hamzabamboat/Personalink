import type { NextConfig } from 'next'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/personalink\.in\/api\/me/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-me',
        expiration: { maxEntries: 1, maxAgeSeconds: 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/personalink\.in\/dashboard/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dashboard-pages',
        expiration: { maxEntries: 10, maxAgeSeconds: 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Required so PostHog's trailing-slash endpoints (e.g. /decide/) aren't redirected.
  skipTrailingSlashRedirect: true,
  // Reverse proxy for PostHog (client inits with api_host: '/ingest'). Without
  // this, every browser event POSTs to /ingest/* and 404s — so no analytics.
  // 'static' MUST come before the catch-all so JS assets hit us-assets, not us.
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default pwaConfig(nextConfig)
