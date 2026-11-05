import type { RequestHandler } from './$types';
import { metaPageViewResponse } from '$lib/server/meta-marketing';

export const POST: RequestHandler = ({ request, platform, locals }) =>
  metaPageViewResponse(request, platform?.env ?? {}, Boolean(locals?.user?.analytics_opt_out));
