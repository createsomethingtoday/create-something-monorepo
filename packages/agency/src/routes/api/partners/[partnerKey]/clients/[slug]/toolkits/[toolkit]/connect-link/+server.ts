import type { RequestHandler } from './$types';
import { handlePartnerToolkitConnectLink } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerToolkitConnectLink(event);
