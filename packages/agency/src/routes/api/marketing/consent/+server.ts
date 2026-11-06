import type { RequestHandler } from './$types';
import { metaConsentResponse } from '$lib/server/meta-marketing';

export const GET: RequestHandler = ({ request, platform, locals }) =>
  metaConsentResponse(request, platform?.env ?? {}, Boolean(locals?.user?.analytics_opt_out), undefined,
    locals?.user?.analytics_preference_verified === true ? locals.user.id : undefined);
export const POST: RequestHandler = GET;
