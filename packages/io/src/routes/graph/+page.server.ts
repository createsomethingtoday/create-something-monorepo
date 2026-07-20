/**
 * Knowledge Graph Server Load
 *
 * Loads graph data from static JSON files.
 * Files are served from /static/.graph/ and fetched at runtime.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { BuildMetadata } from '$lib/graph';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Keep the multi-megabyte graph out of server-rendered HTML. The browser
		// loads nodes and edges only when the workspace is ready to use them.
		const metadataRes = await fetch('/.graph/metadata.json');

		// Check if all files exist
		if (!metadataRes.ok) {
			throw error(404, {
				message:
					'Knowledge graph not found. Run `pnpm graph:build` to generate graph data.',
			});
		}

		// Parse JSON responses with type assertions
		const metadata = (await metadataRes.json()) as BuildMetadata;
		return { metadata };
	} catch (err) {
		if ((err as { status?: number }).status === 404) {
			throw err;
		}
		console.error('Failed to load graph data:', err);
		throw error(500, {
			message: 'Failed to load graph data. Try rebuilding with `pnpm graph:build`.',
		});
	}
};
