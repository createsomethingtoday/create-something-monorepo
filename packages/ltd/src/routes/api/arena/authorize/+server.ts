/**
 * Are.na OAuth Authorization Redirect
 *
 * OAuth authorization is paused for production.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(
		{
			error: 'Are.na OAuth paused',
			message:
				'CREATE SOMETHING no longer stores Are.na OAuth tokens from the public app. Curate in Are.na directly.'
		},
		{ status: 410 }
	);
};
