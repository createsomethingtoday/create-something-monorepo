import type { DashboardCloudflareEnv } from '../../vendor/core/runtime';

export const DEFAULT_UPLOADS_WORKER_URL =
  'https://template-form-uploads.createsomething.workers.dev';

export function getUploadsWorkerUrl(env: DashboardCloudflareEnv): string {
  return env.UPLOADS_WORKER_URL?.replace(/\/+$/, '') || DEFAULT_UPLOADS_WORKER_URL;
}
