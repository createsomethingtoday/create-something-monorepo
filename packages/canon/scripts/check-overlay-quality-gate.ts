#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	assertCanonPropertyOverlayCoverage,
	buildCanonPropertyOverlayCoverageReport,
	renderCanonPropertyOverlayCoverageReport,
	type CanonPropertyOverlayCoverageReport
} from './check-property-overlay-coverage.js';
import {
	buildCanonOverlayIntakeInventory,
	renderCanonOverlayIntakeInventory
} from '../src/lib/overlays/intake.js';
import type { CanonProjectOverlayInventory } from '../src/lib/registry/schema.js';

export type CanonOverlayQualityGateReport = {
	id: 'canon-overlay-quality-gate';
	rootDir: string;
	coverage: CanonPropertyOverlayCoverageReport;
	inventory: CanonProjectOverlayInventory;
	manifestDependencyIssues: CanonOverlayManifestDependencyIssue[];
	summary: {
		requiredPropertySurfaces: number;
		coveredPropertySurfaces: number;
		totalOverlays: number;
		readyOverlays: number;
		notReadyOverlays: number;
		manifestDependencyIssues: number;
		candidateIntakes: number;
		projectLocalIntakes: number;
	};
};

export type CanonOverlayManifestDependencyIssue = {
	manifestPath: string;
	line: number;
	syntax: 'import' | 're-export' | 'typed-manifest-export';
	message: string;
};

export async function buildCanonOverlayQualityGateReport(
	rootDir: string
): Promise<CanonOverlayQualityGateReport> {
	const root = resolveRepoRoot(rootDir);
	const coverage = await buildCanonPropertyOverlayCoverageReport(root);
	const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
	const manifestDependencyIssues = inspectOverlayManifestDependencyIssues(root, inventory);

	return {
		id: 'canon-overlay-quality-gate',
		rootDir: root,
		coverage,
		inventory,
		manifestDependencyIssues,
		summary: {
			requiredPropertySurfaces: coverage.summary.required,
			coveredPropertySurfaces: coverage.summary.covered,
			totalOverlays: inventory.summary.total,
			readyOverlays: inventory.summary.ready,
			notReadyOverlays:
				inventory.summary.needsArtifacts +
				inventory.summary.needsEvidence +
				inventory.summary.needsReview,
			manifestDependencyIssues: manifestDependencyIssues.length,
			candidateIntakes: inventory.summary.candidateIntakes,
			projectLocalIntakes: inventory.summary.projectLocalIntakes
		}
	};
}

export function assertCanonOverlayQualityGate(report: CanonOverlayQualityGateReport) {
	assertCanonPropertyOverlayCoverage(report.coverage);

	const inventoriedManifestPaths = new Set(report.inventory.entries.map((entry) => entry.manifestPath));
	const missingFromInventory = report.coverage.requiredPackages.filter(
		(entry) => entry.overlayPath && !inventoriedManifestPaths.has(entry.overlayPath)
	);

	if (missingFromInventory.length > 0) {
		throw new Error(
			[
				'Canon overlay quality gate failed: covered property overlays are missing from inventory.',
				...missingFromInventory.map(
					(entry) => `- ${entry.packageName} (${entry.packageDir}): ${entry.overlayPath}`
				)
			].join('\n')
		);
	}

	const notReady = report.inventory.entries.filter((entry) => entry.review.status !== 'ready');
	if (notReady.length > 0) {
		throw new Error(
			[
				'Canon overlay quality gate failed: inventory contains overlays that are not ready.',
				...notReady.map((entry) => {
					const issues = entry.review.integrityIssues.map((issue) => issue.message).join('; ');
					return `- ${entry.manifest.id} (${entry.manifestPath}): ${entry.review.status}${issues ? ` - ${issues}` : ''}`;
				})
			].join('\n')
		);
	}

	if (report.manifestDependencyIssues.length > 0) {
		throw new Error(
			[
				'Canon overlay quality gate failed: overlay manifests must be self-contained data exports.',
				...report.manifestDependencyIssues.map(
					(issue) => `- ${issue.manifestPath}:${issue.line}: ${issue.message}`
				)
			].join('\n')
		);
	}
}

