import type { RequestHandler } from './$types';
import { createLegacyMcpToolkitConnectLinkPostHandlerWithDefaults } from '$lib/server/mcp-legacy-toolkit-connect-link';

export const POST: RequestHandler = createLegacyMcpToolkitConnectLinkPostHandlerWithDefaults();
