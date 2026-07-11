import type { RequestHandler } from './$types';
import { guideResponse } from '$lib/api.js';

export const POST: RequestHandler = ({ request }) => guideResponse(request);
