#!/usr/bin/env tsx
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, relative, resolve } from 'node:path';

import type { CanonRegistryModality } from '../src/lib/registry/schema.js';

const REQUIRED_MODALITIES: CanonRegistryModality[] = ['web', 'chat', 'app', 'voice', 'glasses'];
const SEARCH_ROOTS = ['packages', 'apps'];
const SKIP_DIRS = new Set([
	'.git',
	'.svelte-kit',
	'.wrangler',
	'dist',
	'node_modules',
	'playwright-report',
	'test-results'
]);

export type CanonPropertyOverlayCoverageEntry = {
	packageName: string;
	packageDir: string;
	overlayPath?: string;
	status: 'covered' | 'missing-overlay' | 'mismatched-source-package' | 'missing-modalities';
	missingModalities: CanonRegistryModality[];
};

export type CanonPropertyOverlayCoverageReport = {
	id: 'canon-property-overlay-coverage';
	rootDir: string;
	requiredPackages: CanonPropertyOverlayCoverageEntry[];
	excludedCanonConsumers: Array<{
		packageName: string;
		packageDir: string;
		reason: string;
	}>;
	summary: {
		required: number;
		covered: number;
		missingOverlay: number;
		mismatchedSourcePackage: number;
		missingModalities: number;
		excludedCanonConsumers: number;
	};
};

type PackageInfo = {
	name: string;
	dir: string;
	dependencies: Record<string, string>;
};

export async function buildCanonPropertyOverlayCoverageReport(rootDir: string) {
	const root = resolve(rootDir);
	const packages = await findPackages(root);
	const directCanonConsumers = packages.filter((pkg) => Boolean(pkg.dependencies['@create-something/canon']));
	const required: CanonPropertyOverlayCoverageEntry[] = [];
	const excluded: CanonPropertyOverlayCoverageReport['excludedCanonConsumers'] = [];

	for (const pkg of directCanonConsumers) {
		const rendered = isRenderedSveltePackage(pkg.dir);
		const canonSource = pkg.name === '@create-something/canon';

		if (!rendered || canonSource) {
			excluded.push({
				packageName: pkg.name,
				packageDir: relative(root, pkg.dir),
				reason: canonSource ? 'canon-source-package' : 'non-rendered-canon-consumer'
			});
			continue;
		}

		const overlayPath = join(pkg.dir, 'canon-overlay/manifest.ts');
		if (!existsSync(overlayPath)) {
			required.push({
				packageName: pkg.name,
				packageDir: relative(root, pkg.dir),
				status: 'missing-overlay',
				missingModalities: REQUIRED_MODALITIES
			});
			continue;
		}

		const overlay = await readOverlayManifestSummary(overlayPath);
		const missingModalities = REQUIRED_MODALITIES.filter(
			(modality) => !overlay?.targetModalities?.includes(modality)
		);

		required.push({
			packageName: pkg.name,
			packageDir: relative(root, pkg.dir),
			overlayPath: relative(root, overlayPath),
			status:
				overlay?.sourcePackage !== pkg.name
					? 'mismatched-source-package'
					: missingModalities.length > 0
						? 'missing-modalities'
						: 'covered',
			missingModalities
		});
	}

	const report: CanonPropertyOverlayCoverageReport = {
		id: 'canon-property-overlay-coverage',
		rootDir: root,
		requiredPackages: required.sort((a, b) => a.packageDir.localeCompare(b.packageDir)),
		excludedCanonConsumers: excluded.sort((a, b) => a.packageDir.localeCompare(b.packageDir)),
		summary: {
			required: required.length,
			covered: required.filter((entry) => entry.status === 'covered').length,
			missingOverlay: required.filter((entry) => entry.status === 'missing-overlay').length,
			mismatchedSourcePackage: required.filter((entry) => entry.status === 'mismatched-source-package')
				.length,
			missingModalities: required.filter((entry) => entry.status === 'missing-modalities').length,
			excludedCanonConsumers: excluded.length
		}
	};

	return report;
}

