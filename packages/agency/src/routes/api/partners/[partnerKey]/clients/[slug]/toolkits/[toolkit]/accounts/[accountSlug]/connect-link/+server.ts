import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountConnectLink } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerToolkitAccountConnectLink(event);
