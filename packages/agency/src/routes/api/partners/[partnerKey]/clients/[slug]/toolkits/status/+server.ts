import type { RequestHandler } from './$types';
import { handlePartnerToolkitStatus } from '$lib/server/partner-auth-handlers';

export const GET: RequestHandler = (event) => handlePartnerToolkitStatus(event);
