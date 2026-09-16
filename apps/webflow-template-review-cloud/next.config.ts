import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;

initOpenNextCloudflareForDev();
