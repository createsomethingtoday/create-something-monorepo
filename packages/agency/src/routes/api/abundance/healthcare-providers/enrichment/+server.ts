import { json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import { requestClayJob, readClayJob, ClayQuotaError } from '$lib/server/abundance-clay-jobs';
const handle: RequestHandler = async ({ request, url, platform, fetch: fetchFn }) => {
  const env = platform?.env;
  if (
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!env?.DB) return json({ success: false, error: 'Database unavailable' }, { status: 503 });
  try {
    let data;
    if (request.method === 'GET')
      data = await readClayJob(env.DB, url.searchParams.get('id') ?? '');
    else {
      if (!env.CLAY_NPG_WEBHOOK_URL || !env.CLAY_NPG_WEBHOOK_AUTH_TOKEN)
        return json({ success: false, error: 'Clay integration unavailable' }, { status: 503 });
      const raw = await request.text();
      if (raw.length > 2000) throw new TypeError();
      data = await requestClayJob(
        env.DB,
        JSON.parse(raw),
        { webhookUrl: env.CLAY_NPG_WEBHOOK_URL, webhookToken: env.CLAY_NPG_WEBHOOK_AUTH_TOKEN },
        fetchFn
      );
    }
    return json({ success: true, data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    const status =
      e instanceof ClayQuotaError
        ? 429
        : e instanceof TypeError || e instanceof ZodError || e instanceof SyntaxError
          ? 400
          : 503;
    return json(
      {
        success: false,
        error:
          status === 429
            ? 'Daily enrichment allowance exhausted.'
            : status === 400
              ? 'Invalid enrichment request or unknown registry NPI.'
              : 'Enrichment unavailable; check the existing job before retrying.'
      },
      { status }
    );
  }
};
export const POST = handle;
export const GET = handle;
