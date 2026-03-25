import type { NextConfig } from 'next';

const assetPrefix = process.env.ASSETS_PREFIX || process.env.BASE_URL || undefined;

const nextConfig: NextConfig = {
  assetPrefix,
  images: {
    unoptimized: true
  },
  transpilePackages: [
    '@create-something/webflow-dashboard-core',
    '@create-something/webflow-marketplace-core'
  ]
};

export default nextConfig;
