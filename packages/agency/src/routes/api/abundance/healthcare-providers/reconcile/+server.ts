import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import { NpgStore } from '$lib/server/npg/store';
import { createProviders } from '$lib/server/npg/providers';
import { runRecoveryBatch } from '$lib/server/npg/recovery';
// Existing internal service authority. No caller-provided owner/action/candidate inputs.
export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env;
  if (
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ success: false }, { status: 401 });
  if (!env?.DB) return json({ success: false }, { status: 503 });
  const result = await runRecoveryBatch(new NpgStore(env.DB), () =>
    createProviders(env, AbortSignal.timeout(170000), fetch, true)
  );
  return json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
};
