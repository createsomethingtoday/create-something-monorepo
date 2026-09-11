import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import { calculateSourcingTravel } from '$lib/server/abundance-sourcing-travel';
import { TravelInProgressError } from '$lib/server/abundance-travel-claims';
import { TravelQuotaError } from '$lib/server/abundance-travel-quota';
export const POST: RequestHandler = async ({ request, platform, fetch: fetchFn }) => {
  const env = platform?.env;
  if (
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!env?.DB || !env.GEOCODIO_API_KEY)
    return json({ success: false, error: 'Travel service is not configured.' }, { status: 503 });
  try {
    const raw = await request.text();
    if (raw.length > 10000) throw new TypeError('Travel request is too large.');
    const result = await calculateSourcingTravel(
      env.DB,
      JSON.parse(raw),
      env.GEOCODIO_API_KEY,
      fetchFn
    );
    return json(
      { success: true, data: result },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (cause) {
    const status =
      cause instanceof TravelInProgressError
        ? 409
        : cause instanceof TravelQuotaError
          ? 429
          : cause instanceof TypeError || cause instanceof SyntaxError
            ? 400
            : 503;
    return json(
      {
        success: false,
        error:
          status === 409
            ? 'An identical travel report is in progress; retry shortly.'
            : status === 429
              ? 'Routing allowance exhausted; retry later.'
              : status === 400
                ? 'Invalid travel request or unresolved clinic street address.'
                : 'Travel service unavailable; no complete result was produced.'
      },
      { status }
    );
  }
};