export function renderCanonOverlayQualityGateReport(
	report: CanonOverlayQualityGateReport,
	options: { verbose?: boolean } = {}
) {
	const lines = [
		'# Canon Overlay Quality Gate',
		'',
		`Root: ${report.rootDir}`,
		`Required property surfaces: ${report.summary.requiredPropertySurfaces}`,
		`Covered property surfaces: ${report.summary.coveredPropertySurfaces}`,
		`Total overlays: ${report.summary.totalOverlays}`,
		`Ready overlays: ${report.summary.readyOverlays}`,
		`Not-ready overlays: ${report.summary.notReadyOverlays}`,
		`Manifest dependency issues: ${report.summary.manifestDependencyIssues}`,
		`Candidate intakes: ${report.summary.candidateIntakes}`,
		`Project-local intakes: ${report.summary.projectLocalIntakes}`
	];

	if (!options.verbose) return lines.join('\n');

	return [
		...lines,
		'',
		'## Coverage',
		'',
		renderCanonPropertyOverlayCoverageReport(report.coverage),
		'',
		'## Inventory',
		'',
		renderCanonOverlayIntakeInventory(report.inventory)
	].join('\n');
}

export function inspectOverlayManifestDependencyIssues(
	rootDir: string,
	inventory: CanonProjectOverlayInventory
): CanonOverlayManifestDependencyIssue[] {
	const issues: CanonOverlayManifestDependencyIssue[] = [];

	for (const entry of inventory.entries) {
		const manifestPath = entry.manifestPath;
		if (!manifestPath.endsWith('/canon-overlay/manifest.ts')) continue;

		const source = readFileSync(resolve(rootDir, manifestPath), 'utf-8');
		const lines = source.split(/\r?\n/);

		lines.forEach((line, index) => {
			const trimmed = line.trim();
			if (/^import\s/.test(trimmed)) {
				issues.push({
					manifestPath,
					line: index + 1,
					syntax: 'import',
					message:
						'remove imports from canon-overlay manifests; export a plain CANON_PROJECT_OVERLAY_MANIFEST object instead'
				});
			}
			if (/^export\s+.*\s+from\s+['"]/.test(trimmed)) {
				issues.push({
					manifestPath,
					line: index + 1,
					syntax: 're-export',
					message:
						'remove re-exports from canon-overlay manifests; inventory should not depend on package module resolution'
				});
			}
			if (/^export\s+const\s+CANON_PROJECT_OVERLAY_MANIFEST\s*:/.test(trimmed)) {
				issues.push({
					manifestPath,
					line: index + 1,
					syntax: 'typed-manifest-export',
					message:
						'remove manifest type annotations so downstream package typechecks do not require Canon dist to exist first'
				});
			}
		});
	}

	return issues;
}

export function resolveRepoRoot(rootDir: string) {
	const candidates = [
		rootDir.startsWith('/') ? rootDir : resolve(process.env.INIT_CWD ?? process.cwd(), rootDir),
		resolve(process.cwd(), rootDir)
	];

	for (const candidate of candidates) {
		const root = findRepoRoot(candidate);
		if (root) return root;
	}

	throw new Error(`Could not resolve repo root from ${rootDir}`);
}

function findRepoRoot(startDir: string): string | undefined {
	let current = resolve(startDir);

	while (true) {
		if (
			existsSync(resolve(current, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(current, 'packages/canon/package.json'))
		) {
			return current;
		}

		const parent = dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

async function main() {
	const root = readFlag('--root') ?? '.';
	const json = process.argv.includes('--json');
	const verbose = process.argv.includes('--verbose');
	const report = await buildCanonOverlayQualityGateReport(root);

	if (json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(renderCanonOverlayQualityGateReport(report, { verbose }));
	}

	assertCanonOverlayQualityGate(report);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
