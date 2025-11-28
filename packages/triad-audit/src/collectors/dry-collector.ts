/**
 * DRY Collector
 *
 * Level: Implementation
 * Question: "Have I built this before?"
 * Action: Unify
 *
 * Detects:
 * - Duplicate code blocks (via jscpd)
 * - Similar files
 * - Repeated constants/patterns
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import type { DRYMetrics, DuplicateBlock, Violation, Severity } from '../types/index.js';

interface JscpdClone {
	duplicationA: { sourceId: string; start: { line: number }; end: { line: number } };
	duplicationB: { sourceId: string; start: { line: number }; end: { line: number } };
	fragment: string;
}

interface JscpdResult {
	statistics: {
		total: { percentage: number; lines: number };
	};
	duplicates: JscpdClone[];
}

export async function collectDRYMetrics(
	rootPath: string,
	ignore: string[]
): Promise<DRYMetrics> {
	const duplicateBlocks: DuplicateBlock[] = [];
	const violations: Violation[] = [];

	// Run jscpd for duplicate detection
	const jscpdResult = await runJscpd(rootPath, ignore);

	if (jscpdResult && jscpdResult.duplicates) {
		// Process duplicates
		for (const dup of jscpdResult.duplicates) {
			// Guard against malformed jscpd output
			if (!dup?.duplicationA?.sourceId || !dup?.duplicationB?.sourceId) {
				continue;
			}
			const block: DuplicateBlock = {
				files: [dup.duplicationA.sourceId, dup.duplicationB.sourceId],
				lines: dup.duplicationA.end.line - dup.duplicationA.start.line + 1,
				fragment: dup.fragment?.substring(0, 200) + (dup.fragment?.length > 200 ? '...' : '') || ''
			};
			duplicateBlocks.push(block);

			// Create violation if significant
			if (block.lines >= 10) {
				const severity: Severity = block.lines >= 50 ? 'high' : block.lines >= 25 ? 'medium' : 'low';
				violations.push({
					type: 'duplicate_block',
					severity,
					message: `${block.lines} lines duplicated across ${block.files.length} files`,
					files: block.files,
					lines: block.lines,
					suggestion: 'Extract shared logic into a utility function or module'
				});
			}
		}
	}

	// Find duplicate constants (simple pattern matching)
	const duplicateConstants = await findDuplicateConstants(rootPath, ignore);
	for (const constant of duplicateConstants) {
		if (constant.locations.length >= 3) {
			violations.push({
				type: 'duplicate_constant',
				severity: 'medium',
				message: `Constant "${constant.name}" defined in ${constant.locations.length} locations`,
				files: constant.locations,
				suggestion: 'Move to a shared constants file'
			});
		}
	}

	// Calculate score (10 = no duplication, 1 = severe duplication)
	const duplicationPercentage = jscpdResult?.statistics.total.percentage || 0;
	const score = Math.max(1, Math.min(10, 10 - duplicationPercentage / 5));

	return {
		duplicateBlocks,
		similarFiles: [], // TODO: implement file similarity
		duplicateConstants,
		score: Math.round(score * 10) / 10,
		violations
	};
}

async function runJscpd(rootPath: string, ignore: string[]): Promise<JscpdResult | null> {
	const outputPath = path.join(rootPath, '.triad-audit-jscpd.json');

	try {
		// Build ignore pattern
		const ignorePattern = ignore.map((i) => `--ignore "${i}"`).join(' ');

		// Run jscpd
		execSync(
			`npx jscpd "${rootPath}" --min-lines 5 --min-tokens 50 --reporters json --output "${path.dirname(outputPath)}" --format "typescript,javascript,svelte" ${ignorePattern} 2>/dev/null || true`,
			{ encoding: 'utf-8', stdio: 'pipe' }
		);

		// Read result
		const jscpdOutputPath = path.join(path.dirname(outputPath), 'jscpd-report.json');
		if (fs.existsSync(jscpdOutputPath)) {
			const result = JSON.parse(fs.readFileSync(jscpdOutputPath, 'utf-8'));
			// Cleanup
			fs.unlinkSync(jscpdOutputPath);
			return result;
		}
	} catch {
		// jscpd might not be available or failed - continue without it
	}

	return null;
}

async function findDuplicateConstants(
	rootPath: string,
	ignore: string[]
): Promise<{ name: string; locations: string[] }[]> {
	const constants: Map<string, string[]> = new Map();

	// Common patterns for constant definitions
	const patterns = [
		/const\s+([A-Z][A-Z0-9_]+)\s*=\s*\[/g, // const CATEGORIES = [
		/const\s+([A-Z][A-Z0-9_]+)\s*=\s*\{/g, // const CONFIG = {
		/const\s+([A-Z][A-Z0-9_]+)\s*=\s*['"`]/g // const API_URL = "
	];

	const files = await fg(['**/*.{ts,tsx,js,jsx,svelte}'], {
		cwd: rootPath,
		ignore,
		absolute: true
	});

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			for (const pattern of patterns) {
				let match;
				const regex = new RegExp(pattern.source, pattern.flags);
				while ((match = regex.exec(content)) !== null) {
					const name = match[1];
					if (!constants.has(name)) {
						constants.set(name, []);
					}
					const relativePath = path.relative(rootPath, file);
					if (!constants.get(name)!.includes(relativePath)) {
						constants.get(name)!.push(relativePath);
					}
				}
			}
		} catch {
			// Skip files that can't be read
		}
	}

	// Return only constants defined in multiple locations
	return Array.from(constants.entries())
		.filter(([, locations]) => locations.length > 1)
		.map(([name, locations]) => ({ name, locations }));
}
