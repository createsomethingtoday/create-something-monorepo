/**
 * PR Feedback Pattern Types
 *
 * Track repeated feedback patterns in PR comments to identify
 * opportunities for automated lint rules.
 *
 * Philosophy: If you say it twice, automate it.
 * Reference: Boris Cherny interview on Claude Code development.
 */

import type { Severity } from './base.js';

// =============================================================================
// FEEDBACK PATTERN TYPES
// =============================================================================

/**
 * Category of feedback - maps to potential automation types
 */
export type FeedbackCategory =
	| 'style' // Code style issues (eslint-fixable)
	| 'naming' // Variable/function naming conventions
	| 'structure' // Code organization patterns
	| 'performance' // Performance concerns
	| 'security' // Security issues
	| 'accessibility' // A11y concerns
	| 'canon' // CREATE SOMETHING Canon violations
	| 'documentation' // Missing or incorrect docs
	| 'testing' // Test coverage/quality
	| 'other'; // Uncategorized

/**
 * Single PR comment feedback entry
 */
export interface FeedbackEntry {
	/** Unique identifier */
	id: string;
	/** When the feedback was given */
	timestamp: string;
	/** PR number or identifier */
	prId: string;
	/** File path the comment was on */
	file?: string;
	/** Line number if applicable */
	line?: number;
	/** The actual comment text */
	comment: string;
	/** Categorization of the feedback */
	category: FeedbackCategory;
	/** Machine-detected or human-assigned pattern */
	pattern?: string;
	/** Who gave the feedback */
	reviewer?: string;
	/** Severity assessment */
	severity: Severity;
	/** Tags for filtering */
	tags: string[];
	/** Whether this has been addressed by automation */
	automated: boolean;
}

/**
 * A detected pattern of repeated feedback
 */
export interface FeedbackPattern {
	/** Pattern identifier (slugified) */
	id: string;
	/** Human-readable pattern name */
	name: string;
	/** Description of the pattern */
	description: string;
	/** Category this pattern belongs to */
	category: FeedbackCategory;
	/** Number of times this pattern has appeared */
	occurrences: number;
	/** IDs of feedback entries matching this pattern */
	feedbackIds: string[];
	/** Example comments that match this pattern */
	examples: string[];
	/** First seen timestamp */
	firstSeen: string;
	/** Last seen timestamp */
	lastSeen: string;
	/** Has this been converted to a lint rule? */
	automated: boolean;
	/** If automated, what rule was created? */
	automationRef?: string;
	/** Suggested automation approach */
	automationSuggestion?: AutomationSuggestion;
}

/**
 * Suggestion for how to automate a pattern
 */
export interface AutomationSuggestion {
	type: 'eslint' | 'svelte' | 'canon' | 'custom';
	/** Template or rule suggestion */
	template?: string;
	/** Effort estimate */
	effort: 'trivial' | 'easy' | 'medium' | 'hard';
	/** Notes on implementation */
	notes?: string;
}

// =============================================================================
// THRESHOLD CONFIGURATION
// =============================================================================

/**
 * Configuration for pattern detection thresholds
 */
export interface FeedbackThresholds {
	/** Minimum occurrences to flag as pattern (default: 3) */
	minOccurrences: number;
	/** Days of inactivity before pattern is considered stale (default: 90) */
	staleDays: number;
	/** Minimum similarity score for pattern matching (0-1, default: 0.7) */
	similarityThreshold: number;
}

export const DEFAULT_FEEDBACK_THRESHOLDS: FeedbackThresholds = {
	minOccurrences: 3,
	staleDays: 90,
	similarityThreshold: 0.7
};

// =============================================================================
// STORAGE AND ANALYSIS
// =============================================================================

/**
 * Feedback tracker state
 */
export interface FeedbackTrackerState {
	/** All feedback entries */
	entries: FeedbackEntry[];
	/** Detected patterns */
	patterns: FeedbackPattern[];
	/** Last analysis timestamp */
	lastAnalysis: string;
	/** Configuration */
	thresholds: FeedbackThresholds;
}

/**
 * Analysis result from pattern detection
 */
