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

export {
	suggestCanonEnhancements,
	findCanonPatternMatch,
	generateCanonAuditIntegration,
	suggestIntegrationPoints,
	feedbackToCanonRule,
	CANON_PATTERN_SUGGESTIONS,
} from './canon-integration.js';
