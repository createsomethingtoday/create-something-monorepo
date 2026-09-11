import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeClayJob, ClayCallbackError } from '$lib/server/abundance-clay-jobs';
export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env?.DB) return json({ success: false }, { status: 503 });
  try {
    const raw = await request.text();
    if (raw.length > 15000) return json({ success: false }, { status: 413 });
    return json(await completeClayJob(platform.env.DB, JSON.parse(raw)), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    return json({ success: false }, { status: e instanceof ClayCallbackError ? 401 : 400 });
  }
};