export function assertCanonPropertyOverlayCoverage(report: CanonPropertyOverlayCoverageReport) {
	const failures = report.requiredPackages.filter((entry) => entry.status !== 'covered');
	if (failures.length === 0) return;

	throw new Error(
		[
			'Canon property overlay coverage failed.',
			...failures.map((entry) => {
				const details =
					entry.status === 'missing-modalities'
						? ` missing modalities: ${entry.missingModalities.join(', ')}`
						: '';
				return `- ${entry.packageName} (${entry.packageDir}): ${entry.status}${details}`;
			})
		].join('\n')
	);
}

export function renderCanonPropertyOverlayCoverageReport(report: CanonPropertyOverlayCoverageReport) {
	const lines = [
		'# Canon Property Overlay Coverage',
		'',
		`Required rendered Canon consumers: ${report.summary.required}`,
		`Covered: ${report.summary.covered}`,
		`Missing overlays: ${report.summary.missingOverlay}`,
		`Mismatched source packages: ${report.summary.mismatchedSourcePackage}`,
		`Missing modalities: ${report.summary.missingModalities}`,
		`Excluded direct Canon consumers: ${report.summary.excludedCanonConsumers}`,
		'',
		'## Required Packages',
		'',
		...report.requiredPackages.map((entry) => {
			const overlay = entry.overlayPath ? ` -> ${entry.overlayPath}` : '';
			const missing =
				entry.missingModalities.length > 0
					? ` missing ${entry.missingModalities.join(', ')}`
					: '';
			return `- ${entry.status}: ${entry.packageName} (${entry.packageDir})${overlay}${missing}`;
		}),
		'',
		'## Excluded Direct Canon Consumers',
		'',
		...report.excludedCanonConsumers.map(
			(entry) => `- ${entry.reason}: ${entry.packageName} (${entry.packageDir})`
		)
	];

	return lines.join('\n');
}

async function findPackages(root: string) {
	const packages: PackageInfo[] = [];

	for (const searchRoot of SEARCH_ROOTS) {
		const absolute = join(root, searchRoot);
		if (existsSync(absolute)) await walkPackages(root, absolute, packages);
	}

	return packages.sort((a, b) => a.dir.localeCompare(b.dir));
}

async function walkPackages(root: string, dir: string, packages: PackageInfo[]) {
	const entries = await readdir(dir, { withFileTypes: true });
	const packageJson = entries.find((entry) => entry.isFile() && entry.name === 'package.json');

	if (packageJson) {
		const packagePath = join(dir, 'package.json');
		const json = JSON.parse(await readFile(packagePath, 'utf8')) as {
			name?: string;
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
		};
		if (json.name) {
			packages.push({
				name: json.name,
				dir,
				dependencies: {
					...json.dependencies,
					...json.devDependencies,
					...json.peerDependencies
				}
			});
		}
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
		await walkPackages(root, join(dir, entry.name), packages);
	}
}

function isRenderedSveltePackage(dir: string) {
	return (
		existsSync(join(dir, 'src/routes')) &&
		['svelte.config.js', 'svelte.config.mjs', 'svelte.config.ts'].some((file) =>
			existsSync(join(dir, file))
		)
	);
}

async function readOverlayManifestSummary(overlayPath: string) {
	const source = await readFile(overlayPath, 'utf8');
	const sourcePackage = source.match(/"sourcePackage":\s*"([^"]+)"/)?.[1];
	const modalitiesBlock = source.match(/"targetModalities":\s*\[([\s\S]*?)\]/)?.[1] ?? '';
	const targetModalities = Array.from(modalitiesBlock.matchAll(/"([^"]+)"/g))
		.map((match) => match[1])
		.filter((modality): modality is CanonRegistryModality =>
			REQUIRED_MODALITIES.includes(modality as CanonRegistryModality)
		);

	return { sourcePackage, targetModalities };
}

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

async function main() {
	const root = resolve(process.env.INIT_CWD ?? process.cwd(), readFlag('--root') ?? '.');
	const json = process.argv.includes('--json');
	const report = await buildCanonPropertyOverlayCoverageReport(root);

	if (json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(renderCanonPropertyOverlayCoverageReport(report));
	}

	assertCanonPropertyOverlayCoverage(report);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
