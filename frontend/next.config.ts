import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Performance: compress responses ──────────────────────
  compress: true,

  // ── Enable Turbopack for dev (default in Next 16) ───────
  // turbopack is enabled by default

  // ── Image optimization ──────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
    ],
  },

  // ── HTTP headers for caching & security ─────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache public assets
        source: '/(.*)\\.(svg|ico|png|jpg|jpeg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },

  // ── Experimental performance options ────────────────────
  experimental: {
    // Optimize package imports to reduce bundle sizes
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'clsx',
    ],
  },
};

export default nextConfig;
