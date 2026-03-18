import type { RequestHandler } from './$types';
import { createPartnerProspectGraduatePostHandlerWithDefaults } from '$lib/server/partner-prospect-graduate';

export const POST: RequestHandler = createPartnerProspectGraduatePostHandlerWithDefaults();
