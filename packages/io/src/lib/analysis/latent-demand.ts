/**
 * Latent Demand Analysis Framework
 *
 * "Find the intent users already have and steer it." — Boris Cherny
 *
 * This module provides tools for analyzing user behavior across CREATE SOMETHING
 * properties to identify:
 * 1. Feature abuse patterns (unintended but valuable uses)
 * 2. Latent user intents (what users are really trying to accomplish)
 * 3. Product direction opportunities (features to build based on findings)
 *
 * Philosophy: Users vote with their behavior. Listen to what they do, not just
 * what they say. Abuse patterns often reveal the features that should exist.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A CREATE SOMETHING property
 */
export type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';

/**
 * Category of user behavior signal
 */
export type SignalCategory =
	| 'navigation' // Page views, click paths
	| 'search' // Search queries, filters applied
	| 'interaction' // Button clicks, form submissions
	| 'content' // Content creation, editing, deletion
	| 'api' // API calls, integrations
	| 'error'; // Error encounters, failed attempts

/**
 * Raw behavioral signal from analytics
 */
export interface BehavioralSignal {
	/** Unique identifier */
	id: string;
	/** Which property this signal came from */
	property: Property;
	/** Category of signal */
	category: SignalCategory;
	/** Specific action (e.g., 'page_view', 'search', 'click') */
	action: string;
	/** Path or element identifier */
	target: string;
	/** Timestamp */
	timestamp: string;
	/** Additional context */
	metadata?: Record<string, unknown>;
	/** Session ID for grouping */
	sessionId?: string;
}

/**
 * A detected pattern of "feature abuse"
 * (using a feature in an unintended but valuable way)
 */
export interface AbusePattern {
	/** Pattern identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Description of the pattern */
	description: string;
	/** Which property this appears on */
	property: Property;
	/** The feature being "abused" */
	feature: string;
	/** What users are actually trying to accomplish */
	actualIntent: string;
	/** Number of times this pattern was observed */
	occurrences: number;
	/** Example sessions or actions */
	examples: string[];
	/** When first detected */
	firstSeen: string;
	/** When last detected */
	lastSeen: string;
	/** Severity/importance */
	importance: 'low' | 'medium' | 'high' | 'critical';
	/** Suggested product response */
	suggestion?: string;
}

/**
 * A documented user intent
 */
export interface UserIntent {
	/** Intent identifier */
	id: string;
	/** Short name */
	name: string;
	/** Full description of what users want to accomplish */
	description: string;
	/** How users currently try to accomplish this */
	currentWorkflow: string[];
	/** Pain points in current workflow */
	painPoints: string[];
	/** Evidence supporting this intent (signal IDs or patterns) */
	evidence: string[];
	/** Estimated frequency (users/week) */
	frequency: 'rare' | 'occasional' | 'common' | 'ubiquitous';
	/** Which properties this intent appears on */
	properties: Property[];
	/** Whether we currently support this intent well */
	supportLevel: 'unsupported' | 'partial' | 'workaround' | 'supported';
}

/**
 * A product direction proposal
 */
export interface ProductDirection {
	/** Direction identifier */
	id: string;
	/** Proposed feature or change */
	title: string;
	/** Full description */
	description: string;
	/** User intents this addresses */
	addressesIntents: string[];
	/** Abuse patterns this formalizes */
	formalizesPatterns: string[];
	/** Estimated impact */
	impact: 'minor' | 'moderate' | 'significant' | 'transformative';
	/** Estimated effort */
	effort: 'trivial' | 'small' | 'medium' | 'large' | 'epic';
	/** Priority score (impact / effort) */
	priorityScore: number;
	/** Recommended timeline */
	timeline: 'immediate' | 'short-term' | 'medium-term' | 'long-term' | 'exploratory';
	/** Which property this primarily affects */
	primaryProperty: Property;
	/** Notes and considerations */
	notes: string[];
}

/**
 * Complete analysis result
 */
export interface LatentDemandAnalysis {
	/** Analysis timestamp */
	timestamp: string;
	/** Analysis period */
	period: {
		start: string;
		end: string;
	};
	/** Properties analyzed */
	properties: Property[];
	/** Summary statistics */
	stats: {
		signalsAnalyzed: number;
		patternsDetected: number;
		intentsIdentified: number;
		directionsProposed: number;
	};
	/** Detected abuse patterns */
	abusePatterns: AbusePattern[];
	/** Documented user intents */
	userIntents: UserIntent[];
	/** Product direction proposals */
	productDirections: ProductDirection[];
}

// =============================================================================
// KNOWN ABUSE PATTERNS
// =============================================================================

