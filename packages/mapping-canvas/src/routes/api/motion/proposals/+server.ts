import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { createMotionGenerator, generationAvailable } from '$lib/server/motion-generation';

const generate = createMotionGenerator();
const config = () => ({ dev, token: env.DRAW_KIMI_API_TOKEN, accountId: env.DRAW_CF_ACCOUNT_ID });
export const GET: RequestHandler = ({ url }) => Response.json({ available: generationAvailable(url, config()) }, { headers: { 'Cache-Control': 'no-store' } });
export const POST: RequestHandler = ({ request, url }) => generate(request, url, config());
