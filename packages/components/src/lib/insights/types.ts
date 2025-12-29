/**
 * KeyInsight Component System Types
 *
 * Shareable, exportable insight visuals for papers, presentations, and social media.
 * Follows Canon design principles: "Less, but better."
 */

import type { Property } from '../analytics/types.js';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * A word in a statement with revelation metadata
 */
export interface StatementWord {
	/** The word text */
	text: string;
	/** Whether this word survives the subtraction (kept in final insight) */
	keep: boolean;
	/** Optional emphasis (makes word bolder when revealed) */
	emphasis?: boolean;
}

/**
 * A statement that reveals through subtraction
 */
export interface Statement {
	/** Words with keep/remove metadata */
	words: StatementWord[];
	/** The revealed essence (what remains after subtraction) */
	essence?: string;
}

/**
 * Comparison row for bug/fix or before/after patterns
 */
export interface ComparisonRow {
	/** Label for the row (e.g., "Bug", "Fix", "Before", "After") */
	label: string;
	/** Code or formula to display */
	code: string;
	/** Result or consequence */
	result: string;
	/** Semantic type for styling */
	type: 'negative' | 'positive' | 'neutral';
}

/**
 * Full insight configuration
 */
export interface InsightConfig {
	/** Unique identifier/slug */
	id: string;
	/** The statement to reveal (optional - for animated text) */
	statement?: Statement;
	/** Static principle text (for non-animated display) */
	principle: string;
	/** Optional comparison rows (bug/fix pattern) */
	comparison?: ComparisonRow[];
	/** Source paper or context */
	source?: {
		title: string;
		url: string;
		property: Property;
	};
	/** Paper ID for reference */
	paperId?: string;
	/** Category/topic */
	category?: string;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

/** Export format options */
export type ExportFormat = 'og' | 'instagram' | 'twitter' | 'presentation' | 'square';

/** Export dimensions by format */
export const EXPORT_DIMENSIONS: Record<ExportFormat, { width: number; height: number }> = {
	og: { width: 1200, height: 630 },
	instagram: { width: 1080, height: 1080 },
	twitter: { width: 1200, height: 675 },
	presentation: { width: 1920, height: 1080 },
	square: { width: 1200, height: 1200 }
};

// =============================================================================
// ANIMATION TYPES
// =============================================================================

/** Animation phase for statement revelation */
export type RevelationPhase = 'reading' | 'striking' | 'fading' | 'coalescing' | 'complete';

/** Animation configuration */
export interface AnimationConfig {
	/** Enable animation (false for static export) */
	enabled: boolean;
	/** Trigger type */
	trigger: 'scroll' | 'click' | 'auto' | 'none';
	/** Auto-play delay in ms (for trigger: 'auto') */
	autoDelay?: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface KeyInsightProps {
	/** Insight configuration */
	insight: InsightConfig;
	/** Property for branding */
	property?: Property;
	/** Animation configuration */
	animation?: AnimationConfig;
	/** Show export button */
	showExport?: boolean;
	/** Variant: full-screen or inline */
	variant?: 'fullscreen' | 'inline' | 'card';
	/** Animation direction: forward (full→essence) or reverse (essence→full) */
	direction?: 'forward' | 'reverse';
	/** Additional CSS classes */
	class?: string;
}

export interface StatementTextProps {
	/** Statement with word-level metadata */
	statement: Statement;
	/** Current animation phase */
	phase?: RevelationPhase;
	/** Progress through animation (0-1) */
	progress?: number;
	/** Size variant */
	size?: 'display' | 'headline' | 'body';
	/** Animation direction: forward (full→essence) or reverse (essence→full) */
	direction?: 'forward' | 'reverse';
	/** Additional CSS classes */
	class?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse a marked-up string into a Statement
 * Words wrapped in **double asterisks** are kept, others are removed
 *
 * @example
 * parseStatement("We help **remove** **what** **obscures.**")
 * // Returns: { words: [...], essence: "remove what obscures." }
 */
export function parseStatement(input: string): Statement {
	const words: StatementWord[] = [];
	const keptWords: string[] = [];

	// Split by spaces, preserving markdown markers
	const tokens = input.split(/\s+/);

	for (const token of tokens) {
		// Check for **kept** pattern
		const keepMatch = token.match(/^\*\*(.+?)\*\*$/);
		if (keepMatch) {
			const text = keepMatch[1];
			words.push({ text, keep: true });
			keptWords.push(text);
		} else if (token.trim()) {
			words.push({ text: token, keep: false });
		}
	}

	return {
		words,
		essence: keptWords.join(' ')
	};
}

/**
 * Create an insight config from common patterns
 */
export function createInsight(
	id: string,
	principle: string,
	options?: Partial<InsightConfig>
): InsightConfig {
	return {
		id,
		principle,
		...options
	};
}

/**
 * Create a bug/fix comparison
 */
export function createBugFixComparison(
	bugCode: string,
	bugResult: string,
	fixCode: string,
	fixResult: string
): ComparisonRow[] {
	return [
		{ label: 'Bug', code: bugCode, result: bugResult, type: 'negative' },
		{ label: 'Fix', code: fixCode, result: fixResult, type: 'positive' }
	];
}
