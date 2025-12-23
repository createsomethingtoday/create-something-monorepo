/**
 * Single Reference API
 *
 * GET /api/taste/references/{id}
 *
 * Returns a single reference with full context:
 * - Visual description (for agents without vision)
 * - Design principles extracted
 * - Canon token mappings
 * - Related references
 *
 * Philosophy: The tool recedes; understanding emerges.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchReferenceById } from '$lib/taste/context';

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env?.DB;
	const { id } = params;

	if (!id) {
		throw error(400, 'Reference ID is required');
	}

	if (!db) {
		throw error(503, 'Database not available');
	}

	try {
		const reference = await fetchReferenceById(db, id);

		if (!reference) {
			throw error(404, {
				message: `Reference not found: ${id}`,
				// @ts-expect-error - SvelteKit error type
				hint: 'Use GET /api/taste/context?include=references to browse available references'
			});
		}

		return json(reference, {
			headers: {
				'Cache-Control': 'public, max-age=3600' // 1 hour cache
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Reference fetch error:', err);
		throw error(500, 'Failed to fetch reference');
	}
};
