/**
 * Content Manifest API
 *
 * Returns metadata for all papers and experiments with actual routes.
 * Used by the unified search indexer to know which content to index.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT: IO publication is route-based, not D1-backed.           │
 * │                                                                     │
 * │ Papers may be implemented as static Svelte routes or as            │
 * │ markdown-backed dynamic routes. This manifest covers both.         │
 * │                                                                     │
 * │ This manifest provides metadata for the search indexer.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHEN ADDING A NEW PAPER:
 * 1. Create either a static route or a markdown-backed file-based paper
 * 2. Add static route metadata in papers/{slug}/meta.ts or file-based metadata in fileBasedPapers
 * 3. The search indexer will pick it up on the next re-index
 *
 * GET /api/manifest
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExperimentManifestItems } from '$lib/config/experimentCatalog';
import { getPaperManifestItems } from '$lib/config/paperCatalog';
import {
	PUBLIC_AGENT_TRUST_CARDS,
	PUBLIC_MCP_TRUST_CARDS
} from '$lib/config/publicTrustCatalog';

interface ContentItem {
	slug: string;
	title: string;
	description: string;
	category?: string;
}

const MCP_TRUST_CARDS: ContentItem[] = PUBLIC_MCP_TRUST_CARDS.map((card) => ({
	slug: card.slug,
	title: card.name,
	description: card.description,
	category: 'mcp-trust-card'
}));

const AGENT_TRUST_CARDS: ContentItem[] = PUBLIC_AGENT_TRUST_CARDS.map((card) => ({
	slug: card.slug,
	title: card.name,
	description: card.description,
	category: 'agent-trust-card'
}));

export const GET: RequestHandler = async () => {
	const papers = getPaperManifestItems();
	const experiments = getExperimentManifestItems();

	return json({
		property: 'io',
		papers,
		experiments,
		mcpTrustCards: MCP_TRUST_CARDS,
		agentTrustCards: AGENT_TRUST_CARDS,
		// Legacy format for backward compatibility
		paperSlugs: papers.map(p => p.slug),
		experimentSlugs: experiments.map(e => e.slug),
		mcpTrustCardSlugs: MCP_TRUST_CARDS.map((card) => card.slug),
		agentTrustCardSlugs: AGENT_TRUST_CARDS.map((card) => card.slug),
		generated: new Date().toISOString()
	});
};
