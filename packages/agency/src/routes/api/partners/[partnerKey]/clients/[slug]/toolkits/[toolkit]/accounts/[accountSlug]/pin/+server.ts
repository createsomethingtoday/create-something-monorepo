import type { RequestHandler } from './$types';
import { handlePartnerToolkitAccountPin } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerToolkitAccountPin(event);
