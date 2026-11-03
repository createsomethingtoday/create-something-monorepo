/**
 * Taste Context API
 *
 * Structured taste vocabulary for programmatic agent access.
 * Provides visual descriptions, design principles, and Canon token mappings
 * for agents without vision capabilities.
 *
 * Philosophy: The tool recedes; understanding emerges.
 *
 * @packageDocumentation
 */

import type { Example, Resource } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Design intent categories for filtering context
 */
export type DesignIntent =
	| 'color'
	| 'typography'
	| 'spacing'
	| 'motion'
	| 'layout'
	| 'minimalism'
	| 'brutalism';

/**
 * Channel metadata with design context
 */
export interface ChannelContext {
	slug: string;
	name: string;
	description: string;
	isPrimary: boolean;
	/** Design intents this channel informs */
	intents: DesignIntent[];
	/** Key visual principles derived from this channel */
	principles: string[];
}

/**
 * Canon token mapping derived from visual references
 */
export interface TokenMapping {
	token: string;
	value: string;
	category: 'color' | 'spacing' | 'radius' | 'motion' | 'typography';
	/** Visual pattern that informed this token */
	derivedFrom: string;
}

/**
 * Visual description for agents without vision
 */
export interface ReferenceSource {
	channel: string;
	url: string;
	syncedAt: string;
}

export interface VisualDescription {
	/** Fetch the image before making visual claims. */
	basis: 'metadata';
	requiresVisualInspection: true;
	/** Brief textual description of the visual */
	summary: string;
	/** Dominant colors detected or described */
	dominantColors?: string[];
	/** Visual style classification */
	style?: string;
	/** Composition notes */
	composition?: string;
}

/**
 * Extended reference with agent context
 */
export interface ReferenceWithContext {
	id: string;
	type: 'example' | 'resource';
	title: string;
	channel: string | null;
	/** Verified memberships; empty for legacy records awaiting sync. */
	channels: string[];
	sources: ReferenceSource[];
	/** Visual description for agents without vision */
	visual: VisualDescription;
	/** Design principles this reference exemplifies */
	principles: string[];
	/** Related Canon tokens */
	tokens: TokenMapping[];
	/** Related reference IDs */
	relatedIds: string[];
	/** Original data */
	imageUrl?: string;
	url?: string;
	description?: string;
	year?: number;
}

/**
 * Full taste context response
 */
export interface TasteContext {
	/** API version for compatibility */
	version: string;
	/** ISO timestamp of context generation */
	generatedAt: string;
	/** Channel metadata with design context */
	channels: ChannelContext[];
	/** Core design principles from taste curation */
	principles: DesignPrinciples;
	/** Canon token mappings derived from visual references */
	tokenMappings: TokenMapping[];
	/** Statistics about the taste collection */
	stats: TasteStats;
	/** Optional filtered references (when intent specified) */
	references?: ReferenceWithContext[];
}

/**
 * Design principles extracted from taste channels
 */
export interface DesignPrinciples {
	minimalism: string[];
	motion: string[];
	typography: string[];
	color: string[];
	clearCommunication: string[];
	antiPatterns: string[];
}

/**
 * Collection statistics
 */
