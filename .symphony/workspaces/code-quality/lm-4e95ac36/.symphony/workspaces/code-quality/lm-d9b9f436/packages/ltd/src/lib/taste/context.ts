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
export interface VisualDescription {
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
	channel: string;
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
			'200ms for micro-interactions (--duration-micro)',
			'Single easing curve for consistency (--ease-standard)',
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
		'Subtle: --duration-micro (200ms) for most interactions',
		'Consistent: One easing curve (--ease-standard)',
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
		token: '--color-bg-pure',
		value: '#000000',
		category: 'color',
		derivedFrom: 'Rams black backgrounds, brutalist web'
	},
	{
		token: '--color-fg-primary',
		value: '#ffffff',
		category: 'color',
		derivedFrom: 'High contrast accessibility'
	},
	{
		token: '--color-fg-secondary',
		value: 'rgba(255, 255, 255, 0.8)',
		category: 'color',
		derivedFrom: 'Swiss design hierarchy'
	},
	{
		token: '--color-fg-muted',
		value: 'rgba(255, 255, 255, 0.46)',
		category: 'color',
		derivedFrom: "Rams' muted grays, WCAG AA minimum"
	},
	// Spacing
	{
		token: '--space-sm',
		value: '1rem',
		category: 'spacing',
		derivedFrom: 'Swiss grid proportions'
	},
	{
		token: '--space-md',
		value: '1.618rem',
		category: 'spacing',
		derivedFrom: 'Golden ratio (phi = 1.618)'
	},
	{
		token: '--space-lg',
		value: '2.618rem',
		category: 'spacing',
		derivedFrom: 'Golden ratio progression'
	},
	// Radius
	{
		token: '--radius-sm',
		value: '6px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	{
		token: '--radius-md',
		value: '8px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	{
		token: '--radius-lg',
		value: '12px',
		category: 'radius',
		derivedFrom: 'Braun product corners'
	},
	// Motion
	{
		token: '--duration-micro',
		value: '200ms',
		category: 'motion',
		derivedFrom: 'Minimal motion references'
	},
	{
		token: '--duration-standard',
		value: '300ms',
		category: 'motion',
		derivedFrom: 'Interface motion patterns'
	},
	{
		token: '--ease-standard',
		value: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
		category: 'motion',
		derivedFrom: 'Material Design easing'
	},
	// Typography
	{
		token: '--text-body',
		value: '1rem',
		category: 'typography',
		derivedFrom: 'Swiss typography standards'
	},
	{
		token: '--text-body-sm',
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
export function filterTokensByCategory(
	category: TokenMapping['category']
): TokenMapping[] {
	return CORE_TOKEN_MAPPINGS.filter((token) => token.category === category);
}

/**
 * Generate visual description from Example or Resource
 * This provides textual context for agents without vision
 */
export function generateVisualDescription(
	item: Example | Resource,
	channel: string
): VisualDescription {
	const channelContext = CHANNELS_WITH_CONTEXT.find((c) => c.slug === channel);

	// Build description from available data
	const parts: string[] = [];

	if (item.title) {
		parts.push(item.title);
	}

	if (item.description) {
		parts.push(item.description);
	}

	// Add channel context
	if (channelContext) {
		parts.push(`From ${channelContext.name} collection.`);
	}

	// Infer style from channel
	const style = inferStyleFromChannel(channel);

	return {
		summary: parts.join('. ') || 'Visual reference from taste collection',
		style,
		composition: inferCompositionFromChannel(channel)
	};
}

/**
 * Infer visual style from channel slug
 */
function inferStyleFromChannel(channel: string): string {
	if (channel.includes('minimal')) return 'minimalist';
	if (channel.includes('brutalist')) return 'brutalist';
	if (channel.includes('swiss')) return 'Swiss International Style';
	if (channel.includes('rams') || channel.includes('dieter')) return 'Braun industrial';
	if (channel.includes('motion')) return 'motion-focused';
	return 'curated reference';
}

/**
 * Infer composition style from channel
 */
function inferCompositionFromChannel(channel: string): string {
	if (channel.includes('swiss')) return 'Grid-based, asymmetric balance';
	if (channel.includes('brutalist')) return 'Raw, exposed structure';
	if (channel.includes('minimal')) return 'Generous negative space';
	if (channel.includes('motion')) return 'Temporal, state-transition focused';
	return 'Curated visual composition';
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

	// Get last sync time
	const lastSyncResult = await db
		.prepare(
			`SELECT MAX(created_at) as last_sync FROM examples WHERE master_id = ?`
		)
		.bind(MASTER_ID)
		.first<{ last_sync: number | null }>();

	const stats: TasteStats = {
		totalExamples: examplesResult?.count ?? 0,
		totalResources: resourcesResult?.count ?? 0,
		channelsCurated: CHANNELS_WITH_CONTEXT.length,
		lastSync: lastSyncResult?.last_sync
			? new Date(lastSyncResult.last_sync * 1000).toISOString()
			: null
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
		version: '1.0.0',
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
 * Fetch references with full context
 */
export async function fetchReferencesWithContext(
	db: D1Database,
	options: { intent?: DesignIntent; limit?: number } = {}
): Promise<ReferenceWithContext[]> {
	const { intent, limit = 50 } = options;

	// Get channel slugs to filter if intent specified
	const channelSlugs = intent
		? filterChannelsByIntent(intent).map((c) => c.slug)
		: CHANNELS_WITH_CONTEXT.map((c) => c.slug);

	// Fetch examples
	const examplesResult = await db
		.prepare(
			`SELECT * FROM examples WHERE master_id = ? ORDER BY created_at DESC LIMIT ?`
		)
		.bind(MASTER_ID, limit)
		.all<Example>();

	// Fetch resources
	const resourcesResult = await db
		.prepare(
			`SELECT * FROM resources WHERE master_id = ? ORDER BY created_at DESC LIMIT ?`
		)
		.bind(MASTER_ID, limit)
		.all<Resource>();

	const references: ReferenceWithContext[] = [];

	// Transform examples
	for (const example of examplesResult.results ?? []) {
		// Infer channel from source (would need to be stored)
		// For now, use first primary channel
		const channel = channelSlugs[0] ?? 'canon-minimalism';

		references.push({
			id: example.id,
			type: 'example',
			title: example.title ?? 'Untitled',
			channel,
			visual: generateVisualDescription(example, channel),
			principles: getPrinciplesForChannel(channel),
			tokens: getTokensForChannel(channel),
			relatedIds: [], // Would require relationship table
			imageUrl: example.image_url,
			description: example.description,
			year: example.year
		});
	}

	// Transform resources
	for (const resource of resourcesResult.results ?? []) {
		const channel = channelSlugs[0] ?? 'canon-minimalism';

		references.push({
			id: resource.id,
			type: 'resource',
			title: resource.title,
			channel,
			visual: generateVisualDescription(resource, channel),
			principles: getPrinciplesForChannel(channel),
			tokens: getTokensForChannel(channel),
			relatedIds: [],
			url: resource.url,
			description: resource.description,
			year: resource.year
		});
	}

	return references.slice(0, limit);
}

/**
 * Fetch a single reference by ID with full context
 */
export async function fetchReferenceById(
	db: D1Database,
	id: string
): Promise<ReferenceWithContext | null> {
	// Try examples first
	const example = await db
		.prepare(`SELECT * FROM examples WHERE id = ?`)
		.bind(id)
		.first<Example>();

	if (example) {
		const channel = 'canon-minimalism'; // Would need channel tracking

		// Find related references (same channel, similar time period)
		const relatedResult = await db
			.prepare(
				`SELECT id FROM examples
				 WHERE master_id = ? AND id != ?
				 ORDER BY ABS(year - ?) ASC, created_at DESC
				 LIMIT 5`
			)
			.bind(example.master_id, id, example.year ?? 2024)
			.all<{ id: string }>();

		return {
			id: example.id,
			type: 'example',
			title: example.title ?? 'Untitled',
			channel,
			visual: generateVisualDescription(example, channel),
			principles: getPrinciplesForChannel(channel),
			tokens: getTokensForChannel(channel),
			relatedIds: (relatedResult.results ?? []).map((r) => r.id),
			imageUrl: example.image_url,
			description: example.description,
			year: example.year
		};
	}

	// Try resources
	const resource = await db
		.prepare(`SELECT * FROM resources WHERE id = ?`)
		.bind(id)
		.first<Resource>();

	if (resource) {
		const channel = 'canon-minimalism';

		const relatedResult = await db
			.prepare(
				`SELECT id FROM resources
				 WHERE master_id = ? AND id != ?
				 ORDER BY created_at DESC
				 LIMIT 5`
			)
			.bind(resource.master_id ?? MASTER_ID, id)
			.all<{ id: string }>();

		return {
			id: resource.id,
			type: 'resource',
			title: resource.title,
			channel,
			visual: generateVisualDescription(resource, channel),
			principles: getPrinciplesForChannel(channel),
			tokens: getTokensForChannel(channel),
			relatedIds: (relatedResult.results ?? []).map((r) => r.id),
			url: resource.url,
			description: resource.description,
			year: resource.year
		};
	}

	return null;
}