/**
 * Pre-seeded abuse patterns observed in CREATE SOMETHING properties.
 * These represent known instances where users use features in unintended ways.
 */
export const KNOWN_ABUSE_PATTERNS: AbusePattern[] = [
	{
		id: 'search-as-nav',
		name: 'Search as Navigation',
		description: 'Users search for page names instead of using navigation',
		property: 'io',
		feature: 'search',
		actualIntent: 'Quick access to known content without navigating hierarchy',
		occurrences: 0, // Populated from analytics
		examples: [
			'Search: "papers"',
			'Search: "experiments"',
			'Search: "motion analysis"',
		],
		firstSeen: '2025-01-01',
		lastSeen: '2025-01-01',
		importance: 'medium',
		suggestion: 'Add command palette (Cmd+K) for quick navigation',
	},
	{
		id: 'template-config-json',
		name: 'Template Config via Raw JSON',
		description: 'Users edit raw JSON config instead of using UI controls',
		property: 'space',
		feature: 'templates',
		actualIntent: 'Fine-grained control over template configuration',
		occurrences: 0,
		examples: [
			'Direct edits to window.__SITE_CONFIG__',
			'Export/import JSON configs between sites',
		],
		firstSeen: '2025-01-01',
		lastSeen: '2025-01-01',
		importance: 'high',
		suggestion: 'Add advanced config editor with JSON view toggle',
	},
	{
		id: 'experiments-as-staging',
		name: 'Experiments as Staging',
		description: 'Users deploy "experiments" as staging environments',
		property: 'space',
		feature: 'experiments',
		actualIntent: 'Preview changes before production deployment',
		occurrences: 0,
		examples: [
			'Long-lived experiments with multiple revisions',
			'Sharing experiment URLs for client review',
		],
		firstSeen: '2025-01-01',
		lastSeen: '2025-01-01',
		importance: 'high',
		suggestion: 'Add explicit staging environment support',
	},
	{
		id: 'canon-audit-ci',
		name: 'Canon Audit in CI',
		description: 'Users run Canon audit manually in CI scripts',
		property: 'io',
		feature: 'canon-audit',
		actualIntent: 'Automated Canon compliance checking',
		occurrences: 0,
		examples: [
			'GitHub Actions calling triad-audit CLI',
			'Pre-commit hooks with canon checks',
		],
		firstSeen: '2025-01-01',
		lastSeen: '2025-01-01',
		importance: 'medium',
		suggestion: 'Provide official GitHub Action for Canon audit',
	},
	{
		id: 'lms-bookmark-progress',
		name: 'Bookmark as Progress Tracker',
		description: 'Users bookmark lesson pages instead of using progress tracker',
		property: 'lms',
		feature: 'lessons',
		actualIntent: 'Resume learning from where they left off',
		occurrences: 0,
		examples: [
			'Browser bookmarks to specific lesson URLs',
			'Note-taking apps with lesson links',
		],
		firstSeen: '2025-01-01',
		lastSeen: '2025-01-01',
		importance: 'medium',
		suggestion: 'Improve "continue learning" feature visibility',
	},
];

// =============================================================================
// KNOWN USER INTENTS
// =============================================================================

/**
 * Pre-seeded user intents derived from behavioral analysis.
 */
