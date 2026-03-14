import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountDisable } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerToolkitAccountDisable(event);
