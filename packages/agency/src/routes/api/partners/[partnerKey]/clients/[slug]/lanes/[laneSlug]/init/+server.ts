import type { RequestHandler } from './$types';
import { handlePartnerLaneInit } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerLaneInit(event);
