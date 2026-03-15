/**
 * Canon Audit Integration
 *
 * Bridges feedback pattern detection with Canon audit rule generation.
 * Detects when repeated feedback suggests a new Canon pattern that should
 * be enforced automatically.
 *
 * Example: If "missing-canon-tokens" appears 5+ times, suggest adding to canon-audit.
 */

import type { FeedbackPattern, AutomationSuggestion } from '../types/feedback.js';

// =============================================================================
// CANON PATTERN SUGGESTIONS
// =============================================================================

/**
 * Canonical patterns that should be suggested when feedback reaches threshold
 */
export const CANON_PATTERN_SUGGESTIONS: Array<{
	patternId: string;
	feedbackKeywords: string[];
	canonCheckName: string;
	automationSuggestion: AutomationSuggestion;
	description: string;
}> = [
	{
		patternId: 'missing-canon-tokens',
		feedbackKeywords: ['use canon', 'use design', 'design token', 'tailwind design'],
		canonCheckName: 'hardcoded-design-values',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Extend canon-audit to flag hardcoded colors, spacing, shadows, radius'
		},
		description:
			'Code uses hardcoded colors/spacing instead of Canon tokens. Extend canon-audit detector.'
	},
	{
		patternId: 'hardcoded-colors',
		feedbackKeywords: ['hardcoded color', 'hardcoded #', 'color value', 'rgb('],
		canonCheckName: 'hardcoded-colors',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Add regex detection for hex colors and rgb() values in CSS/Svelte'
		},
		description: 'CSS contains hardcoded color values instead of --color-* tokens.'
	},
	{
		patternId: 'hardcoded-sizing',
		feedbackKeywords: ['hardcoded spacing', 'hardcoded height', 'hardcoded padding', 'px value'],
		canonCheckName: 'hardcoded-sizing',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Add detection for hardcoded px values, should use --space-* tokens'
		},
		description: 'CSS contains hardcoded pixel values instead of --space-* tokens.'
	},
	{
		patternId: 'tailwind-design-utilities',
		feedbackKeywords: ['tailwind design', 'bg-white', 'text-gray', 'rounded-'],
		canonCheckName: 'tailwind-design',
		automationSuggestion: {
			type: 'canon',
			effort: 'medium',
			notes: 'Extend canon-audit to flag specific Tailwind design utilities'
		},
		description:
			'Code uses Tailwind design utilities (bg-*, text-*, rounded-*) instead of moving to <style> block with Canon tokens.'
	},
	{
		patternId: 'invalid-typography-scale',
		feedbackKeywords: ['typography scale', 'text size', 'font-size', 'text-xs', 'text-4xl'],
		canonCheckName: 'typography-scale',
		automationSuggestion: {
			type: 'canon',
			effort: 'easy',
			notes: 'Add detection for arbitrary text sizes, should use --text-* tokens'
		},
		description:
			'Code uses arbitrary font sizes or wrong Tailwind text utilities instead of Canon typography scale.'
	}
];

// =============================================================================
// CANON PATTERN DETECTION
// =============================================================================

/**
 * Analyze feedback patterns and suggest Canon audit enhancements
 */
export function suggestCanonEnhancements(patterns: FeedbackPattern[]): Array<{
	pattern: FeedbackPattern;
	suggestion: AutomationSuggestion;
	canonCheck: string;
}> {
	const suggestions: Array<{
		pattern: FeedbackPattern;
		suggestion: AutomationSuggestion;
		canonCheck: string;
	}> = [];

	for (const pattern of patterns) {
		if (pattern.category !== 'canon') {
			continue;
		}

		// Check if this pattern matches a known Canon pattern
		const match = findCanonPatternMatch(pattern);
		if (match) {
			suggestions.push({
				pattern,
				suggestion: match.automationSuggestion,
				canonCheck: match.canonCheckName
			});
		}
	}

	return suggestions;
}

/**
 * Find matching Canon pattern for feedback pattern
 */
