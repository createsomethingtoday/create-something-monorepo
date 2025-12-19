/**
 * Rule Generators
 *
 * Converts detected feedback patterns into lint rule templates.
 */

export {
	generateRule,
	generateRulesFromPatterns,
	generateEslintConfig,
	type GeneratedRule,
	type RuleGenerationResult,
} from './rule-generator.js';