export interface TasteStats {
	totalExamples: number;
	totalResources: number;
	channelsCurated: number;
	lastSync: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Channel metadata with design context
 */
export const CHANNELS_WITH_CONTEXT: ChannelContext[] = [
	{
		slug: 'canon-minimalism',
		name: 'Canon Minimalism',
		description: 'Core visual vocabulary for CREATE SOMETHING design system',
		isPrimary: true,
		intents: ['minimalism', 'color', 'layout', 'spacing'],
		principles: [
			'Negative space lets elements breathe',
			'Monochrome first, color as emphasis',
			'Typography creates hierarchy without ornament',
			'Grid discipline creates order'
		]
	},
	{
		slug: 'motion-language',
		name: 'Motion Language',
		description: 'Animation and transition patterns for UI',
		isPrimary: true,
		intents: ['motion'],
		principles: [
			'Animation reveals state changes',
			'200ms for micro-interactions (--duration-performance-micro)',
			'Single easing curve for consistency (--ease-performance-standard)',
			'Respect prefers-reduced-motion'
		]
	},
	{
		slug: 'people-dieter-rams',
		name: 'Dieter Rams',
		description: 'Industrial design artifacts from Braun era',
		isPrimary: false,
		intents: ['minimalism', 'color'],
		principles: [
			'Less but better (Weniger, aber besser)',
			'Form follows function',
			'Honest materials and construction',
			'Timelessness over trends'
		]
	},
	{
		slug: 'examples-swiss-design',
		name: 'Swiss Design',
		description: 'International typographic style references',
		isPrimary: false,
		intents: ['typography', 'layout', 'spacing'],
		principles: [
			'Grid-based composition',
			'Sans-serif typography preference',
			'Asymmetric balance',
			'Mathematical proportions'
		]
	},
	{
		slug: 'motion-minimal-simple',
		name: 'Minimal Motion',
		description: 'Subtle animation examples',
		isPrimary: false,
		intents: ['motion'],
		principles: ['Restraint in animation', 'Purposeful transitions only', 'Subtle feedback']
	},
	{
		slug: 'brutalist-x-web-design',
		name: 'Brutalist Web',
		description: 'Raw, honest web design patterns',
		isPrimary: false,
		intents: ['brutalism', 'typography', 'layout'],
		principles: [
			'Raw expression over polish',
			'Content over decoration',
			'Monospace and system fonts',
			'Visible structure'
		]
	},
	{
		slug: 'interfaces-motion',
		name: 'Interface Motion',
		description: 'UI animation patterns and examples',
		isPrimary: false,
		intents: ['motion', 'layout'],
		principles: [
			'Motion communicates hierarchy',
			'Spatial relationships through animation',
			'Loading states as design opportunities'
		]
	},
	{
		slug: 'minimal-modern-web',
		name: 'Minimal Web',
		description: 'Contemporary minimalist websites',
		isPrimary: false,
		intents: ['minimalism', 'typography', 'layout', 'color'],
		principles: [
			'White/black space dominance',
			'Single accent color maximum',
			'Content-first layouts',
			'Subtle interactions'
		]
	},
	{
		slug: 'clean-mymjklzsah4',
		name: 'Clean',
		description: 'Clean and clear minimalist design',
		isPrimary: false,
		intents: ['minimalism', 'layout', 'spacing'],
		principles: [
			'Clear hierarchy with restrained composition',
			'Space separates related groups',
			'Remove decoration that competes with content'
		]
	},
	{
		slug: 'minimalism-cpx4fblmr3i',
		name: 'Minimalism',
		description: 'Minimalist design references',
		isPrimary: false,
		intents: ['minimalism', 'layout', 'spacing'],
		principles: [
			'Reduction makes the primary task visible',
			'Negative space supports hierarchy',
			'Restrained composition keeps attention on content'
		]
	}
];

/**
 * Design principles derived from taste curation
 */
export const DESIGN_PRINCIPLES: DesignPrinciples = {
	minimalism: [
		'Negative space: Let elements breathe',
		'Monochrome first: Color as emphasis, not decoration',
		'Typography as structure: Type creates hierarchy without ornament',
		'Grid discipline: Alignment creates order'
	],
	motion: [
		'Purposeful: Animation reveals state, guides attention',
		'Subtle: --duration-performance-micro (200ms) for most interactions',
		'Consistent: One easing curve (--ease-performance-standard)',
		'Reducible: Respect prefers-reduced-motion'
	],
	typography: [
		'System fonts where possible',
		'Limited type scale (3-4 sizes maximum)',
		'Line height 1.5-1.6 for body text',
		'Generous letter-spacing for headings'
	],
	color: [
		'Pure black (#000000) as primary background',
		'White with opacity for text hierarchy',
		'WCAG AA compliance minimum (4.5:1 contrast)',
		'Semantic colors for state (success, error, warning, info)'
	],
	clearCommunication: [
		'Performance Lab reference: one literal offer, one outcome sentence, direct actions, readiness state, nearby proof',
		'Use Are.na discovery to propose Performance Lab references from the feed, then require human approval before corpus entry',
		'Human-in-the-loop interfaces must be agent-first and mobile-first: agents carry context, operators approve, reject, or redirect from small screens',
		'Light operational surfaces with clear contrast, stable spacing, and visible boundaries',
		'Every major claim needs a nearby artifact, receipt, metric, or named system boundary',
		'Use concrete task language before abstract framework language',
		'Translate public reference patterns into owned Canon primitives; do not copy generated CSS, fonts, assets, campaign language, or identity'
	],
	antiPatterns: [
		'Decorative animation (bouncing icons, pulsing elements)',
		'Gratuitous color (rainbow gradients, neon accents)',
		'Cluttered layouts (every pixel filled)',
		'Inconsistent motion (mixed timing, varied easing)'
	]
};

/**
 * Core Canon token mappings derived from visual references
 */
export const CORE_TOKEN_MAPPINGS: TokenMapping[] = [
	// Colors
	{
		token: '--color-performance-bg-pure',
		value: '#000000',
		category: 'color',
		derivedFrom: 'Rams black backgrounds, brutalist web'
	},
	{
		token: '--color-performance-fg-primary',
		value: '#ffffff',
		category: 'color',
		derivedFrom: 'High contrast accessibility'
	},
	{
		token: '--color-performance-fg-secondary',
		value: 'rgba(255, 255, 255, 0.8)',
		category: 'color',
		derivedFrom: 'Swiss design hierarchy'
	},
	{
		token: '--color-performance-fg-muted',
		value: 'rgba(255, 255, 255, 0.46)',
		category: 'color',
		derivedFrom: "Rams' muted grays, WCAG AA minimum"
	},
	// Spacing
	{
		token: '--space-performance-sm',
		value: '1rem',
		category: 'spacing',
		derivedFrom: 'Swiss grid proportions'
	},
	{
		token: '--space-performance-md',
		value: '1.618rem',
		category: 'spacing',
		derivedFrom: 'Golden ratio (phi = 1.618)'
	},
	{
		token: '--space-performance-lg',
		value: '2.618rem',
		category: 'spacing',
		derivedFrom: 'Golden ratio progression'
	},
	// Radius
	{
		token: '--radius-performance-scale-sm',
		value: '6px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	{
		token: '--radius-performance-scale-md',
		value: '8px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	{
		token: '--radius-performance-scale-lg',
		value: '12px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	// Motion
	{
		token: '--duration-performance-micro',
		value: '200ms',
		category: 'motion',
		derivedFrom: 'Minimal motion references'
	},
	{
		token: '--duration-performance-standard',
		value: '300ms',
		category: 'motion',
		derivedFrom: 'Interface motion patterns'
	},
	{
		token: '--ease-performance-standard',
		value: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
		category: 'motion',
		derivedFrom: 'Material Design easing'
	},
	// Typography
	{
		token: '--text-performance-body',
		value: '1rem',
		category: 'typography',
		derivedFrom: 'Swiss typography standards'
	},
	{
		token: '--text-performance-body-sm',
		value: '0.875rem',
		category: 'typography',
		derivedFrom: 'Swiss typography standards'
	}
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Filter channels by design intent
 */
export function filterChannelsByIntent(intent: DesignIntent): ChannelContext[] {
	return CHANNELS_WITH_CONTEXT.filter((channel) => channel.intents.includes(intent));
}

/**
 * Filter token mappings by category
 */
export function filterTokensByCategory(category: TokenMapping['category']): TokenMapping[] {
	return CORE_TOKEN_MAPPINGS.filter((token) => token.category === category);
}

/**
 * Generate visual description from Example or Resource
 * This provides textual context for agents without vision
 */
export function generateVisualDescription(
	item: Example | Resource,
	channel: string | null
): VisualDescription {
	const channelContext = CHANNELS_WITH_CONTEXT.find((c) => c.slug === channel);
	const parts = [item.title, item.description].filter(Boolean);
	if (channelContext) parts.push(`From ${channelContext.name} collection.`);
	return {
		summary: parts.join('. ') || 'Visual reference awaiting inspection',
		basis: 'metadata',
		requiresVisualInspection: true
	};
}

/**
 * Get principles applicable to a reference based on its channel
 */
export function getPrinciplesForChannel(channel: string): string[] {
	const channelContext = CHANNELS_WITH_CONTEXT.find((c) => c.slug === channel);
	return channelContext?.principles ?? [];
}

/**
 * Get token mappings relevant to a channel's intents
 */
export function getTokensForChannel(channel: string): TokenMapping[] {
	const channelContext = CHANNELS_WITH_CONTEXT.find((c) => c.slug === channel);
	if (!channelContext) return [];

	const relevantCategories = new Set<TokenMapping['category']>();
	for (const intent of channelContext.intents) {
		switch (intent) {
			case 'color':
				relevantCategories.add('color');
				break;
			case 'spacing':
			case 'layout':
				relevantCategories.add('spacing');
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

	return CORE_TOKEN_MAPPINGS.filter((token) => relevantCategories.has(token.category));
}

/**
 * Map intent to token categories for filtering
 */
export function intentToCategories(intent: DesignIntent): TokenMapping['category'][] {
	switch (intent) {
		case 'color':
			return ['color'];
		case 'typography':
			return ['typography'];
		case 'spacing':
		case 'layout':
			return ['spacing', 'radius'];
		case 'motion':
			return ['motion'];
		case 'minimalism':
		case 'brutalism':
			return ['color', 'spacing', 'radius'];
		default:
			return [];
	}
}

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
// DATA FETCHING
// =============================================================================

const MASTER_ID = 'arena-taste';

export interface FetchContextOptions {
	/** Filter by design intent */
	intent?: DesignIntent;
	/** Include full references in response */
	includeReferences?: boolean;
	/** Limit number of references */
	referenceLimit?: number;
}

/**
 * Fetch taste context from D1 database
 */
export async function fetchTasteContext(
	db: D1Database,
	options: FetchContextOptions = {}
): Promise<TasteContext> {
	const { intent, includeReferences = false, referenceLimit = 50 } = options;

	// Get stats
	const [examplesResult, resourcesResult] = await Promise.all([
		db
			.prepare(`SELECT COUNT(*) as count FROM examples WHERE master_id = ?`)
			.bind(MASTER_ID)
			.first<{ count: number }>(),
		db
			.prepare(`SELECT COUNT(*) as count FROM resources WHERE master_id = ?`)
			.bind(MASTER_ID)
			.first<{ count: number }>()
	]);

	const lastSync = await readLastSuccessfulTasteSync(db);

	const stats: TasteStats = {
		totalExamples: examplesResult?.count ?? 0,
		totalResources: resourcesResult?.count ?? 0,
		channelsCurated: CHANNELS_WITH_CONTEXT.length,
		lastSync
	};

	// Filter channels and tokens by intent if specified
	let channels = CHANNELS_WITH_CONTEXT;
	let tokenMappings = CORE_TOKEN_MAPPINGS;

	if (intent) {
		channels = filterChannelsByIntent(intent);
		const categories = intentToCategories(intent);
		tokenMappings = CORE_TOKEN_MAPPINGS.filter((t) => categories.includes(t.category));
	}

	const context: TasteContext = {
		version: '1.1.0',
		generatedAt: new Date().toISOString(),
		channels,
		principles: DESIGN_PRINCIPLES,
		tokenMappings,
		stats
	};

	// Optionally include references
	if (includeReferences) {
		const references = await fetchReferencesWithContext(db, {
			intent,
			limit: referenceLimit
		});
		context.references = references;
	}

	return context;
}

/**
 * Latest completed channel import, independent of source block creation dates.
 * Null means no verified checkpoint, not that synchronization has never run.
 */
export async function readLastSuccessfulTasteSync(db: D1Database): Promise<string | null> {
	const result = await db
		.prepare('SELECT MAX(last_successful_sync_at) AS last_sync FROM taste_sync_state')
		.first<{ last_sync: number | null }>();
	return result?.last_sync != null ? new Date(result.last_sync * 1000).toISOString() : null;
}

interface Membership {
	reference_id: string;
	channel_slug: string;
	source_url: string;
	synced_at: number;
}

async function referenceSources(
	db: D1Database,
	ids: string[]
): Promise<Map<string, ReferenceSource[]>> {
	const sources = new Map<string, ReferenceSource[]>();
	if (!ids.length) return sources;
	const rows = await db
		.prepare(
			`SELECT * FROM taste_reference_channels WHERE reference_id IN (${ids.map(() => '?').join(',')}) ORDER BY channel_slug`
		)
		.bind(...ids)
		.all<Membership>();
	for (const row of rows.results ?? []) {
		const entries = sources.get(row.reference_id) ?? [];
		entries.push({
			channel: row.channel_slug,
			url: row.source_url,
			syncedAt: new Date(row.synced_at * 1000).toISOString()
		});
		sources.set(row.reference_id, entries);
	}
	return sources;
}

function contextualize(
	item: Example | Resource,
	type: 'example' | 'resource',
	sources: ReferenceSource[],
	intent?: DesignIntent
): ReferenceWithContext {
	const relevant = intent ? new Set(filterChannelsByIntent(intent).map((c) => c.slug)) : null;
	sources = [...sources].sort((a, b) => {
		const rank = (slug: string) =>
			CHANNELS_WITH_CONTEXT.findIndex((channel) => channel.slug === slug);
		return (
			(rank(a.channel) < 0 ? Infinity : rank(a.channel)) -
			(rank(b.channel) < 0 ? Infinity : rank(b.channel))
		);
	});
	const primary = sources.find((source) => !relevant || relevant.has(source.channel));
	const channel = primary?.channel ?? sources[0]?.channel ?? null;
	const principles = new Set<string>();
	const tokens = new Map<string, TokenMapping>();
	for (const source of sources) {
		if (relevant && !relevant.has(source.channel)) continue;
		for (const principle of getPrinciplesForChannel(source.channel)) principles.add(principle);
		for (const token of getTokensForChannel(source.channel)) tokens.set(token.token, token);
	}
	return {
		id: item.id,
		type,
		title: item.title ?? 'Untitled',
		channel,
		channels: sources.map((source) => source.channel),
		sources,
		visual: generateVisualDescription(item, channel),
		principles: [...principles],
		tokens: [...tokens.values()],
		relatedIds: [],
		...(type === 'example'
			? { imageUrl: (item as Example).image_url }
			: { url: (item as Resource).url }),
		description: item.description,
		year: item.year
	};
}

/** Retrieve actual channel members; unattributed legacy rows are never guessed. */
export async function fetchReferencesWithContext(
	db: D1Database,
	options: { intent?: DesignIntent; limit?: number } = {}
): Promise<ReferenceWithContext[]> {
	const { intent } = options;
	const requestedLimit = options.limit ?? 50;
	const limit = Number.isFinite(requestedLimit)
		? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
		: 50;
	const channelSlugs = intent ? filterChannelsByIntent(intent).map((c) => c.slug) : [];
	if (intent && !channelSlugs.length) return [];
	const filter = intent
		? ` AND EXISTS (SELECT 1 FROM taste_reference_channels membership WHERE membership.reference_id = item.id AND membership.channel_slug IN (${channelSlugs.map(() => '?').join(',')}))`
		: '';
	const [examples, resources] = await Promise.all([
		db
			.prepare(
				`SELECT item.* FROM examples item WHERE item.master_id = ?${filter} ORDER BY item.created_at DESC, item.id LIMIT ?`
			)
			.bind(MASTER_ID, ...channelSlugs, limit)
			.all<Example>(),
		db
			.prepare(
				`SELECT item.* FROM resources item WHERE item.master_id = ?${filter} ORDER BY item.created_at DESC, item.id LIMIT ?`
			)
			.bind(MASTER_ID, ...channelSlugs, limit)
			.all<Resource>()
	]);
	const items = [
		...(examples.results ?? []).map((item) => ({ item, type: 'example' as const })),
		...(resources.results ?? []).map((item) => ({ item, type: 'resource' as const }))
	]
		.sort((a, b) => b.item.created_at - a.item.created_at || a.item.id.localeCompare(b.item.id))
		.slice(0, limit);
	const sources = await referenceSources(
		db,
		items.map(({ item }) => item.id)
	);
	return items.map(({ item, type }) =>
		contextualize(item, type, sources.get(item.id) ?? [], intent)
	);
}

/** Single-reference access uses the same verified provenance as list retrieval. */
export async function fetchReferenceById(
	db: D1Database,
	id: string
): Promise<ReferenceWithContext | null> {
	const example = await db.prepare('SELECT * FROM examples WHERE id = ?').bind(id).first<Example>();
	const resource = example
		? null
		: await db.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first<Resource>();
	const item = example ?? resource;
	if (!item) return null;
	const sources = await referenceSources(db, [id]);
	// Preserve the single-reference API's existing same-master suggestions.
	// Similarity does not establish channel membership or visual inspection.
	const related = example
		? await db
				.prepare(
					`SELECT id FROM examples WHERE master_id = ? AND id != ?
					 ORDER BY ABS(year - ?) ASC, created_at DESC LIMIT 5`
				)
				.bind(example.master_id, id, example.year ?? 2024)
				.all<{ id: string }>()
		: await db
				.prepare(
					`SELECT id FROM resources WHERE master_id = ? AND id != ?
					 ORDER BY created_at DESC LIMIT 5`
				)
				.bind(item.master_id ?? MASTER_ID, id)
				.all<{ id: string }>();
	return {
		...contextualize(item, example ? 'example' : 'resource', sources.get(id) ?? []),
		relatedIds: (related.results ?? []).map((reference) => reference.id)
	};
}
