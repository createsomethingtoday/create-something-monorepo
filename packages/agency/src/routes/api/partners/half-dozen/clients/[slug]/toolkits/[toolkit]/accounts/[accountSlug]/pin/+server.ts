import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountPin } from '$lib/server/partner-auth-handlers';
import { wrapHalfDozenPartnerRoute } from '$lib/server/partner-auth-route-wrappers';

export const POST: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerToolkitAccountPin(event));
