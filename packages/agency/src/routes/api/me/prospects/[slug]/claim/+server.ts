import type { RequestHandler } from './$types';
import { createPartnerProspectClaimPostHandlerWithDefaults } from '$lib/server/partner-prospect-claim';

export const POST: RequestHandler = createPartnerProspectClaimPostHandlerWithDefaults();
