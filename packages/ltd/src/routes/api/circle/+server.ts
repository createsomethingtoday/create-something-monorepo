/**
 * Circle State API
 *
 * Returns the current state of the hermeneutic circle:
 * - Node counts for each property
 * - Edge strengths based on canon_references
 * - Gap analysis (missing connections)
 *
 * Part of "The Circle Closes" experiment.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Domain = 'ltd' | 'io' | 'space' | 'agency';

interface CircleNode {
	domain: Domain;
	count: number;
	active: boolean;
	label: string;
	sublabel: string;
}

interface CircleEdge {
	from: Domain;
	to: Domain;
	strength: number;
}

interface CircleState {
	nodes: CircleNode[];
	edges: CircleEdge[];
	lastUpdated: number;
}

// The expected hermeneutic flow
const EXPECTED_EDGES: [Domain, Domain][] = [
	['ltd', 'io'], // Philosophy informs Research
	['io', 'space'], // Research guides Practice
	['space', 'agency'], // Practice applies to Services
	['agency', 'ltd'] // Services feedback to Philosophy
];

const NODE_LABELS: Record<Domain, { label: string; sublabel: string }> = {
	ltd: { label: '.ltd', sublabel: 'Philosophy' },
	io: { label: '.io', sublabel: 'Research' },
	space: { label: '.space', sublabel: 'Practice' },
	agency: { label: '.agency', sublabel: 'Services' }
};

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;
	const kv = platform?.env?.CIRCLE_DATA;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Try to get cached state from KV first
		if (kv) {
			const cached = await kv.get('circle:state', 'json');
			if (cached) {
				// Return cached state if less than 5 minutes old
				const state = cached as CircleState;
				if (Date.now() / 1000 - state.lastUpdated < 300) {
					return json(state);
				}
			}
		}

		// Count content in each property
		// Since all properties share the same D1 database, we can query it here
		const counts = await Promise.all([
			// .ltd: Count principles (the canon)
			db.prepare('SELECT COUNT(*) as count FROM principles').first<{ count: number }>(),

			// .io: Count papers (research/experiments with no is_executable filter)
			db
				.prepare(
					"SELECT COUNT(*) as count FROM papers WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND (is_executable IS NULL OR is_executable = 0)"
				)
				.first<{ count: number }>(),

			// .space: Count executable experiments
			db
				.prepare(
					'SELECT COUNT(*) as count FROM papers WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND is_executable = 1'
				)
				.first<{ count: number }>(),

			// .agency: Count case studies (category = 'case-study' or similar)
			db
				.prepare(
					"SELECT COUNT(*) as count FROM papers WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND category = 'case-study'"
				)
				.first<{ count: number }>()
		]);

		// Build nodes array
		const nodes: CircleNode[] = [
			{
				domain: 'ltd',
				count: counts[0]?.count ?? 0,
				active: (counts[0]?.count ?? 0) > 0,
				...NODE_LABELS.ltd
			},
			{
				domain: 'io',
				count: counts[1]?.count ?? 0,
				active: (counts[1]?.count ?? 0) > 0,
				...NODE_LABELS.io
			},
			{
				domain: 'space',
				count: counts[2]?.count ?? 0,
				active: (counts[2]?.count ?? 0) > 0,
				...NODE_LABELS.space
			},
			{
				domain: 'agency',
				count: counts[3]?.count ?? 0,
				active: (counts[3]?.count ?? 0) > 0,
				...NODE_LABELS.agency
			}
		];

		// Count cross-references for each edge
		// canon_references.reference_domain indicates where content lives
		// We infer edges based on which domains have references to which principles
		const edgeStrengths = await Promise.all(
			EXPECTED_EDGES.map(async ([from, to]) => {
				// Count references FROM one domain TO another
				// This is simplified - a proper implementation would track principle citations
				const result = await db
					.prepare(
						`SELECT COUNT(*) as count
						 FROM canon_references
						 WHERE reference_domain = ?`
					)
					.bind(to)
					.first<{ count: number }>();

				// Normalize to 0-10 scale (cap at 10)
				const rawCount = result?.count ?? 0;
				const strength = Math.min(10, rawCount);

				return {
					from,
					to,
					strength
				};
			})
		);

		const state: CircleState = {
			nodes,
			edges: edgeStrengths,
			lastUpdated: Math.floor(Date.now() / 1000)
		};

		// Cache the state in KV
		if (kv) {
			await kv.put('circle:state', JSON.stringify(state), {
				expirationTtl: 600 // 10 minutes
			});
		}

		return json(state);
	} catch (error) {
		console.error('Failed to fetch circle state:', error);
		return json({ error: 'Failed to fetch circle state' }, { status: 500 });
	}
};

// POST endpoint to manually trigger a cache refresh
export const POST: RequestHandler = async ({ platform }) => {
	const kv = platform?.env?.CIRCLE_DATA;

	if (kv) {
		// Delete the cached state to force refresh on next GET
		await kv.delete('circle:state');
	}

	return json({ success: true, message: 'Cache cleared' });
};
