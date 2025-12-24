/**
 * Arena Curator - Programmatic Content Discovery
 *
 * Automatically discovers and curates Are.na blocks based on
 * deterministic search queries and filter rules.
 *
 * Philosophy: Reliability over magic. The tool recedes into
 * predictable, sustainable operation.
 *
 * Cron: Weekly on Sundays at 6am UTC
 */

interface Env {
	API_BASE: string;
	ARENA_API_TOKEN: string;
}

interface ArenaBlock {
	id: number;
	title: string | null;
	class: string;
	description: string | null;
	source?: { url: string } | null;
	image?: { display: { url: string } } | null;
	content?: string | null;
}

interface SearchResponse {
	blocks: ArenaBlock[];
	total_pages: number;
	current_page: number;
}

/**
 * Channel curation configuration
 * Each channel has search queries and filter criteria
 */
const CURATION_CONFIG = {
	'canon-minimalism': {
		// Search queries to discover content
		queries: [
			'dieter rams design',
			'braun design minimal',
			'swiss typography grid',
			'less but better',
			'functional minimalism'
		],
		// Block types to accept
		acceptTypes: ['Image', 'Link', 'Media'],
		// Keywords that indicate good matches (in title/description)
		positiveSignals: [
			'rams', 'braun', 'swiss', 'grid', 'minimal', 'function',
			'typography', 'helvetica', 'vitsoe', 'pure', 'simple'
		],
		// Keywords that indicate rejection
		negativeSignals: [
			'apple', 'iphone', 'macbook', 'trendy', 'gradient',
			'colorful', 'busy', 'complex', 'maximalist'
		],
		// Maximum blocks to add per run
		maxPerRun: 3
	},
	'motion-language-4hbfmugttwe': {
		queries: [
			'ui animation micro interaction',
			'motion design interface',
			'loading animation minimal',
			'transition animation ui',
			'subtle animation web'
		],
		acceptTypes: ['Image', 'Link', 'Media', 'Attachment'],
		positiveSignals: [
			'transition', 'micro', 'subtle', 'state', 'feedback',
			'easing', 'smooth', 'purposeful', 'functional'
		],
		negativeSignals: [
			'flashy', 'bounce', 'wiggle', 'attention', 'decorative',
			'slow', 'heavy', 'complex'
		],
		maxPerRun: 2
	},
	'claude-code-puz_2pgfxky': {
		queries: [
			'human ai collaboration',
			'tool use philosophy',
			'heidegger technology',
			'craft computing',
			'ai pair programming'
		],
		acceptTypes: ['Text', 'Link', 'Image'],
		positiveSignals: [
			'collaboration', 'partnership', 'tool', 'craft', 'dwelling',
			'heidegger', 'zuhandenheit', 'ready-to-hand', 'transparency'
		],
		negativeSignals: [
			'replace', 'autonomous', 'magic', 'automate everything',
			'no human', 'ai only'
		],
		maxPerRun: 2
	}
} as const;

type ChannelSlug = keyof typeof CURATION_CONFIG;

/**
 * Search Are.na for blocks matching a query
 */
async function searchArena(query: string): Promise<ArenaBlock[]> {
	const encoded = encodeURIComponent(query);
	// Limit to 10 results per query for efficiency (5 queries × 10 = 50 max per channel)
	const response = await fetch(
		`https://api.are.na/v2/search/blocks?q=${encoded}&per=10`,
		{
			headers: { 'User-Agent': 'arena-curator/1.0' }
		}
	);

	if (!response.ok) {
		console.error(`Search failed for "${query}": ${response.status}`);
		return [];
	}

	const data: SearchResponse = await response.json();
	return data.blocks || [];
}

/**
 * Get existing blocks in a channel to avoid duplicates
 */
async function getChannelBlockIds(slug: string): Promise<Set<number>> {
	const response = await fetch(
		`https://api.are.na/v2/channels/${slug}?per=100`,
		{
			headers: { 'User-Agent': 'arena-curator/1.0' }
		}
	);

	if (!response.ok) {
		return new Set();
	}

	const data = await response.json();
	const ids = new Set<number>();
	for (const block of data.contents || []) {
		ids.add(block.id);
	}
	return ids;
}

/**
 * Score a block based on curation criteria
 * Returns score 0-100, higher is better
 */
