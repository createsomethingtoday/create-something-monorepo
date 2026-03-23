import type { RequestHandler } from '@sveltejs/kit';
import { createPartnerAccessLaneStatusGetHandlerWithDefaults } from '$lib/server/partner-access-lane-status';

export const GET: RequestHandler = createPartnerAccessLaneStatusGetHandlerWithDefaults();
