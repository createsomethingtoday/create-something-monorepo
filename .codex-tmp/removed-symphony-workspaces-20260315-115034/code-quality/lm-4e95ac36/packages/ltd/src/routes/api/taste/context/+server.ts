/**
 * Taste Context API
 *
 * Structured taste vocabulary for programmatic agent access.
 *
 * GET /api/taste/context - Full taste context
 * GET /api/taste/context?intent=color - Filtered by design intent
 * GET /api/taste/context?include=references - Include reference data
 *
 * Response includes:
 * - Visual descriptions (for agents without vision)
 * - Design principles extracted from curation
 * - Canon token mappings
 * - Channel metadata
 *
 * Philosophy: The tool recedes; understanding emerges.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchTasteContext,
	type DesignIntent,
	DESIGN_PRINCIPLES,
	CHANNELS_WITH_CONTEXT,
	CORE_TOKEN_MAPPINGS
} from '$lib/taste/context';

const VALID_INTENTS: DesignIntent[] = [
	'color',
	'typography',
	'spacing',
	'motion',
	'layout',
	'minimalism',
	'brutalism'
];

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;

	// Parse query parameters
	const intentParam = url.searchParams.get('intent');
	const includeReferences = url.searchParams.get('include') === 'references';
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 50;

	// Validate intent if provided
	let intent: DesignIntent | undefined;
	if (intentParam) {
		if (!VALID_INTENTS.includes(intentParam as DesignIntent)) {
			return json(
				{
					error: 'Invalid intent parameter',
					validIntents: VALID_INTENTS,
					message: `Intent must be one of: ${VALID_INTENTS.join(', ')}`
				},
				{ status: 400 }
			);
		}
		intent = intentParam as DesignIntent;
	}

	// If no database, return static context (still useful for agents)
	if (!db) {
		const staticContext = {
			version: '1.0.0',
			generatedAt: new Date().toISOString(),
			channels: intent
				? CHANNELS_WITH_CONTEXT.filter((c) => c.intents.includes(intent!))
				: CHANNELS_WITH_CONTEXT,
			principles: DESIGN_PRINCIPLES,
			tokenMappings: intent
				? CORE_TOKEN_MAPPINGS.filter((t) => {
						switch (intent) {
							case 'color':
								return t.category === 'color';
							case 'typography':
								return t.category === 'typography';
							case 'spacing':
							case 'layout':
								return t.category === 'spacing' || t.category === 'radius';
							case 'motion':
								return t.category === 'motion';
							case 'minimalism':
							case 'brutalism':
								return ['color', 'spacing', 'radius'].includes(t.category);
							default:
								return true;
						}
					})
				: CORE_TOKEN_MAPPINGS,
			stats: {
				totalExamples: 0,
				totalResources: 0,
				channelsCurated: CHANNELS_WITH_CONTEXT.length,
				lastSync: null
			},
			_note: 'Database unavailable. Returning static design context.'
		};

		return json(staticContext, {
			headers: {
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}

	try {
		const context = await fetchTasteContext(db, {
			intent,
			includeReferences,
			referenceLimit: Math.min(limit, 100) // Cap at 100
		});

		return json(context, {
			headers: {
				'Cache-Control': 'public, max-age=300' // 5 minute cache
			}
		});
	} catch (error) {
		console.error('Taste context error:', error);
		return json(
			{
				error: 'Failed to fetch taste context',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
