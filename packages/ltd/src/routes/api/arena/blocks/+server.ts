/**
 * Are.na Block Creation API
 *
 * POST: Create and contribute blocks to Are.na channels.
 *
 * Paused for production. Are.na remains the human curation surface; this
 * public write-back path must not use the shared server token.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	return json(
		{
			error: 'Are.na write-back paused',
			message:
				'Curate directly in Are.na. CREATE SOMETHING only syncs human-curated channels into the taste substrate.'
		},
		{ status: 410 }
	);
};