export const KNOWN_USER_INTENTS: UserIntent[] = [
	{
		id: 'quick-launch',
		name: 'Quick Site Launch',
		description: 'Users want to go from idea to live site as fast as possible',
		currentWorkflow: [
			'Sign up',
			'Choose template',
			'Configure basics',
			'Deploy',
		],
		painPoints: [
			'Template selection paralysis',
			'Configuration complexity',
			'Waiting for deployment',
		],
		evidence: ['template-config-json', 'experiments-as-staging'],
		frequency: 'common',
		properties: ['space'],
		supportLevel: 'partial',
	},
	{
		id: 'design-consistency',
		name: 'Maintain Design Consistency',
		description: 'Users want to ensure their sites follow design standards',
		currentWorkflow: [
			'Read Canon documentation',
			'Apply Canon classes manually',
			'Run audit periodically',
		],
		painPoints: [
			'Manual compliance checking',
			'Scattered documentation',
			'No real-time feedback',
		],
		evidence: ['canon-audit-ci'],
		frequency: 'occasional',
		properties: ['io', 'space'],
		supportLevel: 'workaround',
	},
	{
		id: 'learn-by-building',
		name: 'Learn by Building',
		description: 'Users learn best by working on real projects, not tutorials',
		currentWorkflow: [
			'Start with template',
			'Customize iteratively',
			'Learn through experimentation',
		],
		painPoints: [
			'Disconnect between learning and doing',
			'Tutorials feel artificial',
			'Hard to apply lessons to real work',
		],
		evidence: ['experiments-as-staging'],
		frequency: 'common',
		properties: ['lms', 'space'],
		supportLevel: 'partial',
	},
	{
		id: 'keyboard-first',
		name: 'Keyboard-First Navigation',
		description: 'Power users prefer keyboard shortcuts over mouse navigation',
		currentWorkflow: [
			'Tab through interface',
			'Use browser shortcuts',
			'Search to navigate',
		],
		painPoints: [
			'Limited keyboard shortcuts',
			'No command palette',
			'Inconsistent focus management',
		],
		evidence: ['search-as-nav'],
		frequency: 'occasional',
		properties: ['io', 'space', 'lms'],
		supportLevel: 'unsupported',
	},
	{
		id: 'client-preview',
		name: 'Client Preview Sharing',
		description: 'Agency users want to share work-in-progress with clients',
		currentWorkflow: [
			'Deploy experiment',
			'Share URL manually',
			'Collect feedback via email',
		],
		painPoints: [
			'No formal preview system',
			'Feedback not centralized',
			'Versioning confusion',
		],
		evidence: ['experiments-as-staging'],
		frequency: 'common',
		properties: ['agency', 'space'],
		supportLevel: 'workaround',
	},
];

// =============================================================================
// PRODUCT DIRECTIONS
// =============================================================================

/**
 * Product direction proposals based on identified patterns and intents.
 */
export const PROPOSED_DIRECTIONS: ProductDirection[] = [
	{
		id: 'command-palette',
		title: 'Universal Command Palette',
		description:
			'Add Cmd+K command palette across all properties for quick navigation, search, and actions',
		addressesIntents: ['quick-launch', 'keyboard-first'],
		formalizesPatterns: ['search-as-nav'],
		impact: 'significant',
		effort: 'medium',
		priorityScore: 3.5,
		timeline: 'short-term',
		primaryProperty: 'io',
		notes: [
			'Use existing search infrastructure',
			'Include actions (create, deploy, audit)',
			'Context-aware suggestions',
		],
	},
	{
		id: 'staging-environments',
		title: 'Explicit Staging Environments',
		description:
			'Add first-class staging support with preview URLs and easy promotion to production',
		addressesIntents: ['client-preview', 'quick-launch'],
		formalizesPatterns: ['experiments-as-staging'],
		impact: 'significant',
		effort: 'large',
		priorityScore: 2.5,
		timeline: 'medium-term',
		primaryProperty: 'space',
		notes: [
			'Could use existing experiment infrastructure',
			'Add "promote to production" flow',
			'Include preview password protection',
		],
	},
	{
		id: 'canon-github-action',
		title: 'Canon Audit GitHub Action',
		description:
			'Official GitHub Action for running Canon audits in CI pipelines',
		addressesIntents: ['design-consistency'],
		formalizesPatterns: ['canon-audit-ci'],
		impact: 'moderate',
		effort: 'small',
		priorityScore: 4.0,
		timeline: 'immediate',
		primaryProperty: 'io',
		notes: [
			'Wrap existing triad-audit CLI',
			'PR annotations for violations',
			'Badge generation for README',
		],
	},
	{
		id: 'advanced-config-editor',
		title: 'Advanced Configuration Editor',
		description:
			'JSON-aware editor for template config with validation and schema',
		addressesIntents: ['quick-launch'],
		formalizesPatterns: ['template-config-json'],
		impact: 'moderate',
		effort: 'medium',
		priorityScore: 2.0,
		timeline: 'medium-term',
		primaryProperty: 'space',
		notes: [
			'Monaco editor integration',
			'Live preview of changes',
			'Export/import functionality',
		],
	},
	{
		id: 'learning-path-projects',
		title: 'Project-Based Learning Paths',
		description:
			'Learning paths structured around building real projects rather than isolated lessons',
		addressesIntents: ['learn-by-building'],
		formalizesPatterns: [],
		impact: 'transformative',
		effort: 'epic',
		priorityScore: 1.5,
		timeline: 'long-term',
		primaryProperty: 'lms',
		notes: [
			'Integrate with .space templates',
			'Progressive disclosure of concepts',
			'Portfolio output for each path',
		],
	},
];

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Generate a complete latent demand analysis from the known patterns and intents.
 */
