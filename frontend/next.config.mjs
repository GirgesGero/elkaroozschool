import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint runs on every build. It was previously disabled here, which meant
    // `next build` never linted at all and a broken lint setup would stay
    // invisible until CI. The config now lives in .eslintrc.json.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Verified: `tsc --noEmit` currently reports 0 errors, so this flag is not
    // hiding anything today. It stays as a safety net for the Vercel build.
    // Remove it once a CI typecheck gate is in place.
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        // The encyclopedia dataset is immutable once generated, so it can be
        // cached forever. NOTE the split by extension: only `.gz` may claim
        // `application/gzip`. The plain `.json` files (manifest, categories,
        // sections) are fetched with response.json(), and stamping them as gzip
        // under nosniff would mislabel them.
        source: '/storage/bible-dataset/:file*.gz',
        headers: [
          { key: 'Content-Type', value: 'application/gzip' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/storage/bible-dataset/:file*.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
