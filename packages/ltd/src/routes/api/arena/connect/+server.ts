/**
 * Are.na Block Connection API
 *
 * POST: Connect an existing Are.na block to a managed channel
 *
 * Paused for production. Programmatic discovery may propose references, but
 * human curation happens in Are.na before sync imports the result.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	return json(
		{
			error: 'Are.na auto-connect paused',
			message:
				'Review proposed references manually in Are.na. Sync will import approved channel contents.'
		},
		{ status: 410 }
	);
};
