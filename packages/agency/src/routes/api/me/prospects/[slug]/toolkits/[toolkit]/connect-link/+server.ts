import type { RequestHandler } from './$types';
import { createPartnerProspectToolkitConnectLinkPostHandlerWithDefaults } from '$lib/server/partner-prospect-toolkit-connect-link';

export const POST: RequestHandler = createPartnerProspectToolkitConnectLinkPostHandlerWithDefaults();
