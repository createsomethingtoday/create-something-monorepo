import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () =>
	json(
		{
			error:
				'The legacy embedded job-agent endpoint has been retired. Use the live intake and public jobs surfaces.'
		},
		{ status: 410 }
	);
