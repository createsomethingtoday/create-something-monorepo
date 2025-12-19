/**
 * ESLint Rule Template Generator
 *
 * Converts detected feedback patterns into ESLint rule templates.
 * Philosophy: "If you say it twice, automate it." — Boris Cherny
 *
 * @packageDocumentation
 */

import type { FeedbackPattern, AutomationSuggestion, FeedbackCategory } from '../types/feedback.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generated ESLint rule template
 */
export interface GeneratedRule {
	/** Rule file name (e.g., 'no-hardcoded-colors.ts') */
	fileName: string;
	/** Rule name for eslint config (e.g., 'create-something/no-hardcoded-colors') */
	ruleName: string;
	/** Full rule source code */
	content: string;
	/** ESLint config entry */
	configEntry: string;
	/** Type of rule generated */
	type: 'custom' | 'existing' | 'svelte' | 'canon';
	/** Pattern this rule was generated from */
	patternId: string;
	/** Complexity estimate */
	effort: AutomationSuggestion['effort'];
}

/**
 * Result from batch rule generation
 */
export interface RuleGenerationResult {
	generated: GeneratedRule[];
	skipped: Array<{ patternId: string; reason: string }>;
	stats: {
		total: number;
		custom: number;
		existing: number;
		svelte: number;
		canon: number;
	};
}

// =============================================================================
// RULE TEMPLATES
// =============================================================================

const ESLINT_RULE_TEMPLATE = `/**
 * ESLint Rule: {{RULE_NAME}}
 *
 * Auto-generated from PR feedback pattern: {{PATTERN_NAME}}
 * Occurrences: {{OCCURRENCES}}
 *
 * Examples of feedback this catches:
{{EXAMPLES}}
 */

import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
	(name) => \`https://createsomething.io/eslint/\${name}\`
);

export default createRule({
	name: '{{RULE_ID}}',
	meta: {
		type: '{{RULE_TYPE}}',
		docs: {
			description: '{{DESCRIPTION}}',
		},
		messages: {
			{{MESSAGE_ID}}: '{{MESSAGE}}',
		},
		schema: [],
		{{FIXABLE}}
	},
	defaultOptions: [],
	create(context) {
		return {
			// TODO: Implement rule logic
			// Pattern detected: {{PATTERN_REGEX}}
			//
			// Suggested approach:
			// {{NOTES}}
		};
	},
});
`;

const SVELTE_RULE_TEMPLATE = `/**
 * Svelte ESLint Rule: {{RULE_NAME}}
 *
 * Auto-generated from PR feedback pattern: {{PATTERN_NAME}}
 * Occurrences: {{OCCURRENCES}}
 *
 * Examples of feedback this catches:
{{EXAMPLES}}
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: '{{RULE_TYPE}}',
		docs: {
			description: '{{DESCRIPTION}}',
			category: '{{CATEGORY}}',
		},
		messages: {
			{{MESSAGE_ID}}: '{{MESSAGE}}',
		},
		schema: [],
		{{FIXABLE}}
	},
	create(context) {
		// For Svelte files, use context.parserServices.defineTemplateBodyVisitor
		// to handle both script and template sections

		return {
			// Script section visitors
			'Program > *'(node) {
				// TODO: Implement script-side logic
			},

			// Template section visitors (via svelte-eslint-parser)
			// 'SvelteElement'(node) {
			//   // Check Svelte-specific patterns
			// }
		};
	},
};
`;

// =============================================================================
// GENERATOR
// =============================================================================

/**
 * Generate an ESLint rule from a feedback pattern
 */
export function generateRule(pattern: FeedbackPattern): GeneratedRule | null {
	const suggestion = pattern.automationSuggestion;

	// Skip patterns without automation suggestions
	if (!suggestion) {
		return null;
	}

	// Handle existing rules (just need config entry)
	if (suggestion.type === 'eslint' && suggestion.template) {
		return generateExistingRuleConfig(pattern, suggestion);
	}

	// Handle Svelte-specific rules
	if (suggestion.type === 'svelte') {
		return generateSvelteRule(pattern, suggestion);
	}

	// Handle Canon rules (delegate to canon-audit)
	if (suggestion.type === 'canon') {
		return generateCanonRuleStub(pattern, suggestion);
	}

	// Handle custom rules
	return generateCustomRule(pattern, suggestion);
}

