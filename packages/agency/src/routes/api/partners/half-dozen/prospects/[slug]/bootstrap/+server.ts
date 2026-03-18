import type { RequestHandler } from './$types';
import { createPartnerProspectBootstrapPostHandlerWithDefaults } from '$lib/server/partner-prospect-bootstrap';

export const POST: RequestHandler = createPartnerProspectBootstrapPostHandlerWithDefaults();
