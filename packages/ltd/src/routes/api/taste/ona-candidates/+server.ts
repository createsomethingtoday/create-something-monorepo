/**
 * Performance Lab Candidate API
 *
 * Proposal-only Are.na discovery lane for human review.
 * The endpoint never writes to Are.na or D1.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArenaClient, type ArenaBlock } from '$lib/integrations/arena';
import {
	DEFAULT_PERFORMANCE_LAB_CANDIDATE_QUERIES,
	PERFORMANCE_LAB_OPERATOR_ACTIONS,
	rankPerformanceLabCandidates
} from '$lib/taste/ona-candidates';

const MAX_LIMIT = 24;
const MAX_PER_QUERY = 20;
const MANAGED_FALLBACK_CHANNELS = [
	'canon-minimalism',
	'motion-language-4hbfmugttwe',
	'claude-code-puz_2pgfxky'
];

interface CandidateSearchError {
	query: string;
	message: string;
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const queries = parseQueries(url);
	const limit = parseBoundedInteger(url.searchParams.get('limit'), 12, 1, MAX_LIMIT);
	const perQuery = parseBoundedInteger(url.searchParams.get('perQuery'), 10, 1, MAX_PER_QUERY);

	const client = new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken: platform?.env?.ARENA_API_TOKEN
	});

	const blocks: ArenaBlock[] = [];
	const errors: CandidateSearchError[] = [];
	let source = 'are.na-search';

	for (const query of queries) {
		try {
			const response = await client.searchBlocks(query, 1, perQuery);
			blocks.push(...(response.blocks ?? []));
		} catch (error) {
			errors.push({
				query,
				message: error instanceof Error ? error.message : 'Unknown Are.na search error'
			});
		}
	}

	if (blocks.length === 0 && errors.length > 0) {
		source = 'are.na-managed-channels';

		for (const channel of MANAGED_FALLBACK_CHANNELS) {
			try {
				const channelBlocks = await client.getAllChannelBlocks(channel);
				blocks.push(...filterBlocksForQueries(channelBlocks, queries));
			} catch (error) {
				errors.push({
					query: `channel:${channel}`,
					message: error instanceof Error ? error.message : 'Unknown Are.na channel error'
				});
			}
		}
	}

	const candidates = rankPerformanceLabCandidates(blocks, limit);
	const status =
		source === 'are.na-managed-channels'
			? candidates.length > 0
				? 'fallback'
				: 'degraded'
			: errors.length === queries.length
				? 'degraded'
				: 'ok';

	return json(
		{
			version: '1.0.0',
			mode: 'proposal-only',
			status,
			generatedAt: new Date().toISOString(),
			source,
			queries,
			fallbackChannels: source === 'are.na-managed-channels' ? MANAGED_FALLBACK_CHANNELS : [],
			writePolicy: {
				writesEnabled: false,
				allowedActions: PERFORMANCE_LAB_OPERATOR_ACTIONS,
				note:
					'This legacy endpoint only proposes Performance Lab candidate references. A human must approve, reject, redirect, or request evidence before anything enters Are.na, D1, /taste, /llm.txt, or /api/taste/context.'
			},
			operatorInterface: {
				priority: 'agent-first, mobile-first',
				cardUse:
					'Each candidate is small enough for phone review and includes score, reasons, risks, and next actions.'
			},
			candidates,
			errors
		},
		{
			headers: {
				'Cache-Control': status === 'ok' ? 'public, max-age=300' : 'no-store'
			}
		}
	);
};

function parseQueries(url: URL): string[] {
	const directQueries = url.searchParams.getAll('q');
	const queryList = directQueries.length
		? directQueries.flatMap((query) => query.split(/[|,]/))
		: [...DEFAULT_PERFORMANCE_LAB_CANDIDATE_QUERIES];

	const cleaned = queryList
		.map((query) => query.trim())
		.filter((query) => query.length > 0)
		.slice(0, 8);

	return cleaned.length ? cleaned : [...DEFAULT_PERFORMANCE_LAB_CANDIDATE_QUERIES];
}

function filterBlocksForQueries(blocks: ArenaBlock[], queries: string[]): ArenaBlock[] {
	const terms = queries
		.flatMap((query) => query.toLowerCase().split(/\s+/))
		.map((term) => term.trim())
		.filter((term) => term.length > 3);

	if (terms.length === 0) return blocks;

	return blocks.filter((block) => {
		const text = [
			block.title,
			block.generated_title,
			block.content,
			block.description,
			block.source?.title,
			block.source?.url,
			block.embed?.title,
			block.connections?.map((channel) => channel.title).join(' ')
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		return terms.some((term) => text.includes(term));
	});
}

function parseBoundedInteger(value: string | null, fallback: number, min: number, max: number): number {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, parsed));
}
