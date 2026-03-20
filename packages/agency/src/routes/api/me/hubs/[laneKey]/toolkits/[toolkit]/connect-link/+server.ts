import type { RequestHandler } from './$types';
import { createLegacyLaneToolkitConnectLinkPostHandlerWithDefaults } from '$lib/server/legacy-lane-toolkit-connect-link';

export const POST: RequestHandler = createLegacyLaneToolkitConnectLinkPostHandlerWithDefaults();