export function generateAnalysis(): LatentDemandAnalysis {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Sort directions by priority score
	const sortedDirections = [...PROPOSED_DIRECTIONS].sort(
		(a, b) => b.priorityScore - a.priorityScore
	);

	return {
		timestamp: now.toISOString(),
		period: {
			start: thirtyDaysAgo.toISOString(),
			end: now.toISOString(),
		},
		properties: ['space', 'io', 'agency', 'ltd', 'lms'],
		stats: {
			signalsAnalyzed: 0, // Would come from actual analytics
			patternsDetected: KNOWN_ABUSE_PATTERNS.length,
			intentsIdentified: KNOWN_USER_INTENTS.length,
			directionsProposed: PROPOSED_DIRECTIONS.length,
		},
		abusePatterns: KNOWN_ABUSE_PATTERNS,
		userIntents: KNOWN_USER_INTENTS,
		productDirections: sortedDirections,
	};
}

/**
 * Get abuse patterns by importance level
 */
export function getPatternsByImportance(
	importance: AbusePattern['importance']
): AbusePattern[] {
	return KNOWN_ABUSE_PATTERNS.filter((p) => p.importance === importance);
}

/**
 * Get user intents by support level
 */
export function getIntentsBySupportLevel(
	level: UserIntent['supportLevel']
): UserIntent[] {
	return KNOWN_USER_INTENTS.filter((i) => i.supportLevel === level);
}

/**
 * Get prioritized product directions
 */
export function getPrioritizedDirections(): ProductDirection[] {
	return [...PROPOSED_DIRECTIONS].sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Get directions by timeline
 */
export function getDirectionsByTimeline(
	timeline: ProductDirection['timeline']
): ProductDirection[] {
	return PROPOSED_DIRECTIONS.filter((d) => d.timeline === timeline);
}

/**
 * Format analysis as markdown report
 */
export function formatAnalysisReport(analysis: LatentDemandAnalysis): string {
	const lines: string[] = [];

	lines.push('# Latent Demand Analysis Report');
	lines.push('');
	lines.push(`Generated: ${new Date(analysis.timestamp).toLocaleString()}`);
	lines.push(`Period: ${analysis.period.start.split('T')[0]} to ${analysis.period.end.split('T')[0]}`);
	lines.push('');

	lines.push('## Summary');
	lines.push('');
	lines.push(`- **Patterns Detected**: ${analysis.stats.patternsDetected}`);
	lines.push(`- **Intents Identified**: ${analysis.stats.intentsIdentified}`);
	lines.push(`- **Directions Proposed**: ${analysis.stats.directionsProposed}`);
	lines.push('');

	lines.push('## Feature Abuse Patterns');
	lines.push('');
	lines.push('Users using features in unintended but valuable ways:');
	lines.push('');

	for (const pattern of analysis.abusePatterns) {
		lines.push(`### ${pattern.name}`);
		lines.push('');
		lines.push(`**Property**: ${pattern.property}`);
		lines.push(`**Importance**: ${pattern.importance}`);
		lines.push('');
		lines.push(pattern.description);
		lines.push('');
		lines.push(`**Actual Intent**: ${pattern.actualIntent}`);
		lines.push('');
		if (pattern.suggestion) {
			lines.push(`**Suggestion**: ${pattern.suggestion}`);
			lines.push('');
		}
	}

	lines.push('## User Intents');
	lines.push('');
	lines.push('What users are actually trying to accomplish:');
	lines.push('');

	for (const intent of analysis.userIntents) {
		lines.push(`### ${intent.name}`);
		lines.push('');
		lines.push(`**Frequency**: ${intent.frequency}`);
		lines.push(`**Support Level**: ${intent.supportLevel}`);
		lines.push(`**Properties**: ${intent.properties.join(', ')}`);
		lines.push('');
		lines.push(intent.description);
		lines.push('');
		if (intent.painPoints.length > 0) {
			lines.push('**Pain Points**:');
			for (const pain of intent.painPoints) {
				lines.push(`- ${pain}`);
			}
			lines.push('');
		}
	}

	lines.push('## Product Directions');
	lines.push('');
	lines.push('Recommended features based on findings (sorted by priority):');
	lines.push('');

	for (const direction of analysis.productDirections) {
		lines.push(`### ${direction.title}`);
		lines.push('');
		lines.push(`**Impact**: ${direction.impact} | **Effort**: ${direction.effort} | **Priority Score**: ${direction.priorityScore}`);
		lines.push(`**Timeline**: ${direction.timeline}`);
		lines.push(`**Primary Property**: ${direction.primaryProperty}`);
		lines.push('');
		lines.push(direction.description);
		lines.push('');
		if (direction.notes.length > 0) {
			lines.push('**Notes**:');
			for (const note of direction.notes) {
				lines.push(`- ${note}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}
