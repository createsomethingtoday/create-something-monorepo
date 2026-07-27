import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

import { createReceptionistSessionResponse } from '$lib/server/receptionist-session';

export const POST: RequestHandler = async ({ platform }) => {
	const apiKey = platform?.env?.OPENAI_API_KEY ?? env.OPENAI_API_KEY;
	return createReceptionistSessionResponse({ apiKey });
};
