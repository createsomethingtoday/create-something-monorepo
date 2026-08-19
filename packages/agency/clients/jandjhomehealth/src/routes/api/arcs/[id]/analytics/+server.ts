import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordArcAnalytics } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals, params, platform, request, url }) => {
  if (!locals.admin) return json({ error: 'Admin login required.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'Cross-origin analytics are not allowed.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { event?: unknown; revision?: unknown } | null;
  if (!body || !['opened', 'completed', 'exited'].includes(String(body.event)) || !Number.isInteger(body.revision)) {
    return json({ error: 'Provide event and revision.' }, { status: 400 });
  }
  await recordArcAnalytics(getDb(platform), params.id, body.revision as number, body.event as 'opened' | 'completed' | 'exited');
  return json({ recorded: true }, { headers: { 'cache-control': 'no-store, private' } });
};
