#!/usr/bin/env tsx
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	buildCanonOverlayIntakeInventory,
	type CanonOverlayIntakeInventoryOptions
} from '../src/lib/overlays/intake.js';
import type {
	CanonProjectOverlayInventory,
	CanonProjectOverlayInventoryEntry
} from '../src/lib/registry/schema.js';
import { resolveRepoRoot } from './check-overlay-quality-gate.js';

export type CanonOverlayConsumerCompatibilityReport = {
	id: 'canon-overlay-consumer-compatibility';
	rootDir: string;
	canonPackageRoot: string;
	fixtures: CanonOverlayConsumerFixture[];
	issues: CanonOverlayConsumerCompatibilityIssue[];
	summary: {
		totalOverlays: number;
		readyOverlays: number;
		checkedOverlays: number;
		consumerFixtures: number;
		compatibilityIssues: number;
	};
};

export type CanonOverlayConsumerCompatibilityIssue = {
	manifestPath?: string;
	sourcePackage?: string;
	message: string;
	details?: string;
};

export type CanonOverlayConsumerFixture = {
	fileName: string;
	manifestPath: string;
	sourcePackage: string;
	source: string;
};

export type CanonOverlayConsumerCompatibilityOptions = {
	inventory?: CanonProjectOverlayInventory;
	searchRoots?: CanonOverlayIntakeInventoryOptions['searchRoots'];
	includeNotReady?: boolean;
	keepTemp?: boolean;
	tscBinPath?: string;
};

export async function buildCanonOverlayConsumerCompatibilityReport(
	rootDir: string,
	options: CanonOverlayConsumerCompatibilityOptions = {}
): Promise<CanonOverlayConsumerCompatibilityReport> {
	const root = resolveRepoRoot(rootDir);
	const canonPackageRoot = resolve(root, 'packages/canon');
	const inventory =
		options.inventory ??
		(await buildCanonOverlayIntakeInventory({
			rootDir: root,
			searchRoots: options.searchRoots
		}));
	const entries = options.includeNotReady
		? inventory.entries
		: inventory.entries.filter((entry) => entry.review.status === 'ready');
	const fixtures = createCanonOverlayConsumerFixtures(entries);
	const issues = inspectCanonOverlayConsumerCompatibility(root, canonPackageRoot, fixtures, options);

	return {
		id: 'canon-overlay-consumer-compatibility',
		rootDir: root,
		canonPackageRoot,
		fixtures,
		issues,
		summary: {
			totalOverlays: inventory.summary.total,
			readyOverlays: inventory.summary.ready,
			checkedOverlays: entries.length,
			consumerFixtures: fixtures.length,
			compatibilityIssues: issues.length
		}
	};
}

export function createCanonOverlayConsumerFixtures(
	entries: CanonProjectOverlayInventoryEntry[]
): CanonOverlayConsumerFixture[] {
	return entries.map((entry, index) => ({
		fileName: `${String(index + 1).padStart(3, '0')}-${slugifyPath(entry.manifestPath)}.ts`,
		manifestPath: entry.manifestPath,
		sourcePackage: entry.manifest.sourcePackage,
		source: renderCanonOverlayConsumerFixture(entry)
	}));
}

export function renderCanonOverlayConsumerFixture(entry: CanonProjectOverlayInventoryEntry): string {
	return [
		"import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';",
		'',
		`// Manifest: ${entry.manifestPath}`,
		`// Source package: ${entry.manifest.sourcePackage}`,
		`export const CANON_PROJECT_OVERLAY_CONSUMER_FIXTURE = ${JSON.stringify(
			entry.manifest,
			null,
			2
		)} satisfies CanonProjectOverlayManifest;`,
		''
	].join('\n');
}

export function assertCanonOverlayConsumerCompatibility(
	report: CanonOverlayConsumerCompatibilityReport
) {
	if (report.issues.length === 0) return;

	throw new Error(
		[
			'Canon overlay consumer compatibility failed.',
			...report.issues.map((issue) => {
				const target = issue.manifestPath
					? `${issue.manifestPath}${issue.sourcePackage ? ` (${issue.sourcePackage})` : ''}`
					: 'Canon overlay consumer compatibility';
				return `- ${target}: ${issue.message}${issue.details ? `\n${indent(issue.details)}` : ''}`;
			})
		].join('\n')
	);
}

export function renderCanonOverlayConsumerCompatibilityReport(
	report: CanonOverlayConsumerCompatibilityReport
) {
	return [
		'# Canon Overlay Consumer Compatibility',
		'',
		`Root: ${report.rootDir}`,
		`Canon package root: ${relative(report.rootDir, report.canonPackageRoot)}`,
		`Total overlays: ${report.summary.totalOverlays}`,
		`Ready overlays: ${report.summary.readyOverlays}`,
		`Checked overlays: ${report.summary.checkedOverlays}`,
		`Consumer fixtures: ${report.summary.consumerFixtures}`,
		`Compatibility issues: ${report.summary.compatibilityIssues}`
	].join('\n');
}

