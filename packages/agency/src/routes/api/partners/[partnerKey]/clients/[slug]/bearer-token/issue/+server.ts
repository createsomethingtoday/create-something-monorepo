import type { RequestHandler } from './$types';
import { handlePartnerClientBearerIssue } from '$lib/server/partner-auth-handlers';

export const POST: RequestHandler = (event) => handlePartnerClientBearerIssue(event);
