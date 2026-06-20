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

// Experiments with static routes in src/routes/experiments/.
// Paper routes are derived from the shared paper catalog above.
const EXPERIMENTS: ContentItem[] = [
	{ slug: 'agent-operations', title: 'Agent Operations', description: 'Interactive experiment for agent operation patterns', category: 'interactive' },
	{ slug: 'agentic-visualization', title: 'Agentic Visualization', description: 'Visualizing agent decision-making in real-time', category: 'interactive' },
	{ slug: 'awwwards-patterns', title: 'Awwwards Patterns', description: 'Design patterns from award-winning websites', category: 'interactive' },
	{ slug: 'canvas-interactivity', title: 'Canvas Interactivity', description: 'Interactive canvas experiments', category: 'interactive' },
	{ slug: 'data-patterns', title: 'Data Patterns', description: 'Exploring data visualization patterns', category: 'interactive' },
	{ slug: 'diagrams', title: 'Diagrams', description: 'Interactive diagram components', category: 'interactive' },
	{ slug: 'hybrid-scheduling', title: 'Hybrid Scheduling', description: 'Hybrid agent scheduling experiments', category: 'interactive' },
	{ slug: 'ic-mvp-pipeline', title: 'IC MVP Pipeline', description: 'Interactive concept MVP pipeline', category: 'interactive' },
	{ slug: 'kinetic-typography', title: 'Kinetic Typography', description: 'Motion typography experiments', category: 'interactive' },
	{ slug: 'living-arena', title: 'Living Arena', description: 'Living documentation arena', category: 'interactive' },
	{ slug: 'render-preview', title: 'Render Preview', description: 'Real-time render preview system', category: 'interactive' },
	{ slug: 'render-studio', title: 'Render Studio', description: 'Interactive rendering studio', category: 'interactive' },
	{ slug: 'spritz', title: 'Spritz', description: 'Speed reading with Spritz technique', category: 'interactive' },
	{ slug: 'text-revelation', title: 'Text Revelation', description: 'Progressive text revelation patterns', category: 'interactive' }
];

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

	return json({
		property: 'io',
		papers,
		experiments: EXPERIMENTS,
		mcpTrustCards: MCP_TRUST_CARDS,
		agentTrustCards: AGENT_TRUST_CARDS,
		// Legacy format for backward compatibility
		paperSlugs: papers.map(p => p.slug),
		experimentSlugs: EXPERIMENTS.map(e => e.slug),
		mcpTrustCardSlugs: MCP_TRUST_CARDS.map((card) => card.slug),
		agentTrustCardSlugs: AGENT_TRUST_CARDS.map((card) => card.slug),
		generated: new Date().toISOString()
	});
};
