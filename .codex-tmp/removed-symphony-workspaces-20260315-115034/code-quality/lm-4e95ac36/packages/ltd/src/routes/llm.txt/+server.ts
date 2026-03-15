/**
 * LLM.txt Endpoint
 *
 * Exposes taste collections as structured context for AI agents.
 * Plain text format optimized for LLM context windows.
 *
 * Routes:
 * - GET /llm.txt - Returns canonical taste vocabulary
 * - GET /llm.txt?collection={id} - Returns specific collection context
 * - GET /llm.txt?user={id} - Returns user's studied references
 *
 * Philosophy: Taste is cultivated in Are.na. This exposes it to
 * agents who lack vision but need aesthetic guidance.
 */

import type { RequestHandler } from './$types';
import {
	CHANNELS_WITH_CONTEXT,
	DESIGN_PRINCIPLES,
	CORE_TOKEN_MAPPINGS,
	type TokenMapping
} from '$lib/taste/context';

// =============================================================================
// D1 DATABASE TYPES
// =============================================================================

interface D1Result<T> {
	results?: T[];
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

// =============================================================================
// STATIC CANONICAL CONTEXT
// =============================================================================

function generateCanonicalContext(): string {
	const lines: string[] = [];

	lines.push('# CREATE SOMETHING Design Context');
	lines.push('');
	lines.push('## Philosophy');
	lines.push('Weniger, aber besser. Less, but better.');
	lines.push('The Subtractive Triad: DRY → Rams → Heidegger');
	lines.push('');

	// Visual vocabulary from principles
	lines.push('## Visual Vocabulary');
	lines.push('');

	lines.push('### Minimalism');
	for (const principle of DESIGN_PRINCIPLES.minimalism) {
		lines.push(`- ${principle}`);
	}
	lines.push('');

	lines.push('### Motion');
	for (const principle of DESIGN_PRINCIPLES.motion) {
		lines.push(`- ${principle}`);
	}
	lines.push('');

	lines.push('### Typography');
	for (const principle of DESIGN_PRINCIPLES.typography) {
		lines.push(`- ${principle}`);
	}
	lines.push('');

	lines.push('### Color');
	for (const principle of DESIGN_PRINCIPLES.color) {
		lines.push(`- ${principle}`);
	}
	lines.push('');

	lines.push('### Anti-Patterns');
	for (const antiPattern of DESIGN_PRINCIPLES.antiPatterns) {
		lines.push(`- ${antiPattern}`);
	}
	lines.push('');

	// Token mappings by category
	lines.push('## Canon Token Reference');
	lines.push('');

	const groupedTokens = groupTokensByCategory(CORE_TOKEN_MAPPINGS);
	for (const [category, tokens] of Object.entries(groupedTokens)) {
		lines.push(`### ${capitalizeFirst(category)}`);
		for (const token of tokens) {
			lines.push(`${token.token}: ${token.value}`);
			lines.push(`  ← ${token.derivedFrom}`);
		}
		lines.push('');
	}

	// Source channels
	lines.push('## Source Channels');
	lines.push('');
	for (const channel of CHANNELS_WITH_CONTEXT.filter((c) => c.isPrimary)) {
		lines.push(`### ${channel.name}`);
		lines.push(channel.description);
		lines.push('Principles:');
		for (const principle of channel.principles) {
			lines.push(`- ${principle}`);
		}
		lines.push('');
	}

	// Property character
	lines.push('## Property Character');
	lines.push('- .space: Experimental (200ms transitions)');
	lines.push('- .io: Research (250ms, measured)');
	lines.push('- .agency: Professional (250ms, efficient)');
	lines.push('- .ltd: Contemplative (500ms, deliberate)');
	lines.push('');

	// Relationship mappings
	lines.push('## Relationship Mappings');
	lines.push('');
	lines.push('Rams -> minimalism -> --color-fg-muted, --radius-*');
	lines.push('Swiss Design -> typography -> --text-*, grid spacing');
	lines.push('Braun -> industrial -> --radius-sm, --radius-lg');
	lines.push('Motion Language -> animation -> --duration-*, --ease-standard');
	lines.push('');

	return lines.join('\n');
}

// =============================================================================
// COLLECTION CONTEXT
// =============================================================================

interface CollectionRow {
	id: string;
	name: string;
	description: string | null;
	tags: string | null;
	visibility: string;
	item_count: number;
}

interface CollectionItemRow {
	id: string;
	reference_id: string;
	reference_type: string;
	position: number;
	note: string | null;
	title: string | null;
	description: string | null;
	image_url: string | null;
	url: string | null;
	year: number | null;
}

async function generateCollectionContext(db: D1Database, collectionId: string): Promise<string | null> {
	// Fetch collection
	const collection = await db
		.prepare('SELECT id, name, description, tags, visibility, item_count FROM taste_collections WHERE id = ?')
		.bind(collectionId)
		.first<CollectionRow>();

	if (!collection) {
		return null;
	}

	// Only allow public or unlisted collections
	if (collection.visibility === 'private') {
		return null;
	}

	// Fetch collection items with reference details
	const itemsResult = await db
		.prepare(`
			SELECT
				ci.id,
				ci.reference_id,
				ci.reference_type,
				ci.position,
				ci.note,
				COALESCE(e.title, r.title) as title,
				COALESCE(e.description, r.description) as description,
				e.image_url,
				r.url,
				COALESCE(e.year, r.year) as year
			FROM taste_collection_items ci
			LEFT JOIN examples e ON ci.reference_type = 'example' AND ci.reference_id = e.id
			LEFT JOIN resources r ON ci.reference_type = 'resource' AND ci.reference_id = r.id
			WHERE ci.collection_id = ?
			ORDER BY ci.position ASC
		`)
		.bind(collectionId)
		.all<CollectionItemRow>();

	const items = itemsResult.results ?? [];

	const lines: string[] = [];

	lines.push(`# Collection: ${collection.name}`);
	lines.push('');

	if (collection.description) {
		lines.push('## Description');
		lines.push(collection.description);
		lines.push('');
	}

	if (collection.tags) {
		try {
			const tags = JSON.parse(collection.tags) as string[];
			if (tags.length > 0) {
				lines.push(`Tags: ${tags.join(', ')}`);
				lines.push('');
			}
		} catch {
			// Ignore invalid JSON
		}
	}

	lines.push('## References');
	lines.push(`Total items: ${items.length}`);
	lines.push('');

	for (const item of items) {
		lines.push(`### ${item.position + 1}. ${item.title || 'Untitled'}`);
		lines.push(`Type: ${item.reference_type}`);
		if (item.year) lines.push(`Year: ${item.year}`);
		if (item.description) lines.push(`Description: ${item.description}`);
		if (item.url) lines.push(`URL: ${item.url}`);
		if (item.note) lines.push(`Annotation: ${item.note}`);
		lines.push('');
	}

	// Add relationship context
	lines.push('## Design Relationships');
	lines.push('');
	lines.push('This collection informs Canon design decisions:');
	lines.push('- Visual patterns → token derivations');
	lines.push('- Temporal examples → motion timing');
	lines.push('- Compositional references → spacing ratios');
	lines.push('');

	return lines.join('\n');
}

// =============================================================================
// USER CONTEXT
// =============================================================================

interface StudiedReferenceRow {
	reference_id: string;
	reference_type: string;
	channel: string | null;
	view_count: number;
	total_time_seconds: number;
	title: string | null;
	description: string | null;
	image_url: string | null;
	url: string | null;
	year: number | null;
}

interface ChannelStatsRow {
	channel: string;
	studied_count: number;
	time_seconds: number;
}

async function generateUserContext(db: D1Database, userId: string): Promise<string | null> {
	// Fetch user's studied references
	const studiedResult = await db
		.prepare(`
			SELECT
				tr.reference_id,
				tr.reference_type,
				tr.channel,
				tr.view_count,
				tr.total_time_seconds,
				COALESCE(e.title, r.title) as title,
				COALESCE(e.description, r.description) as description,
				e.image_url,
				r.url,
				COALESCE(e.year, r.year) as year
			FROM taste_readings tr
			LEFT JOIN examples e ON tr.reference_type = 'example' AND tr.reference_id = e.id
			LEFT JOIN resources r ON tr.reference_type = 'resource' AND tr.reference_id = r.id
			WHERE tr.user_id = ? AND tr.studied = 1
			ORDER BY tr.total_time_seconds DESC
			LIMIT 50
		`)
		.bind(userId)
		.all<StudiedReferenceRow>();

	const studied = studiedResult.results ?? [];

	if (studied.length === 0) {
		return null;
	}

	// Get channel breakdown
	const channelResult = await db
		.prepare(`
			SELECT
				channel,
				SUM(CASE WHEN studied = 1 THEN 1 ELSE 0 END) as studied_count,
				SUM(total_time_seconds) as time_seconds
			FROM taste_readings
			WHERE user_id = ? AND channel IS NOT NULL
			GROUP BY channel
			ORDER BY time_seconds DESC
		`)
		.bind(userId)
		.all<ChannelStatsRow>();

	const channels = channelResult.results ?? [];

	const lines: string[] = [];

	lines.push(`# User Taste Profile`);
	lines.push('');
	lines.push(`Total studied references: ${studied.length}`);
	lines.push('');

	// Channel focus
	if (channels.length > 0) {
		lines.push('## Channel Focus');
		for (const ch of channels.slice(0, 5)) {
			const channelInfo = CHANNELS_WITH_CONTEXT.find((c) => c.slug === ch.channel);
			const name = channelInfo?.name ?? ch.channel;
			const timeFormatted = formatDuration(ch.time_seconds);
			lines.push(`- ${name}: ${ch.studied_count} studied (${timeFormatted})`);
		}
		lines.push('');
	}

	// Derive taste vocabulary from studied references
	lines.push('## Derived Vocabulary');
	lines.push('Based on studied references, this user\'s aesthetic leans toward:');
	lines.push('');

	const intents = deriveIntentsFromChannels(channels.map((c) => c.channel));
	for (const intent of intents) {
		lines.push(`- ${intent}`);
	}
	lines.push('');

	// Studied references with annotations
	lines.push('## Studied References');
	lines.push('');

	for (const ref of studied.slice(0, 20)) {
		lines.push(`### ${ref.title || 'Untitled'}`);
		lines.push(`Type: ${ref.reference_type}`);
		if (ref.channel) {
			const channelInfo = CHANNELS_WITH_CONTEXT.find((c) => c.slug === ref.channel);
			lines.push(`Channel: ${channelInfo?.name ?? ref.channel}`);
		}
		if (ref.year) lines.push(`Year: ${ref.year}`);
		if (ref.description) lines.push(`Description: ${ref.description}`);
		if (ref.url) lines.push(`URL: ${ref.url}`);
		lines.push(`Study time: ${formatDuration(ref.total_time_seconds)}`);
		lines.push('');
	}

	// Relationship mappings based on user's focus
	lines.push('## Relationship Mappings');
	lines.push('');
	lines.push('Based on study patterns, relevant Canon mappings:');
	for (const ch of channels.slice(0, 3)) {
		const tokens = getTokensForChannelSlug(ch.channel);
		if (tokens.length > 0) {
			lines.push(`${ch.channel}:`);
			for (const token of tokens.slice(0, 3)) {
				lines.push(`  ${token.token} ← ${token.derivedFrom}`);
			}
		}
	}
	lines.push('');

	return lines.join('\n');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function groupTokensByCategory(tokens: TokenMapping[]): Record<string, TokenMapping[]> {
	const grouped: Record<string, TokenMapping[]> = {};
	for (const token of tokens) {
		if (!grouped[token.category]) {
			grouped[token.category] = [];
		}
		grouped[token.category].push(token);
	}
	return grouped;
}

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	const hours = Math.floor(seconds / 3600);
	const mins = Math.round((seconds % 3600) / 60);
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function deriveIntentsFromChannels(channelSlugs: string[]): string[] {
	const intents: Set<string> = new Set();

	for (const slug of channelSlugs) {
		const channel = CHANNELS_WITH_CONTEXT.find((c) => c.slug === slug);
		if (channel) {
			for (const intent of channel.intents) {
				intents.add(intent);
			}
		}
	}

	const intentDescriptions: Record<string, string> = {
		minimalism: 'Minimalism: Reduction, negative space, restraint',
		motion: 'Motion: Purposeful animation, temporal design',
		typography: 'Typography: Type hierarchy, Swiss influence',
		color: 'Color: Monochrome preference, semantic accents',
		layout: 'Layout: Grid discipline, spatial harmony',
		spacing: 'Spacing: Golden ratio proportions',
		brutalism: 'Brutalism: Raw expression, visible structure'
	};

	return Array.from(intents).map((i) => intentDescriptions[i] ?? i);
}

function getTokensForChannelSlug(channelSlug: string): TokenMapping[] {
	const channel = CHANNELS_WITH_CONTEXT.find((c) => c.slug === channelSlug);
	if (!channel) return [];

	const relevantCategories = new Set<TokenMapping['category']>();
	for (const intent of channel.intents) {
		switch (intent) {
			case 'color':
				relevantCategories.add('color');
				break;
			case 'spacing':
			case 'layout':
				relevantCategories.add('spacing');
				relevantCategories.add('radius');
				break;
			case 'motion':
				relevantCategories.add('motion');
				break;
			case 'typography':
				relevantCategories.add('typography');
				break;
			case 'minimalism':
			case 'brutalism':
				relevantCategories.add('color');
				relevantCategories.add('spacing');
				break;
		}
	}

	return CORE_TOKEN_MAPPINGS.filter((t) => relevantCategories.has(t.category));
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

export const GET: RequestHandler = async ({ url, platform }) => {
	const collectionId = url.searchParams.get('collection');
	const userId = url.searchParams.get('user');

	let content: string;
	let cacheControl: string;

	// Collection-specific context
	if (collectionId) {
		const db = platform?.env?.DB as D1Database | undefined;
		if (!db) {
			return new Response('Database not available', { status: 500 });
		}

		const collectionContext = await generateCollectionContext(db, collectionId);
		if (!collectionContext) {
			return new Response('Collection not found or private', { status: 404 });
		}

		content = collectionContext;
		cacheControl = 'public, max-age=3600'; // Cache for 1 hour
	}
	// User-specific context
	else if (userId) {
		const db = platform?.env?.DB as D1Database | undefined;
		if (!db) {
			return new Response('Database not available', { status: 500 });
		}

		const userContext = await generateUserContext(db, userId);
		if (!userContext) {
			return new Response('User has no studied references', { status: 404 });
		}

		content = userContext;
		cacheControl = 'private, max-age=300'; // Cache for 5 minutes, private
	}
	// Default canonical context
	else {
		content = generateCanonicalContext();
		cacheControl = 'public, max-age=86400'; // Cache for 24 hours
	}

	return new Response(content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': cacheControl
		}
	});
};
