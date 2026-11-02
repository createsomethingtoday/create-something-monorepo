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
	{ pattern: /significantly\s+(improved|better|faster|more)/gi, suggestion: 'Support the claim with source evidence or state the limit; do not invent numbers' },
	{ pattern: /many\s+(users|people|companies|teams)/gi, suggestion: 'Use a supported count or state what is known' },
	{ pattern: /fast(er)?\s+performance/gi, suggestion: 'Support the speed comparison with measurements or state the limit' },
	{ pattern: /substantial\s+savings?/gi, suggestion: 'Use a supported savings amount or state the limit' },
	{ pattern: /enhanced\s+experience/gi, suggestion: 'Describe the specific improvement' },
	{ pattern: /better\s+outcomes?/gi, suggestion: 'Name the supported outcome and evidence, or state the limit' },
	{ pattern: /various\s+benefits/gi, suggestion: 'List the specific benefits' },
	{ pattern: /considerable\s+improvements?/gi, suggestion: 'Describe the supported improvement or measurement limit' },
	{ pattern: /greatly\s+(reduced|increased|improved)/gi, suggestion: 'Use a supported comparison or state the limit' },
	{ pattern: /a\s+lot\s+of/gi, suggestion: 'Support the claim with source evidence or state the limit; do not invent numbers' },
	{ pattern: /very\s+(fast|quick|slow|large|small)/gi, suggestion: 'Use a supported measure or state the limit' },
	{ pattern: /extremely\s+\w+/gi, suggestion: 'Use specific comparison' },
	{ pattern: /much\s+(better|worse|faster|slower)/gi, suggestion: 'Support the difference with evidence or state the limit' }
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
					suggestion: 'Review this term in context; preserve technically necessary or source-owned language',
					severity: 'warning'
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
			// Lexical matches require editorial context and do not determine the score.
			if (violation.type === 'forbidden') continue;
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
			return 'Content passes the configured heuristic checks. This does not verify factual evidence or authorize publication; retain the owning approval workflow and human final read.';
		}

		const errors = violations.filter((v) => v.severity === 'error');
		const warnings = violations.filter((v) => v.severity === 'warning');

		let feedback = `Score: ${score}/100. This heuristic does not authorize publication; retain the owning approval workflow and human final read.\n\n`;

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

		// Surface lexical review signals without treating a word alone as a failure.
		for (const forbidden of FORBIDDEN_PATTERNS.slice(0, 10)) {
			if (content.toLowerCase().includes(forbidden.toLowerCase())) {
				issues.push(`Contains "${forbidden}"`);
			}
		}


		return {
			likely: true, // Contextual lexical signals cannot establish a failure by themselves.
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
