import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BundleError } from './bundle-contract';

export type Platform = {
  DB: D1Database;
  BUCKET: R2Bucket;
  SESSION_ENCRYPTION_KEY: string;
  OAUTH_CLIENT_ID: string;
  PORTAL_ORIGIN: string;
  OPENAI_API_KEY: string;
  PORTAL_ALLOWED_EMAILS: string;
};
export async function platform(): Promise<Platform> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Platform;
}
export function required(value: string | undefined, name: string): string {
  if (!value?.trim())
    throw new BundleError('CONFIGURATION_REQUIRED', `${name} has not been configured.`, 503);
  return value;
}
export function portalOrigin(env: Platform) {
  const url = new URL(required(env.PORTAL_ORIGIN, 'Portal URL'));
  if (url.protocol !== 'https:' && url.hostname !== 'localhost')
    throw new BundleError('CONFIGURATION_REQUIRED', 'Portal URL must use HTTPS.', 503);
  return url.origin;
}