function scoreBlock(
	block: ArenaBlock,
	config: typeof CURATION_CONFIG[ChannelSlug]
): number {
	// Must be an accepted type
	if (!config.acceptTypes.includes(block.class)) {
		return 0;
	}

	const text = [
		block.title || '',
		block.description || '',
		block.content || ''
	].join(' ').toLowerCase();

	// Check for negative signals (instant rejection)
	for (const signal of config.negativeSignals) {
		if (text.includes(signal.toLowerCase())) {
			return 0;
		}
	}

	// Score based on positive signals
	let score = 10; // Base score for passing type check
	for (const signal of config.positiveSignals) {
		if (text.includes(signal.toLowerCase())) {
			score += 15;
		}
	}

	// Bonus for having an image (visual reference)
	if (block.image?.display?.url) {
		score += 10;
	}

	// Bonus for having a title (curated content)
	if (block.title && block.title.length > 3) {
		score += 5;
	}

	return Math.min(score, 100);
}

/**
 * Connect a block to a channel via our API
 */
async function connectBlock(
	channel: string,
	blockId: number,
	env: Env
): Promise<boolean> {
	const response = await fetch(`${env.API_BASE}/api/arena/connect`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'arena-curator/1.0'
		},
		body: JSON.stringify({ channel, blockId })
	});

	if (!response.ok) {
		const error = await response.text();
		console.error(`Failed to connect block ${blockId}: ${error}`);
		return false;
	}

	return true;
}

/**
 * Curate content for a single channel
 */
async function curateChannel(
	slug: ChannelSlug,
	env: Env
): Promise<{ discovered: number; connected: number; errors: string[] }> {
	const config = CURATION_CONFIG[slug];
	const result = { discovered: 0, connected: 0, errors: [] as string[] };

	// Get existing blocks to avoid duplicates
	const existingIds = await getChannelBlockIds(slug);
	console.log(`Channel ${slug}: ${existingIds.size} existing blocks`);

	// Collect and score candidates from all queries
	const candidates: Array<{ block: ArenaBlock; score: number }> = [];

	for (const query of config.queries) {
		const blocks = await searchArena(query);
		result.discovered += blocks.length;

		for (const block of blocks) {
			// Skip if already in channel
			if (existingIds.has(block.id)) {
				continue;
			}

			const score = scoreBlock(block, config);
			if (score > 30) { // Minimum threshold
				candidates.push({ block, score });
			}
		}

		// Rate limiting - don't hammer Are.na
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	// Sort by score and take top N
	candidates.sort((a, b) => b.score - a.score);
	const toConnect = candidates.slice(0, config.maxPerRun);

	console.log(`Channel ${slug}: ${candidates.length} candidates, connecting ${toConnect.length}`);

	// Connect top candidates
	for (const { block, score } of toConnect) {
		console.log(`Connecting block ${block.id} (score: ${score}): ${block.title || 'Untitled'}`);
		const success = await connectBlock(slug, block.id, env);
		if (success) {
			result.connected++;
		} else {
			result.errors.push(`Failed to connect ${block.id}`);
		}

		// Rate limiting between connections
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	return result;
}

export default {
	async scheduled(
		event: ScheduledEvent,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(`Arena curator triggered at ${new Date().toISOString()}`);
		console.log(`Cron: ${event.cron}`);

		const results: Record<string, { discovered: number; connected: number; errors: string[] }> = {};

		for (const slug of Object.keys(CURATION_CONFIG) as ChannelSlug[]) {
			try {
				results[slug] = await curateChannel(slug, env);
			} catch (error) {
				console.error(`Error curating ${slug}:`, error);
				results[slug] = {
					discovered: 0,
					connected: 0,
					errors: [error instanceof Error ? error.message : 'Unknown error']
				};
			}
		}

		// Summary
		const totalDiscovered = Object.values(results).reduce((sum, r) => sum + r.discovered, 0);
		const totalConnected = Object.values(results).reduce((sum, r) => sum + r.connected, 0);
		const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);

		console.log(`Curation complete:`, {
			totalDiscovered,
			totalConnected,
			totalErrors,
			channels: results
		});
	},

	// Allow manual trigger via HTTP for testing
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('POST to trigger curation', { status: 405 });
		}

		const results: Record<string, { discovered: number; connected: number; errors: string[] }> = {};

		for (const slug of Object.keys(CURATION_CONFIG) as ChannelSlug[]) {
			try {
				results[slug] = await curateChannel(slug, env);
			} catch (error) {
				results[slug] = {
					discovered: 0,
					connected: 0,
					errors: [error instanceof Error ? error.message : 'Unknown error']
				};
			}
		}

		return new Response(JSON.stringify(results, null, 2), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
