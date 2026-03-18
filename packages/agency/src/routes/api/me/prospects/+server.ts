import type { RequestHandler } from './$types';
import { createPartnerProspectListGetHandlerWithDefaults } from '$lib/server/partner-prospect-list';

export const GET: RequestHandler = createPartnerProspectListGetHandlerWithDefaults();