/**
 * Generate config entry for an existing ESLint rule
 */
function generateExistingRuleConfig(
	pattern: FeedbackPattern,
	suggestion: AutomationSuggestion
): GeneratedRule {
	const ruleName = suggestion.template!;
	const configEntry = `    // Auto-suggested from pattern: ${pattern.name} (${pattern.occurrences} occurrences)
    '${ruleName}': 'error',`;

	return {
		fileName: '', // No file needed for existing rules
		ruleName,
		content: `// This pattern uses existing ESLint rule: ${ruleName}
// Add to your .eslintrc.js:
//
// rules: {
${configEntry}
// }
//
// Pattern examples:
${pattern.examples.map((e) => `//   - "${truncate(e, 60)}"`).join('\n')}
`,
		configEntry,
		type: 'existing',
		patternId: pattern.id,
		effort: suggestion.effort,
	};
}

/**
 * Generate a custom ESLint rule template
 */
function generateCustomRule(
	pattern: FeedbackPattern,
	suggestion: AutomationSuggestion
): GeneratedRule {
	const ruleId = slugify(pattern.name);
	const ruleName = `create-something/${ruleId}`;
	const fileName = `${ruleId}.ts`;

	const content = ESLINT_RULE_TEMPLATE
		.replace(/\{\{RULE_NAME\}\}/g, pattern.name)
		.replace(/\{\{RULE_ID\}\}/g, ruleId)
		.replace(/\{\{PATTERN_NAME\}\}/g, pattern.name)
		.replace(/\{\{PATTERN_REGEX\}\}/g, pattern.id)
		.replace(/\{\{OCCURRENCES\}\}/g, String(pattern.occurrences))
		.replace(/\{\{DESCRIPTION\}\}/g, pattern.description)
		.replace(/\{\{MESSAGE_ID\}\}/g, camelCase(pattern.name))
		.replace(/\{\{MESSAGE\}\}/g, createMessage(pattern))
		.replace(/\{\{RULE_TYPE\}\}/g, categoryToRuleType(pattern.category))
		.replace(/\{\{FIXABLE\}\}/g, suggestion.effort === 'trivial' ? "fixable: 'code'," : '')
		.replace(/\{\{NOTES\}\}/g, suggestion.notes || 'Implement based on pattern examples')
		.replace(/\{\{EXAMPLES\}\}/g, pattern.examples.map((e) => ` *   - "${truncate(e, 70)}"`).join('\n'));

	const configEntry = `    '${ruleName}': 'error',`;

	return {
		fileName,
		ruleName,
		content,
		configEntry,
		type: 'custom',
		patternId: pattern.id,
		effort: suggestion.effort,
	};
}

/**
 * Generate a Svelte-specific ESLint rule template
 */
function generateSvelteRule(
	pattern: FeedbackPattern,
	suggestion: AutomationSuggestion
): GeneratedRule {
	const ruleId = slugify(pattern.name);
	const ruleName = `svelte/${ruleId}`;
	const fileName = `${ruleId}.js`;

	const content = SVELTE_RULE_TEMPLATE
		.replace(/\{\{RULE_NAME\}\}/g, pattern.name)
		.replace(/\{\{PATTERN_NAME\}\}/g, pattern.name)
		.replace(/\{\{OCCURRENCES\}\}/g, String(pattern.occurrences))
		.replace(/\{\{DESCRIPTION\}\}/g, pattern.description)
		.replace(/\{\{CATEGORY\}\}/g, pattern.category)
		.replace(/\{\{MESSAGE_ID\}\}/g, camelCase(pattern.name))
		.replace(/\{\{MESSAGE\}\}/g, createMessage(pattern))
		.replace(/\{\{RULE_TYPE\}\}/g, categoryToRuleType(pattern.category))
		.replace(/\{\{FIXABLE\}\}/g, suggestion.effort === 'trivial' ? "fixable: 'code'," : '')
		.replace(/\{\{EXAMPLES\}\}/g, pattern.examples.map((e) => ` *   - "${truncate(e, 70)}"`).join('\n'));

	const configEntry = `    '${ruleName}': 'error',`;

	return {
		fileName,
		ruleName,
		content,
		configEntry,
		type: 'svelte',
		patternId: pattern.id,
		effort: suggestion.effort,
	};
}

/**
 * Generate a stub for Canon audit integration
 */
function generateCanonRuleStub(
	pattern: FeedbackPattern,
	suggestion: AutomationSuggestion
): GeneratedRule {
	const ruleId = slugify(pattern.name);

	const content = `/**
 * Canon Audit Pattern: ${pattern.name}
 *
 * This pattern should be integrated into the existing Canon audit system.
 * Pattern ID: ${pattern.id}
 * Occurrences: ${pattern.occurrences}
 *
 * Examples of feedback this catches:
${pattern.examples.map((e) => ` *   - "${truncate(e, 70)}"`).join('\n')}
 *
 * Implementation Notes:
 * ${suggestion.notes || 'Integrate into canon-audit violation detection'}
 *
 * Suggested approach:
 * 1. Add pattern detection to packages/triad-audit/src/collectors/rams-collector.ts
 * 2. Create new violation type in packages/triad-audit/src/types/base.ts
 * 3. Update /audit-canon skill to report this pattern
 */

export const CANON_PATTERN = {
	id: '${ruleId}',
	name: '${pattern.name}',
	category: '${pattern.category}',
	severity: 'warning' as const,
	detect: (content: string, filePath: string) => {
		// TODO: Implement detection logic
		return [];
	},
};
`;

	return {
		fileName: `${ruleId}-canon.ts`,
		ruleName: `canon/${ruleId}`,
		content,
		configEntry: `// Canon pattern - integrate via /audit-canon`,
		type: 'canon',
		patternId: pattern.id,
		effort: suggestion.effort,
	};
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

/**
 * Generate rules from multiple patterns
 */
export function generateRulesFromPatterns(patterns: FeedbackPattern[]): RuleGenerationResult {
	const result: RuleGenerationResult = {
		generated: [],
		skipped: [],
		stats: {
			total: patterns.length,
			custom: 0,
			existing: 0,
			svelte: 0,
			canon: 0,
		},
	};

	for (const pattern of patterns) {
		// Skip already automated patterns
		if (pattern.automated) {
			result.skipped.push({
				patternId: pattern.id,
				reason: 'Already automated',
			});
			continue;
		}

		const rule = generateRule(pattern);

		if (rule) {
			result.generated.push(rule);
			result.stats[rule.type]++;
		} else {
			result.skipped.push({
				patternId: pattern.id,
				reason: 'No automation suggestion',
			});
		}
	}

	return result;
}

/**
 * Generate ESLint config snippet from generated rules
 */
export function generateEslintConfig(rules: GeneratedRule[]): string {
	const existingRules = rules.filter((r) => r.type === 'existing');
	const customRules = rules.filter((r) => r.type === 'custom');
	const svelteRules = rules.filter((r) => r.type === 'svelte');

	const lines: string[] = [
		'// Auto-generated ESLint configuration from PR feedback patterns',
		'// Generated by @create-something/triad-audit',
		'',
		'module.exports = {',
		'  rules: {',
	];

	if (existingRules.length > 0) {
		lines.push('    // Existing ESLint rules (enable these)');
		for (const rule of existingRules) {
			lines.push(rule.configEntry);
		}
		lines.push('');
	}

	if (customRules.length > 0) {
		lines.push('    // Custom rules (implement these in your rules directory)');
		for (const rule of customRules) {
			lines.push(rule.configEntry);
		}
		lines.push('');
	}

	if (svelteRules.length > 0) {
		lines.push('    // Svelte-specific rules (implement these)');
		for (const rule of svelteRules) {
			lines.push(rule.configEntry);
		}
	}

	lines.push('  },');
	lines.push('};');

	return lines.join('\n');
}

// =============================================================================
// UTILITIES
// =============================================================================

function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function camelCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

function truncate(str: string, length: number): string {
	if (str.length <= length) return str;
	return str.slice(0, length - 3) + '...';
}

function createMessage(pattern: FeedbackPattern): string {
	const example = pattern.examples[0] || pattern.description;
	return truncate(example, 80);
}

function categoryToRuleType(category: FeedbackCategory): 'problem' | 'suggestion' | 'layout' {
	switch (category) {
		case 'security':
		case 'accessibility':
			return 'problem';
		case 'style':
		case 'naming':
		case 'documentation':
			return 'suggestion';
		default:
			return 'suggestion';
	}
}
