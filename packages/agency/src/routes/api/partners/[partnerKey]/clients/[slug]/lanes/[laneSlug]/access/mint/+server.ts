import type { RequestHandler } from './$types';
import { handlePartnerLaneAccessMint } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerLaneAccessMint(event);
