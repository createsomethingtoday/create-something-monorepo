import type { RequestHandler } from './$types';
import { gigiLandingHtml, gigiLandingHeaders } from '$lib/server/gigi-landing-page';

export const GET: RequestHandler = () => new Response(gigiLandingHtml, { headers: gigiLandingHeaders });
export const HEAD: RequestHandler = () => new Response(null, { headers: gigiLandingHeaders });
