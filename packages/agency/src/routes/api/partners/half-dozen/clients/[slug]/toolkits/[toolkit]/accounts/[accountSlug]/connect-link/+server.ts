import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountConnectLink } from '$lib/server/partner-auth-handlers';
import { wrapHalfDozenPartnerRoute } from '$lib/server/partner-auth-route-wrappers';

export const POST: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerToolkitAccountConnectLink(event));
