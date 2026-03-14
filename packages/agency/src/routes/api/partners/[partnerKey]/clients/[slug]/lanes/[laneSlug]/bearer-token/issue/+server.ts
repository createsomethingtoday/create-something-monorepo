import type { RequestHandler } from './$types';
import { handlePartnerLaneBearerIssue } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerLaneBearerIssue(event);
