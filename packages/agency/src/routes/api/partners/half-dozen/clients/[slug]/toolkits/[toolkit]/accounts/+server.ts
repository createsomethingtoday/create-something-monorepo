import type { RequestHandler } from './$types';
import {
	handlePartnerToolkitAccountsGet,
	handlePartnerToolkitAccountsPost,
} from '$lib/server/partner-auth-handlers';
import { wrapHalfDozenPartnerRoute } from '$lib/server/partner-auth-route-wrappers';

export const GET: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerToolkitAccountsGet(event));
export const POST: RequestHandler = wrapHalfDozenPartnerRoute((event) => handlePartnerToolkitAccountsPost(event));
