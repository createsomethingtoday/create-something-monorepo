import {
  getCloudflareEnv,
  type DashboardCloudflareEnv
} from '../../vendor/core/runtime';

export async function getOptionalEnv(): Promise<DashboardCloudflareEnv | null> {
  return getCloudflareEnv();
}

export async function getEnvOrThrow(): Promise<DashboardCloudflareEnv> {
  const env = await getOptionalEnv();
  if (!env) {
    throw new Error('Cloudflare runtime env not available');
  }
  return env;
}
