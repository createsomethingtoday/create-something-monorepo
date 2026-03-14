import type { RequestHandler } from './$types';
import { handlePartnerClientInit } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerClientInit(event);
