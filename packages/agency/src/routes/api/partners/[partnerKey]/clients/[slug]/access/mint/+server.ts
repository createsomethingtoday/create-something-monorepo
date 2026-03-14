import type { RequestHandler } from './$types';
import { handlePartnerClientAccessMint } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerClientAccessMint(event);
