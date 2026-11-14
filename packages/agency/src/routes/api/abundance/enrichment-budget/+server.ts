import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import {
  enrichmentReadiness,
  reserveEnrichment,
  claimEnrichment,
  recordEnrichment,
  requireEnrichmentProvider,
  EnrichmentBudgetError
} from '$lib/server/enrichment-budget';
const handle: RequestHandler = async ({ request, url, platform }) => {
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
    let data;
    if (request.method === 'GET')
      data = await enrichmentReadiness(
        env.DB,
        requireEnrichmentProvider(url.searchParams.get('provider'))
      );
    else {
      const text = await request.text();
      if (text.length > 2000) throw new TypeError();
      const body = JSON.parse(text);
      if (body?.action === 'claim') {
        if (Object.keys(body).sort().join(',') !== 'action,grant') throw new TypeError();
        data = await claimEnrichment(env.DB, body.grant);
      } else if (body?.action === 'record') {
        const allowed = [
          'action',
          'grant',
          'event_id',
          'status',
          'actual_usd',
          'estimated_usd',
          'credits',
          'credit_unit',
          'receipt_ref'
        ];
        if (Object.keys(body).some((k) => !allowed.includes(k))) throw new TypeError();
        const { action, grant, ...receipt } = body;
        data = await recordEnrichment(env.DB, grant, receipt);
      } else {
        if (!body || Object.keys(body).sort().join(',') !== 'digest,npi,provider')
          throw new TypeError();
        data = await reserveEnrichment(
          env.DB,
          body.provider === 'complete' ? 'complete' : requireEnrichmentProvider(body.provider),
          body.digest,
          body.npi
        );
      }
    }
    return json({ success: true, data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    return json(
      {
        success: false,
        error:
          e instanceof EnrichmentBudgetError
            ? e.message
            : 'Spend tracking unavailable; dispatch has not been authorized.'
      },
      {
        status: e instanceof TypeError || e instanceof SyntaxError ? 400 : 409,
        headers: { 'Cache-Control': 'private, no-store' }
      }
    );
  }
};
export const GET = handle;
export const POST = handle;
