/**
 * Content Reviewer
 *
 * Voice validation for social content before publishing.
 * Integrates the CREATE SOMETHING voice canon rules.
 */

import type { ReviewResult, VoiceViolation, Platform } from './types';

// =============================================================================
// Forbidden Patterns (Marketing Jargon)
// =============================================================================

const FORBIDDEN_PATTERNS = [
	'cutting-edge',
	'revolutionary',
	'game-changing',
	'leverage',
	'synergy',
	'solutions',
	'best-in-class',
	'world-class',
	'industry-leading',
	'transformative',
	'innovative',
	'seamless',
	'robust',
	'scalable',
	'next-generation',
	'bleeding-edge',
	'disruptive',
	'paradigm',
	'holistic',
	'ecosystem',
	'empower',
	'unlock',
	'supercharge',
	'turbocharge',
	'optimize',
	'streamline',
	'mission-critical',
	'enterprise-grade',
	'best practices',
	'thought leader',
	'synergize',
	'ideate',
	'pivot',
	'deep dive',
	'low-hanging fruit',
	'move the needle'
];

// =============================================================================
// Vague Patterns (Require Specificity)
// =============================================================================

const VAGUE_PATTERNS = [
	{ pattern: /significantly\s+(improved|better|faster|more)/gi, suggestion: 'Use specific numbers' },
	{ pattern: /many\s+(users|people|companies|teams)/gi, suggestion: 'Use specific count' },
	{ pattern: /fast(er)?\s+performance/gi, suggestion: 'Quantify the speed improvement' },
	{ pattern: /substantial\s+savings?/gi, suggestion: 'Specify the amount saved' },
	{ pattern: /enhanced\s+experience/gi, suggestion: 'Describe the specific improvement' },
	{ pattern: /better\s+outcomes?/gi, suggestion: 'Specify what outcomes and by how much' },
	{ pattern: /various\s+benefits/gi, suggestion: 'List the specific benefits' },
	{ pattern: /considerable\s+improvements?/gi, suggestion: 'Quantify the improvement' },
	{ pattern: /greatly\s+(reduced|increased|improved)/gi, suggestion: 'Use specific percentages' },
	{ pattern: /a\s+lot\s+of/gi, suggestion: 'Use specific numbers' },
	{ pattern: /very\s+(fast|quick|slow|large|small)/gi, suggestion: 'Quantify the measure' },
	{ pattern: /extremely\s+\w+/gi, suggestion: 'Use specific comparison' },
	{ pattern: /much\s+(better|worse|faster|slower)/gi, suggestion: 'Quantify the difference' }
];

// =============================================================================
// Condescending Language
// =============================================================================

const CONDESCENDING_PATTERNS = [
	{ pattern: /\bsimply\b/gi, suggestion: 'Remove - implies task is trivial' },
	{ pattern: /\bobviously\b/gi, suggestion: 'Remove - excludes readers who don\'t know' },
	{ pattern: /\bjust\b(?!\s+(a|the|an|in|on|for))/gi, suggestion: 'Consider removing - minimizes complexity' },
	{ pattern: /\bclearly\b/gi, suggestion: 'Remove - not clear to everyone' },
	{ pattern: /\bof course\b/gi, suggestion: 'Remove - assumes shared knowledge' },
	{ pattern: /\bas you know\b/gi, suggestion: 'Remove - reader may not know' },
	{ pattern: /\bneedless to say\b/gi, suggestion: 'Remove - if needless, don\'t say it' }
];

// =============================================================================
// Structural Requirements
// =============================================================================

interface StructuralCheck {
	name: string;
	check: (content: string, platform: Platform) => boolean;
	suggestion: string;
}

const STRUCTURAL_CHECKS: StructuralCheck[] = [
	{
		name: 'hook',
		check: (content, platform) => {
			// First 100 chars should have impact for LinkedIn, 50 for Twitter
			const hookLength = platform === 'linkedin' ? 100 : 50;
			const hook = content.substring(0, hookLength);
			// Check for question, number, or strong statement
			return /[\?]|^\d+|^Most|^Every|^The\s+\w+\s+I|^I\s+|^We\s+/.test(hook);
		},
		suggestion: 'Start with a hook: question, number, or bold statement'
	},
	{
		name: 'metrics',
		check: (content) => {
			// Should contain at least one specific number
			return /\d+[%x]|\d+\s*(hours?|days?|weeks?|minutes?)|\$\d+|\d+\s*to\s*\d+/.test(content);
		},
		suggestion: 'Include specific metrics (numbers, percentages, time savings)'
	},
	{
		name: 'length',
		check: (content, platform) => {
			const minLength = platform === 'linkedin' ? 300 : 100;
			return content.length >= minLength;
		},
		suggestion: 'Content seems too short - LinkedIn favors longform (1500+ chars)'
	}
];

// =============================================================================
// Content Reviewer Class
// =============================================================================

