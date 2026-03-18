import { isAuthorizedCronRequest } from '@create-something/webflow-dashboard-core';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getEnvOrThrow } from '../../../../lib/server/env';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function cleanupUploads(request: Request) {
  const env = await getEnvOrThrow();
  if (!isAuthorizedCronRequest(request, env.CRON_SECRET, env.ENVIRONMENT)) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!env.UPLOADS) {
    return jsonNoStore({ error: 'Storage not configured' }, { status: 500 });
  }

  try {
    const cutoffTime = Date.now() - ONE_DAY_MS;
    let deleted = 0;
    let checked = 0;
    let cursor: string | undefined;

    do {
      const listed = await env.UPLOADS.list({
        cursor,
        limit: 1000
      });

      for (const object of listed.objects) {
        checked += 1;
        if (object.uploaded.getTime() < cutoffTime) {
          try {
            await env.UPLOADS.delete(object.key);
            deleted += 1;
          } catch (error) {
            console.error('[Cron Cleanup] Failed to delete object:', object.key, error);
          }
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    return jsonNoStore({
      success: true,
      checked,
      deleted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron Cleanup] Error:', error);
    return jsonNoStore({ error: 'Failed to cleanup old images' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return cleanupUploads(request);
}

export async function POST(request: Request) {
  return cleanupUploads(request);
}
