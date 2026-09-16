import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessNpgHealthcareAnalyst } from '$lib/server/abundance-client-access';
import { exportTravelCsv } from '$lib/server/abundance-travel-export';
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.user)
    throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname + url.search));
  if (!canAccessNpgHealthcareAnalyst(locals.user.email, platform?.env?.AGENCY_OPERATOR_EMAILS))
    throw error(403, 'NPG client access required');
  if (!platform?.env?.DB) throw error(503, 'Database unavailable');
  try {
    return await exportTravelCsv(platform.env.DB, url.searchParams.get('id') ?? '');
  } catch (cause) {
    throw error(
      cause instanceof TypeError ? 400 : 503,
      'Travel export unavailable; no complete export was produced.'
    );
  }
};
