import type { NextConfig } from 'next';
import { join } from 'node:path';

const assetPrefix = process.env.ASSETS_PREFIX || process.env.BASE_URL || undefined;

const nextConfig: NextConfig = {
  assetPrefix,
  output: 'standalone',
  outputFileTracingRoot: join(process.cwd(), '../..'),
  images: {
    unoptimized: true
  },
  transpilePackages: ['@create-something/webflow-dashboard-core']
};

export default nextConfig;