function inspectCanonOverlayConsumerCompatibility(
	rootDir: string,
	canonPackageRoot: string,
	fixtures: CanonOverlayConsumerFixture[],
	options: CanonOverlayConsumerCompatibilityOptions
): CanonOverlayConsumerCompatibilityIssue[] {
	const registryTypesPath = resolve(canonPackageRoot, 'dist/registry/index.d.ts');
	if (!existsSync(registryTypesPath)) {
		return [
			{
				message:
					'Canon registry types are missing; run pnpm --filter @create-something/canon package before overlay:consumer-check',
				details: relative(rootDir, registryTypesPath)
			}
		];
	}

	const tscBinPath = options.tscBinPath ?? resolveTypeScriptBinPath(rootDir);
	if (!tscBinPath) {
		return [
			{
				message: 'TypeScript compiler was not found for overlay consumer compatibility check'
			}
		];
	}

	const scratchRoot = resolve(canonPackageRoot, '.tmp');
	mkdirSync(scratchRoot, { recursive: true });
	const tempDir = mkdtempSync(resolve(scratchRoot, 'overlay-consumers-'));
	const fixtureByPath = new Map<string, CanonOverlayConsumerFixture>();

	try {
		for (const fixture of fixtures) {
			const fixturePath = resolve(tempDir, fixture.fileName);
			fixtureByPath.set(fixturePath, fixture);
			writeFileSync(fixturePath, fixture.source, 'utf-8');
		}

		const tsconfigPath = resolve(tempDir, 'tsconfig.json');
		writeFileSync(
			tsconfigPath,
			JSON.stringify(
				{
					compilerOptions: {
						target: 'ES2022',
						module: 'NodeNext',
						moduleResolution: 'NodeNext',
						strict: true,
						noEmit: true,
						skipLibCheck: true,
						types: [],
						verbatimModuleSyntax: true
					},
					include: ['./*.ts']
				},
				null,
				2
			),
			'utf-8'
		);

		execFileSync(process.execPath, [tscBinPath, '-p', tsconfigPath, '--pretty', 'false'], {
			cwd: canonPackageRoot,
			encoding: 'utf-8',
			stdio: 'pipe'
		});

		return [];
	} catch (error) {
		const output = extractCommandOutput(error);
		return parseTypeScriptIssues(output, fixtureByPath);
	} finally {
		if (!options.keepTemp) rmSync(tempDir, { recursive: true, force: true });
	}
}

function parseTypeScriptIssues(
	output: string,
	fixtureByPath: Map<string, CanonOverlayConsumerFixture>
): CanonOverlayConsumerCompatibilityIssue[] {
	const issues: CanonOverlayConsumerCompatibilityIssue[] = [];
	const lines = output.split(/\r?\n/).filter(Boolean);

	for (const line of lines) {
		const match = line.match(/^(.*?\.ts)\(\d+,\d+\):\s+error\s+TS\d+:\s+(.*)$/);
		if (!match) continue;
		const fixture = fixtureByPath.get(resolve(match[1]));
		if (!fixture) continue;
		issues.push({
			manifestPath: fixture.manifestPath,
			sourcePackage: fixture.sourcePackage,
			message: match[2],
			details: line
		});
	}

	if (issues.length > 0) return dedupeIssues(issues);

	return [
		{
			message: 'TypeScript consumer fixture check failed',
			details: output.trim() || '(no TypeScript output)'
		}
	];
}

function resolveTypeScriptBinPath(rootDir: string): string | undefined {
	const candidates = [
		resolve(rootDir, 'node_modules/typescript/bin/tsc'),
		resolve(process.cwd(), 'node_modules/typescript/bin/tsc')
	];
	return candidates.find((candidate) => existsSync(candidate));
}

function extractCommandOutput(error: unknown) {
	const commandError = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
	const stdout = commandError.stdout?.toString() ?? '';
	const stderr = commandError.stderr?.toString() ?? '';
	const message = commandError.message ?? '';
	return [stdout, stderr, message].filter(Boolean).join('\n');
}

function dedupeIssues(
	issues: CanonOverlayConsumerCompatibilityIssue[]
): CanonOverlayConsumerCompatibilityIssue[] {
	const seen = new Set<string>();
	return issues.filter((issue) => {
		const key = `${issue.manifestPath}:${issue.message}:${issue.details}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function slugifyPath(path: string) {
	return path
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function indent(value: string) {
	return value
		.split(/\r?\n/)
		.map((line) => `  ${line}`)
		.join('\n');
}

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

async function main() {
	const root = readFlag('--root') ?? '.';
	const json = process.argv.includes('--json');
	const report = await buildCanonOverlayConsumerCompatibilityReport(root, {
		keepTemp: process.argv.includes('--keep-temp')
	});

	if (json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(renderCanonOverlayConsumerCompatibilityReport(report));
	}

	assertCanonOverlayConsumerCompatibility(report);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
