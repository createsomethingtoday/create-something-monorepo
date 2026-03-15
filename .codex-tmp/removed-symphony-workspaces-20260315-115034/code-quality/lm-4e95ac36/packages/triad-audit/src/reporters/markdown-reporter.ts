/**
 * Markdown Reporter
 *
 * Outputs audit results as human-readable Markdown.
 */

import type { AuditResult, Violation } from '../types/index.js';

export function formatAsMarkdown(result: AuditResult): string {
	const lines: string[] = [];

	// Header
	lines.push(`# Subtractive Triad Audit: ${result.project}`);
	lines.push('');
	lines.push(`**Date:** ${new Date(result.timestamp).toLocaleDateString()}`);
	lines.push(`**Overall Score:** ${result.scores.overall}/10`);
	lines.push('');

	// Score Summary
	lines.push('## Score Summary');
	lines.push('');
	lines.push('| Level | Score | Status |');
	lines.push('|-------|-------|--------|');
	lines.push(`| DRY (Implementation) | ${result.scores.dry}/10 | ${getScoreEmoji(result.scores.dry)} |`);
	lines.push(`| Rams (Artifact) | ${result.scores.rams}/10 | ${getScoreEmoji(result.scores.rams)} |`);
	lines.push(`| Heidegger (System) | ${result.scores.heidegger}/10 | ${getScoreEmoji(result.scores.heidegger)} |`);
	lines.push('');

	// Violation Summary
	lines.push('## Violation Summary');
	lines.push('');
	lines.push(`- **Critical:** ${result.summary.criticalCount}`);
	lines.push(`- **High:** ${result.summary.highCount}`);
	lines.push(`- **Medium:** ${result.summary.mediumCount}`);
	lines.push(`- **Low:** ${result.summary.lowCount}`);
	lines.push('');

	// DRY Section
	if (result.dry.violations.length > 0) {
		lines.push('## DRY Violations');
		lines.push('');
		lines.push('*"Have I built this before?" → Unify*');
		lines.push('');
		formatViolations(result.dry.violations, lines);
	}

	// Rams Section
	if (result.rams.violations.length > 0) {
		lines.push('## Rams Violations');
		lines.push('');
		lines.push('*"Does this earn its existence?" → Remove*');
		lines.push('');
		formatViolations(result.rams.violations, lines);
	}

	// Heidegger Section
	if (result.heidegger.violations.length > 0) {
		lines.push('## Heidegger Violations');
		lines.push('');
		lines.push('*"Does this serve the whole?" → Reconnect*');
		lines.push('');
		formatViolations(result.heidegger.violations, lines);
	}

	// Commendations
	if (result.commendations.length > 0) {
		lines.push('## Commendations');
		lines.push('');
		for (const comm of result.commendations) {
			lines.push(`- **${comm.component}** (${comm.level}): ${comm.reason}`);
		}
		lines.push('');
	}

	// Footer
	lines.push('---');
	lines.push('');
	lines.push('*Audit conducted using the Subtractive Triad methodology.*');
	lines.push('*Reference: createsomething.ltd/ethos*');

	return lines.join('\n');
}

function getScoreEmoji(score: number): string {
	if (score >= 8) return 'Excellent';
	if (score >= 6) return 'Good';
	if (score >= 4) return 'Needs Work';
	return 'Critical';
}

function formatViolations(violations: Violation[], lines: string[]): void {
	// Group by severity
	const critical = violations.filter((v) => v.severity === 'critical');
	const high = violations.filter((v) => v.severity === 'high');
	const medium = violations.filter((v) => v.severity === 'medium');
	const low = violations.filter((v) => v.severity === 'low');

	for (const [label, group] of [
		['Critical', critical],
		['High', high],
		['Medium', medium],
		['Low', low]
	] as const) {
		if (group.length > 0) {
			lines.push(`### ${label} Priority`);
			lines.push('');
			for (const v of group) {
				lines.push(`#### ${v.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`);
				lines.push('');
				if (v.file) {
					lines.push(`**File:** \`${v.file}\``);
				}
				if (v.files && v.files.length > 0) {
					lines.push(`**Files:** ${v.files.map((f) => `\`${f}\``).join(', ')}`);
				}
				lines.push('');
				lines.push(v.message);
				lines.push('');
				lines.push(`> **Suggestion:** ${v.suggestion}`);
				lines.push('');
			}
		}
	}
}

export function writeMarkdownReport(result: AuditResult, outputPath: string): void {
	const fs = require('fs');
	fs.writeFileSync(outputPath, formatAsMarkdown(result), 'utf-8');
}
