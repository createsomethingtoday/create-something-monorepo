/**
 * Knowledge Graph Server Load
 *
 * Loads graph data from static JSON files.
 * Files are served from /static/.graph/ and fetched at runtime.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { GraphData } from '$lib/graph';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Fetch graph data from static assets
		const [nodesRes, edgesRes, metadataRes] = await Promise.all([
			fetch('/.graph/nodes.json'),
			fetch('/.graph/edges.json'),
			fetch('/.graph/metadata.json'),
		]);

		// Check if all files exist
		if (!nodesRes.ok || !edgesRes.ok || !metadataRes.ok) {
			throw error(404, {
				message:
					'Knowledge graph not found. Run `pnpm graph:build` to generate graph data.',
			});
		}

		// Parse JSON responses
		const [nodes, edges, metadata] = await Promise.all([
			nodesRes.json(),
			edgesRes.json(),
			metadataRes.json(),
		]);

		const data: GraphData = {
			nodes,
			edges,
			metadata,
		};

		return { data };
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
