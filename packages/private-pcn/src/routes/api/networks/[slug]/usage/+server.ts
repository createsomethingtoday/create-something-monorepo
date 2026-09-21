import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deliveryUsage } from '$lib/server/usage';
import { PLAN } from '$lib/server/billing';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env) return json({ error: 'Usage unavailable.' }, { status: 503 });
  try {
    return json({
      usage: await deliveryUsage(platform.env, locals.network.id),
      limit: PLAN.deliveryMinutes
    });
  } catch {
    return json({ error: 'Provider delivery usage is temporarily unavailable.' }, { status: 503 });
  }
};
