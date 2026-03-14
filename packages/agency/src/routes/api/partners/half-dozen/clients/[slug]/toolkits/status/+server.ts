import type { RequestHandler } from './$types';
import { handlePartnerToolkitStatus } from '$lib/server/partner-auth-handlers';
import { wrapHalfDozenPartnerRoute } from '$lib/server/partner-auth-route-wrappers';

export const GET: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerToolkitStatus(event));
