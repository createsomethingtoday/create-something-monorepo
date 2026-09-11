import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessNpgHealthcareAnalyst } from '$lib/server/abundance-client-access';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import {
  parseSourcingQuery,
  querySourcing,
  exportSourcingCsv,
  geocodeSourcingBatch
} from '$lib/server/abundance-sourcing';

export const GET: RequestHandler = async ({ request, url, locals, platform }) => {
  const env = platform?.env;
  if (
    !canAccessNpgHealthcareAnalyst(locals.user?.email, env?.AGENCY_OPERATOR_EMAILS) &&
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ error: 'NPG client access required' }, { status: 403 });
  if (!env?.DB) return json({ error: 'Database unavailable' }, { status: 503 });
  try {
    const query = parseSourcingQuery(url.searchParams);
    if (url.searchParams.get('format') === 'csv') return await exportSourcingCsv(env.DB, query);
    return json(
      { success: true, data: await querySourcing(env.DB, query) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (cause) {
    return json(
      {
        success: false,
        error:
          cause instanceof TypeError
            ? cause.message
            : 'Sourcing service unavailable. No complete result was produced.'
      },
      { status: cause instanceof TypeError ? 400 : 503 }
    );
  }
};
export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env;
  if (
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ error: 'Unauthorized' }, { status: 401 });
  if (!env?.DB) return json({ error: 'Database unavailable' }, { status: 503 });
  try {
    const body = (await request.json()) as { action?: string; state?: string };
    if (body.action !== 'geocode_batch' || typeof body.state !== 'string')
      throw new TypeError('Use geocode_batch with a state.');
    return json({
      success: true,
      data: await geocodeSourcingBatch(env.DB, body.state.toUpperCase())
    });
  } catch (cause) {
    return json(
      {
        success: false,
        error:
          cause instanceof TypeError
            ? cause.message
            : 'Geocoding unavailable; retry the remaining batch later.'
      },
      { status: cause instanceof TypeError ? 400 : 503 }
    );
  }
};
