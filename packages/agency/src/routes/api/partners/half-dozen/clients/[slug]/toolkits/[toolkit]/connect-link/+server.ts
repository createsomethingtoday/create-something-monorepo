import type { RequestHandler } from "./$types";
import { createPartnerToolkitConnectLinkPostHandlerWithDefaults } from "$lib/server/partner-toolkit-connect-link";

export const POST: RequestHandler = createPartnerToolkitConnectLinkPostHandlerWithDefaults();
