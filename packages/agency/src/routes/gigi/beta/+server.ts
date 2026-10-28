import type { RequestHandler } from './$types';
import { gigiBetaHtml, gigiBetaHeaders } from '$lib/server/gigi-beta-page';

// An intentionally standalone page: do not load the shared marketing/analytics shell.
export const GET: RequestHandler = () => new Response(gigiBetaHtml, { headers: gigiBetaHeaders });
export const HEAD: RequestHandler = () => new Response(null, { headers: gigiBetaHeaders });