export interface PatternAnalysisResult {
	/** Newly detected patterns */
	newPatterns: FeedbackPattern[];
	/** Patterns that crossed the automation threshold */
	readyForAutomation: FeedbackPattern[];
	/** Patterns updated with new occurrences */
	updatedPatterns: FeedbackPattern[];
	/** Summary statistics */
	stats: {
		totalEntries: number;
		totalPatterns: number;
		automatedCount: number;
		pendingAutomation: number;
		categoryCounts: Record<FeedbackCategory, number>;
	};
}

// =============================================================================
// KNOWN PATTERN TEMPLATES
// =============================================================================

/**
 * Pre-defined patterns for common PR feedback
 * Used to bootstrap pattern detection with known issues
 */
export const KNOWN_FEEDBACK_PATTERNS: Array<{
	pattern: RegExp;
	name: string;
	category: FeedbackCategory;
	automationSuggestion?: AutomationSuggestion;
}> = [
	// Style patterns
	{
		pattern: /use\s+(canon|design)?\s*tokens?\s*(instead|for)/i,
		name: 'missing-canon-tokens',
		category: 'canon',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Extend canon-audit to flag hardcoded values'
		}
	},
	{
		pattern: /prefer\s+(const|let)\s+over\s+(var|let|const)/i,
		name: 'variable-declaration-style',
		category: 'style',
		automationSuggestion: {
			type: 'eslint',
			template: 'prefer-const',
			effort: 'trivial'
		}
	},
	{
		pattern: /unused\s+(import|variable|function|export)/i,
		name: 'unused-code',
		category: 'style',
		automationSuggestion: {
			type: 'eslint',
			template: 'no-unused-vars',
			effort: 'trivial'
		}
	},
	{
		pattern: /missing\s+(type|interface|annotation)/i,
		name: 'missing-types',
		category: 'style',
		automationSuggestion: {
			type: 'eslint',
			template: '@typescript-eslint/explicit-function-return-type',
			effort: 'easy'
		}
	},

	// Naming patterns
	{
		pattern: /rename\s+(this|the)?\s*(to|as)\s+/i,
		name: 'naming-suggestion',
		category: 'naming'
	},
	{
		pattern: /(naming|name)\s+(convention|pattern)/i,
		name: 'naming-convention-violation',
		category: 'naming'
	},

	// Structure patterns
	{
		pattern: /extract\s+(this|into)\s+(a\s+)?(function|component|module)/i,
		name: 'needs-extraction',
		category: 'structure',
		automationSuggestion: {
			type: 'custom',
			effort: 'hard',
			notes: 'Complex refactoring - flag for manual review'
		}
	},
	{
		pattern: /this\s+(should|could)\s+be\s+(split|broken)/i,
		name: 'needs-splitting',
		category: 'structure'
	},

	// Security patterns
	{
		pattern: /(sanitize|escape|validate)\s+(input|user|data)/i,
		name: 'missing-input-validation',
		category: 'security',
		automationSuggestion: {
			type: 'eslint',
			effort: 'medium',
			notes: 'Consider eslint-plugin-security'
		}
	},

	// Canon-specific patterns
	{
		pattern: /tailwind\s+for\s+(design|aesthetics)|bg-white|text-gray/i,
		name: 'tailwind-design-violation',
		category: 'canon',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Already handled by canon-audit'
		}
	},
	{
		pattern: /hardcoded\s+(color|font|spacing|radius)/i,
		name: 'hardcoded-design-values',
		category: 'canon',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Canon audit should catch these'
		}
	},

	// Documentation patterns
	{
		pattern: /add\s+(a\s+)?(comment|jsdoc|documentation)/i,
		name: 'missing-documentation',
		category: 'documentation',
		automationSuggestion: {
			type: 'eslint',
			template: 'jsdoc/require-jsdoc',
			effort: 'easy'
		}
	},

	// Testing patterns
	{
		pattern: /needs?\s+(tests?|coverage|assertions?)/i,
		name: 'missing-tests',
		category: 'testing'
	},

	// Accessibility patterns
	{
		pattern: /(aria|alt|role|label)\s*(attribute|missing|add)/i,
		name: 'missing-a11y-attributes',
		category: 'accessibility',
		automationSuggestion: {
			type: 'eslint',
			template: 'jsx-a11y/*',
			effort: 'easy'
		}
	}
];
