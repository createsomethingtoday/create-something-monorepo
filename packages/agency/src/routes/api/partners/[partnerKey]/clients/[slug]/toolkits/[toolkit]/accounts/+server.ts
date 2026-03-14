import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountsGet, handlePartnerToolkitAccountsPost } from '$lib/server/partner-auth-handlers';

export const GET: RequestHandler = (event) => handlePartnerToolkitAccountsGet(event);
export const POST: RequestHandler = (event) => handlePartnerToolkitAccountsPost(event);
