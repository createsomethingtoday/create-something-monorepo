/**
 * Are.na OAuth Callback
 *
 * OAuth callback is paused for production.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(
		{
			error: 'Are.na OAuth paused',
			message:
				'CREATE SOMETHING does not accept Are.na OAuth callbacks from the public app.'
		},
		{ status: 410 }
	);
};
