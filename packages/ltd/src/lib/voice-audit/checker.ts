/**
 * Voice Audit Checker
 *
 * Analyzes content for Voice compliance.
 * Used by /audit-voice command.
 */

import {
	FORBIDDEN_PATTERNS,
	VAGUE_PATTERNS,
	TERMINOLOGY_PATTERNS,
	REQUIRED_SECTIONS,
	ACCEPTABLE_CONTEXTS,
	detectContentType,
	type VoiceViolation,
	type VoiceAuditResult
} from './patterns';

/**
 * Check if text is in an acceptable context (quoted, code, etc.)
 */
function isAcceptableContext(content: string, matchIndex: number): boolean {
	// Get surrounding context (100 chars each side)
	const start = Math.max(0, matchIndex - 100);
	const end = Math.min(content.length, matchIndex + 100);
	const context = content.slice(start, end);

	return ACCEPTABLE_CONTEXTS.some((pattern) => pattern.test(context));
}

/**
 * Get line number from character index
 */
function getLineNumber(content: string, index: number): number {
	return content.slice(0, index).split('\n').length;
}

/**
 * Audit content for Voice violations
 */
export function auditVoice(filePath: string, content: string): VoiceAuditResult {
	const violations: VoiceViolation[] = [];
	const manualReviewRequired: string[] = [];
	const contentType = detectContentType(filePath, content);

	// =========================================================================
	// Check forbidden patterns
	// =========================================================================
	for (const forbidden of FORBIDDEN_PATTERNS) {
		const regex = new RegExp(`\\b${forbidden}\\b`, 'gi');
		let match;
		while ((match = regex.exec(content)) !== null) {
			if (!isAcceptableContext(content, match.index)) {
				violations.push({
					type: 'forbidden',
					line: getLineNumber(content, match.index),
					found: match[0],
					suggestion: 'Remove or replace with specific description',
					severity: 'error'
				});
			}
		}
	}

	// =========================================================================
	// Check vague patterns
	// =========================================================================
	for (const pattern of VAGUE_PATTERNS) {
		let match;
		const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
		while ((match = regex.exec(content)) !== null) {
			if (!isAcceptableContext(content, match.index)) {
				violations.push({
					type: 'vague',
					line: getLineNumber(content, match.index),
					found: match[0],
					suggestion: 'Replace with specific metric (number, percentage, time)',
					severity: 'warning'
				});
			}
		}
	}

	// =========================================================================
	// Check terminology violations
	// =========================================================================
	for (const { pattern, replacement } of TERMINOLOGY_PATTERNS) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			if (!isAcceptableContext(content, match.index)) {
				violations.push({
					type: 'terminology',
					line: getLineNumber(content, match.index),
					found: match[0],
					suggestion: `Use "${replacement}" instead`,
					severity: 'warning'
				});
			}
		}
	}

	// =========================================================================
	// Check required sections
	// =========================================================================
	if (contentType !== 'unknown') {
		const requiredForType = REQUIRED_SECTIONS[contentType];
		for (const required of requiredForType) {
			if (!required.pattern.test(content)) {
				violations.push({
					type: 'missing_section',
					line: 0,
					found: `Missing: ${required.name}`,
					suggestion: `Add a "${required.name}" section`,
					severity: contentType === 'caseStudy' ? 'warning' : 'warning'
				});
			}
		}
	}

	// =========================================================================
	// Flag for manual review
	// =========================================================================

	// Hermeneutic test
	manualReviewRequired.push('Does this part reveal the whole CREATE SOMETHING philosophy?');
	manualReviewRequired.push('Does the whole explain this part (connected to canon)?');
	manualReviewRequired.push('Does this strengthen the hermeneutic circle?');

	// Specificity check
	if (contentType === 'caseStudy') {
		manualReviewRequired.push('Are metrics meaningful in context (not just present)?');
		manualReviewRequired.push('Are limitations honestly acknowledged?');
	}

	// =========================================================================
	// Calculate score
	// =========================================================================
	const errorCount = violations.filter((v) => v.severity === 'error').length;
	const warningCount = violations.filter((v) => v.severity === 'warning').length;

	// Start at 100, subtract for violations
	let score = 100;
	score -= errorCount * 10; // Errors are severe
	score -= warningCount * 3; // Warnings are minor
	score = Math.max(0, score);

	return {
		file: filePath,
		contentType,
		violations,
		manualReviewRequired,
		score
	};
}

/**
 * Format audit result for display
 */
export function formatAuditResult(result: VoiceAuditResult): string {
	const lines: string[] = [];

	lines.push(`## Voice Audit: ${result.file}`);
	lines.push('');
	lines.push(`**Content Type**: ${result.contentType}`);
	lines.push(`**Score**: ${result.score}/100`);
	lines.push('');

	// Group violations by type
	const forbidden = result.violations.filter((v) => v.type === 'forbidden');
	const vague = result.violations.filter((v) => v.type === 'vague');
	const terminology = result.violations.filter((v) => v.type === 'terminology');
	const missing = result.violations.filter((v) => v.type === 'missing_section');

	if (forbidden.length > 0) {
		lines.push(`### Forbidden Patterns (${forbidden.length})`);
		lines.push('');
		forbidden.forEach((v, i) => {
			lines.push(`${i + 1}. **Line ${v.line}**: \`${v.found}\` — ${v.suggestion}`);
		});
		lines.push('');
	}

	if (vague.length > 0) {
		lines.push(`### Vague Claims (${vague.length})`);
		lines.push('');
		vague.forEach((v, i) => {
			lines.push(`${i + 1}. **Line ${v.line}**: \`${v.found}\` — ${v.suggestion}`);
		});
		lines.push('');
	}

	if (terminology.length > 0) {
		lines.push(`### Terminology (${terminology.length})`);
		lines.push('');
		terminology.forEach((v, i) => {
			lines.push(`${i + 1}. **Line ${v.line}**: \`${v.found}\` → ${v.suggestion}`);
		});
		lines.push('');
	}

	if (missing.length > 0) {
		lines.push(`### Missing Sections (${missing.length})`);
		lines.push('');
		missing.forEach((v, i) => {
			lines.push(`${i + 1}. ${v.found} — ${v.suggestion}`);
		});
		lines.push('');
	}

	if (result.violations.length === 0) {
		lines.push('### No Violations Found');
		lines.push('');
	}

	lines.push('### Manual Review Required');
	lines.push('');
	result.manualReviewRequired.forEach((q) => {
		lines.push(`- [ ] ${q}`);
	});
	lines.push('');

	lines.push('---');
	lines.push('*Reference: https://createsomething.ltd/voice*');

	return lines.join('\n');
}
