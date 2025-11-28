/**
 * Subtractive Triad Audit
 *
 * Main audit orchestrator that runs all three collectors
 * and produces a unified result.
 */

import path from 'path';
import { collectDRYMetrics } from './collectors/dry-collector.js';
import { collectRamsMetrics } from './collectors/rams-collector.js';
import { collectHeideggerMetrics } from './collectors/heidegger-collector.js';
import type { AuditResult, AuditConfig, Commendation, DEFAULT_CONFIG } from './types/index.js';

export async function runAudit(config: Partial<AuditConfig> = {}): Promise<AuditResult> {
	const fullConfig: AuditConfig = {
		path: config.path || '.',
		ignore: config.ignore || [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.git/**',
			'**/*.min.js',
			'**/*.map',
			'**/.svelte-kit/**',
			'**/coverage/**'
		],
		focus: config.focus || ['src/**', 'packages/**', 'lib/**'],
		thresholds: config.thresholds || {
			dry: { min: 6, warn: 7 },
			rams: { min: 6, warn: 7 },
			heidegger: { min: 5, warn: 6 }
		},
		output: config.output || 'both'
	};

	const rootPath = path.resolve(fullConfig.path);
	const projectName = path.basename(rootPath);

	console.log(`\n🔍 Subtractive Triad Audit: ${projectName}`);
	console.log('━'.repeat(50));

	// Run collectors in parallel
	console.log('\n📊 Collecting metrics...');

	const [dryMetrics, ramsMetrics, heideggerMetrics] = await Promise.all([
		(async () => {
			console.log('  → DRY (Implementation)...');
			return collectDRYMetrics(rootPath, fullConfig.ignore);
		})(),
		(async () => {
			console.log('  → Rams (Artifact)...');
			return collectRamsMetrics(rootPath, fullConfig.ignore);
		})(),
		(async () => {
			console.log('  → Heidegger (System)...');
			return collectHeideggerMetrics(rootPath, fullConfig.ignore);
		})()
	]);

	// Calculate overall score (weighted average)
	const overallScore =
		(dryMetrics.score * 0.3 + ramsMetrics.score * 0.3 + heideggerMetrics.score * 0.4);

	// Identify commendations
	const commendations = identifyCommendations(dryMetrics, ramsMetrics, heideggerMetrics);

	// Count violations by severity
	const allViolations = [
		...dryMetrics.violations,
		...ramsMetrics.violations,
		...heideggerMetrics.violations
	];

	const result: AuditResult = {
		timestamp: new Date().toISOString(),
		project: projectName,
		path: rootPath,
		scores: {
			dry: dryMetrics.score,
			rams: ramsMetrics.score,
			heidegger: heideggerMetrics.score,
			overall: Math.round(overallScore * 10) / 10
		},
		dry: dryMetrics,
		rams: ramsMetrics,
		heidegger: heideggerMetrics,
		commendations,
		summary: {
			totalViolations: allViolations.length,
			criticalCount: allViolations.filter((v) => v.severity === 'critical').length,
			highCount: allViolations.filter((v) => v.severity === 'high').length,
			mediumCount: allViolations.filter((v) => v.severity === 'medium').length,
			lowCount: allViolations.filter((v) => v.severity === 'low').length
		}
	};

	return result;
}

function identifyCommendations(
	dry: ReturnType<typeof collectDRYMetrics> extends Promise<infer T> ? T : never,
	rams: ReturnType<typeof collectRamsMetrics> extends Promise<infer T> ? T : never,
	heidegger: ReturnType<typeof collectHeideggerMetrics> extends Promise<infer T> ? T : never
): Commendation[] {
	const commendations: Commendation[] = [];

	// DRY commendations
	if (dry.score >= 8) {
		commendations.push({
			level: 'dry',
			component: 'Codebase',
			reason: 'Minimal code duplication detected'
		});
	}

	if (dry.duplicateConstants.length === 0) {
		commendations.push({
			level: 'dry',
			component: 'Constants',
			reason: 'No duplicate constant definitions found'
		});
	}

	// Rams commendations
	if (rams.deadExports.length === 0) {
		commendations.push({
			level: 'rams',
			component: 'Exports',
			reason: 'All exports are imported somewhere'
		});
	}

	if (rams.unusedDependencies.length === 0) {
		commendations.push({
			level: 'rams',
			component: 'Dependencies',
			reason: 'No unused dependencies detected'
		});
	}

	if (rams.emptyFiles.length === 0) {
		commendations.push({
			level: 'rams',
			component: 'Files',
			reason: 'No empty files found'
		});
	}

	// Heidegger commendations
	if (heidegger.circularDependencies.length === 0) {
		commendations.push({
			level: 'heidegger',
			component: 'Architecture',
			reason: 'No circular dependencies detected'
		});
	}

	const fullyCompletePackages = heidegger.packageCompleteness.filter((p) => p.completeness === 1);
	if (fullyCompletePackages.length > 0) {
		commendations.push({
			level: 'heidegger',
			component: 'Packages',
			reason: `${fullyCompletePackages.length} package(s) are fully complete`
		});
	}

	if (heidegger.orphanedFiles.length === 0) {
		commendations.push({
			level: 'heidegger',
			component: 'File Structure',
			reason: 'All files are connected to the import graph'
		});
	}

	return commendations;
}
