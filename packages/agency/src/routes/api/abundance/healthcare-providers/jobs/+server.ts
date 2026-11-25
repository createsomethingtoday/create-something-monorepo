import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessNpgHealthcareAnalyst } from '$lib/server/abundance-client-access';
import { isValidAbundanceApiBearer } from '$lib/server/abundance-api-auth';
import {
  parseJobsQuery,
  queryJobsBrowser
} from '../../../../../../../abundance-jobs-mcp/src/job-markets';

export const GET: RequestHandler = async ({ request, url, locals, platform }) => {
  const env = platform?.env;
  const headers = { 'Cache-Control': 'private, no-store' };
  if (
    !canAccessNpgHealthcareAnalyst(locals.user?.email, env?.AGENCY_OPERATOR_EMAILS) &&
    !(await isValidAbundanceApiBearer(
      request.headers.get('authorization'),
      env?.AGENCY_INTERNAL_API_KEY
    ))
  )
    return json({ success: false, error: 'NPG client access required' }, { status: 403, headers });
  if (!env?.DB)
    return json({ success: false, error: 'Database unavailable' }, { status: 503, headers });
  let query;
  try {
    query = parseJobsQuery(url.searchParams);
  } catch (cause) {
    const error = cause instanceof TypeError ? cause.message : 'Invalid jobs filters';
    return json({ success: false, error }, { status: 400, headers });
  }
  try {
    const data = await queryJobsBrowser(env.DB, query);
    return json({ success: true, data }, { headers });
  } catch {
    return json({ success: false, error: 'Jobs unavailable. Try again later.' }, { status: 503, headers });
  }
};