export class ContentReviewer {
	private threshold: number;

	constructor(threshold = 85) {
		this.threshold = threshold;
	}

	/**
	 * Review content for voice compliance
	 */
	review(content: string, platform: Platform): ReviewResult {
		const violations: VoiceViolation[] = [];

		// Check forbidden patterns
		for (const forbidden of FORBIDDEN_PATTERNS) {
			const regex = new RegExp(`\\b${this.escapeRegex(forbidden)}\\b`, 'gi');
			let match;
			while ((match = regex.exec(content)) !== null) {
				violations.push({
					type: 'forbidden',
					line: this.getLineNumber(content, match.index),
					found: match[0],
					suggestion: 'Remove marketing jargon - use specific description instead',
					severity: 'error'
				});
			}
		}

		// Check vague patterns
		for (const { pattern, suggestion } of VAGUE_PATTERNS) {
			let match;
			const regex = new RegExp(pattern.source, pattern.flags);
			while ((match = regex.exec(content)) !== null) {
				violations.push({
					type: 'vague',
					line: this.getLineNumber(content, match.index),
					found: match[0],
					suggestion,
					severity: 'warning'
				});
			}
		}

		// Check condescending language
		for (const { pattern, suggestion } of CONDESCENDING_PATTERNS) {
			let match;
			const regex = new RegExp(pattern.source, pattern.flags);
			while ((match = regex.exec(content)) !== null) {
				violations.push({
					type: 'terminology',
					line: this.getLineNumber(content, match.index),
					found: match[0],
					suggestion,
					severity: 'warning'
				});
			}
		}

		// Check structural requirements
		for (const check of STRUCTURAL_CHECKS) {
			if (!check.check(content, platform)) {
				violations.push({
					type: 'structure',
					line: 1,
					found: `Missing: ${check.name}`,
					suggestion: check.suggestion,
					severity: 'warning'
				});
			}
		}

		// Calculate score
		const score = this.calculateScore(violations, content.length);
		const passed = score >= this.threshold;

		// Generate feedback
		const feedback = this.generateFeedback(violations, score);

		return { passed, score, violations, feedback };
	}

	/**
	 * Calculate voice compliance score
	 */
	private calculateScore(violations: VoiceViolation[], contentLength: number): number {
		// Start at 100, deduct for violations
		let score = 100;

		for (const violation of violations) {
			if (violation.severity === 'error') {
				score -= 15; // Heavy penalty for forbidden patterns
			} else {
				score -= 5; // Light penalty for warnings
			}
		}

		// Bonus for longer content (LinkedIn prefers 1500+)
		if (contentLength > 1500) {
			score += 5;
		}

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Generate human-readable feedback
	 */
	private generateFeedback(violations: VoiceViolation[], score: number): string {
		if (violations.length === 0) {
			return 'Content passes all voice checks. Ready for publishing.';
		}

		const errors = violations.filter((v) => v.severity === 'error');
		const warnings = violations.filter((v) => v.severity === 'warning');

		let feedback = `Score: ${score}/100\n\n`;

		if (errors.length > 0) {
			feedback += `**Critical Issues (${errors.length}):**\n`;
			for (const error of errors) {
				feedback += `- "${error.found}" → ${error.suggestion}\n`;
			}
			feedback += '\n';
		}

		if (warnings.length > 0) {
			feedback += `**Improvements (${warnings.length}):**\n`;
			for (const warning of warnings.slice(0, 5)) {
				// Limit to top 5
				feedback += `- "${warning.found}" → ${warning.suggestion}\n`;
			}
			if (warnings.length > 5) {
				feedback += `- ...and ${warnings.length - 5} more\n`;
			}
		}

		return feedback;
	}

	/**
	 * Get line number from content index
	 */
	private getLineNumber(content: string, index: number): number {
		return content.substring(0, index).split('\n').length;
	}

	/**
	 * Escape special regex characters
	 */
	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Quick check if content is likely to pass
	 */
	quickCheck(content: string): { likely: boolean; issues: string[] } {
		const issues: string[] = [];

		// Check for obvious forbidden patterns
		for (const forbidden of FORBIDDEN_PATTERNS.slice(0, 10)) {
			if (content.toLowerCase().includes(forbidden.toLowerCase())) {
				issues.push(`Contains "${forbidden}"`);
			}
		}

		// Check for numbers
		if (!/\d/.test(content)) {
			issues.push('No metrics or numbers found');
		}

		return {
			likely: issues.length === 0,
			issues
		};
	}

	/**
	 * Get the threshold for passing
	 */
	getThreshold(): number {
		return this.threshold;
	}

	/**
	 * Set a new threshold
	 */
	setThreshold(threshold: number): void {
		this.threshold = Math.max(0, Math.min(100, threshold));
	}
}

// =============================================================================
// Export singleton instance for simple usage
// =============================================================================

export const defaultReviewer = new ContentReviewer(85);