export function findCanonPatternMatch(
	pattern: FeedbackPattern
): (typeof CANON_PATTERN_SUGGESTIONS)[0] | null {
	const lowerName = pattern.name.toLowerCase();
	const lowerDesc = pattern.description.toLowerCase();
	const exampleText = pattern.examples.join(' ').toLowerCase();

	// Try exact ID match first
	let match = CANON_PATTERN_SUGGESTIONS.find((c) => c.patternId === pattern.id);
	if (match) return match;

	// Try keyword matching
	for (const canonical of CANON_PATTERN_SUGGESTIONS) {
		for (const keyword of canonical.feedbackKeywords) {
			if (
				lowerName.includes(keyword) ||
				lowerDesc.includes(keyword) ||
				exampleText.includes(keyword)
			) {
				return canonical;
			}
		}
	}

	return null;
}

// =============================================================================
// CANON AUDIT INTEGRATION HELPERS
// =============================================================================

/**
 * Generate Canon audit integration code snippet
 * Use when a new pattern should be added to canon-audit
 */
export function generateCanonAuditIntegration(
	pattern: FeedbackPattern,
	canonMatch: (typeof CANON_PATTERN_SUGGESTIONS)[0]
): string {
	return `/**
 * Canon Pattern: ${pattern.name}
 *
 * Feedback pattern: ${pattern.id}
 * Occurrences: ${pattern.occurrences}
 *
 * Integration notes:
 * ${canonMatch.description}
 *
 * Examples:
${pattern.examples.map((ex) => ` * - "${ex.slice(0, 60)}${ex.length > 60 ? '...' : ''}"`).join('\n')}
 *
 * Implementation:
 * Add to packages/triad-audit/src/collectors/rams-collector.ts (or appropriate collector)
 *
 * Detection logic:
 * ${canonMatch.automationSuggestion.notes}
 *
 * Test cases:
 * - Should flag: [example violations]
 * - Should NOT flag: [acceptable patterns]
 */

// TODO: Add detection implementation to canon-audit
// Reference: ${canonMatch.canonCheckName}
`;
}

/**
 * Suggest integration points in canon-audit system
 */
export function suggestIntegrationPoints(
	pattern: FeedbackPattern,
	match: (typeof CANON_PATTERN_SUGGESTIONS)[0]
): string[] {
	const points: string[] = [];

	if (match.automationSuggestion.effort === 'trivial' || match.automationSuggestion.effort === 'easy') {
		points.push('packages/triad-audit/src/collectors/rams-collector.ts');
	}

	if (match.canonCheckName.includes('color')) {
		points.push('packages/triad-audit/src/types/base.ts (add color violation type)');
	}

	if (match.canonCheckName.includes('typography') || match.canonCheckName.includes('text')) {
		points.push('packages/triad-audit/src/types/base.ts (add typography violation type)');
	}

	// Always suggest updating audit.ts orchestrator
	points.push('packages/triad-audit/src/audit.ts (orchestrator, if new collector)');

	return points;
}

// =============================================================================
// FEEDBACK TO AUDIT RULE CONVERSION
// =============================================================================

/**
 * Convert a feedback pattern to a Canon audit rule template
 * Used when creating new audit violations for repeated feedback
 */
export function feedbackToCanonRule(
	pattern: FeedbackPattern,
	match: (typeof CANON_PATTERN_SUGGESTIONS)[0]
): {
	violation: string;
	detection: string;
	examples: string;
} {
	return {
		violation: `
export interface ${toPascalCase(match.canonCheckName)} extends Violation {
	type: '${match.canonCheckName}';
	file: string;
	line?: number;
	value: string;
	suggestion: string;
}
`,
		detection: `
// Detection for ${pattern.name}
// Pattern: ${pattern.id}
// Feedback: "${pattern.examples[0]}"

function detect${toPascalCase(match.canonCheckName)}(content: string, filePath: string): ${toPascalCase(match.canonCheckName)}[] {
	const violations: ${toPascalCase(match.canonCheckName)}[] = [];

	// TODO: Implement detection based on pattern
	// ${match.automationSuggestion.notes}

	return violations;
}
`,
		examples: pattern.examples.map((ex) => `// ${ex}`).join('\n')
	};
}

// =============================================================================
// UTILITIES
// =============================================================================

function toPascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('');
}
