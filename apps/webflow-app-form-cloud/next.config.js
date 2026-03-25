if (process.env.NODE_ENV === 'development') {
  try {
    const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');
    if (typeof initOpenNextCloudflareForDev === 'function') {
      initOpenNextCloudflareForDev();
    }
  } catch {
    // Local development should continue to work before the Cloudflare adapter is installed.
  }
}

function normalizePrefix(value) {
  if (!value || value === '/') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (!withoutTrailingSlash || withoutTrailingSlash === '/') {
    return '';
  }

  return withoutTrailingSlash.startsWith('/')
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash.replace(/^\/+/, '')}`;
}

const basePath = normalizePrefix(process.env.BASE_URL || '');
const assetPrefix = process.env.ASSETS_PREFIX
  ? process.env.ASSETS_PREFIX.replace(/\/+$/, '')
  : basePath;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  assetPrefix: assetPrefix || undefined,
  env: {
    NEXT_PUBLIC_BASE_URL: basePath,
    NEXT_PUBLIC_ASSETS_PREFIX: assetPrefix || '',
  },
  // Enable CORS for iframe embedding
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
