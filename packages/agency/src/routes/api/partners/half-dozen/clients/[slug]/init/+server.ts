import type { RequestHandler } from './$types';
import { handlePartnerClientInit } from '$lib/server/partner-auth-handlers';
import { wrapHalfDozenPartnerRoute } from '$lib/server/partner-auth-route-wrappers';

export const POST: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerClientInit(event));
