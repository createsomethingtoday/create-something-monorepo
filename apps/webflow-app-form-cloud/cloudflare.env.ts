import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getRuntimeCloudflareEnv() {
  const context = await getCloudflareContext({ async: true });
  return context?.env || null;
}
