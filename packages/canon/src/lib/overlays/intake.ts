import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CANON_REGISTRY_MANIFEST, reviewCanonProjectOverlay } from '../registry/index.js';
import type {
	CanonProjectOverlayIntegrityIssue,
	CanonProjectOverlayInventory,
	CanonProjectOverlayInventoryEntry,
	CanonProjectOverlayManifest,
	CanonProjectOverlayReview,
	CanonRegistryModality
} from '../registry/schema.js';

const DEFAULT_SEARCH_ROOTS = ['apps', 'packages'];
const DEFAULT_IGNORED_DIRECTORIES = new Set([
	'.cache',
	'.git',
	'.svelte-kit',
	'.vite',
	'.wrangler',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'output'
]);

export type CanonOverlayIntakeInventoryOptions = {
	rootDir: string;
	rootLabel?: string;
	searchRoots?: string[];
	includeTemplate?: boolean;
};

type CanonOverlayManifestModule = {
	CANON_PROJECT_OVERLAY_MANIFEST?: unknown;
	default?: unknown;
};

export async function findCanonProjectOverlayManifestFiles(
	options: CanonOverlayIntakeInventoryOptions
): Promise<string[]> {
	const rootDir = resolve(options.rootDir);
	const searchRoots = normalizeSearchRoots(options.searchRoots);
	const files: string[] = [];

	for (const searchRoot of searchRoots) {
		await walk(join(rootDir, searchRoot), async (filePath) => {
			if (!filePath.endsWith('manifest.ts') && !filePath.endsWith('manifest.js')) return;
			if (!options.includeTemplate && isProjectTemplateManifest(rootDir, filePath)) return;

			const source = await readFile(filePath, 'utf-8');
			if (
				source.includes('CANON_PROJECT_OVERLAY_MANIFEST') ||
				source.includes('CanonProjectOverlayManifest')
			) {
				files.push(filePath);
			}
		});
	}

	return files.sort((a, b) => relative(rootDir, a).localeCompare(relative(rootDir, b)));
}

export async function loadCanonProjectOverlayManifest(
	manifestPath: string
): Promise<CanonProjectOverlayManifest> {
	const moduleUrl = `${pathToFileURL(manifestPath).href}?canonOverlay=${Date.now()}`;
	const manifestModule = (await import(moduleUrl)) as CanonOverlayManifestModule;
	const candidate = manifestModule.CANON_PROJECT_OVERLAY_MANIFEST ?? manifestModule.default;

	if (!isCanonProjectOverlayManifest(candidate)) {
		throw new Error(`${manifestPath} does not export CANON_PROJECT_OVERLAY_MANIFEST`);
	}

	return candidate;
}

export async function buildCanonOverlayIntakeInventory(
	options: CanonOverlayIntakeInventoryOptions
): Promise<CanonProjectOverlayInventory> {
	const rootDir = resolve(options.rootDir);
	const searchRoots = normalizeSearchRoots(options.searchRoots);
	const manifestFiles = await findCanonProjectOverlayManifestFiles({
		...options,
		rootDir,
		searchRoots
	});
	const entries: CanonProjectOverlayInventoryEntry[] = [];

	for (const manifestFile of manifestFiles) {
		const manifest = await loadCanonProjectOverlayManifest(manifestFile);
		const review = reviewCanonProjectOverlay(manifest, {
			integrityIssues: await inspectCanonProjectOverlayIntegrity({
				rootDir,
				manifestFile,
				manifest
			})
		});
		entries.push({
			manifestPath: normalizeRelativePath(rootDir, manifestFile),
			manifest,
			review
		});
	}

	return createCanonOverlayIntakeInventory({
		rootDir: options.rootLabel ?? rootDir,
		searchRoots,
		entries
	});
}

export function createCanonOverlayIntakeInventory({
	rootDir,
	searchRoots,
	entries
}: {
	rootDir: string;
	searchRoots: string[];
	entries: CanonProjectOverlayInventoryEntry[];
}): CanonProjectOverlayInventory {
	return {
		schemaVersion: 1,
		id: 'canon-overlay-intake-inventory',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Repo-level Canon overlay intake inventory for discovering project overlay manifests, reviewing evidence, and routing repeated-surface proposals back to Canon without forking primitives.',
		rootDir,
		searchRoots,
		entries,
		summary: summarizeOverlayInventory(entries),
		agentContract: {
			purpose: 'canon-overlay-intake-inventory',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'finding project/client Canon overlays across repo packages and apps',
				'reviewing overlay artifact completeness before handoff',
				'identifying extension intakes that are project-local versus candidate promotion',
				'keeping multi-project feedback attached to Canon overlay manifests instead of ad hoc docs'
			],
			stopBefore: [
				'automatically promoting a project-local overlay into Canon stable',
				'mutating project overlay files during inventory discovery',
				'using a one-surface overlay as evidence for shared Canon primitives',
				'creating a second overlay intake tracker outside Canon and Linear'
			]
		}
	};
}

export function renderCanonOverlayIntakeInventory(
	inventory: CanonProjectOverlayInventory
): string {
	const lines = [
		'# Canon Overlay Intake Inventory',
		'',
		`Root: ${inventory.rootDir}`,
		`Search roots: ${inventory.searchRoots.join(', ') || '(none)'}`,
		`Total overlays: ${inventory.summary.total}`,
		`Ready: ${inventory.summary.ready}`,
		`Needs artifacts: ${inventory.summary.needsArtifacts}`,
		`Needs evidence: ${inventory.summary.needsEvidence}`,
		`Needs review: ${inventory.summary.needsReview}`,
		`Candidate intakes: ${inventory.summary.candidateIntakes}`,
		`Project-local intakes: ${inventory.summary.projectLocalIntakes}`
	];

	if (inventory.entries.length === 0) {
		lines.push('', 'No project overlay manifests were found.');
		return lines.join('\n');
	}

	for (const entry of inventory.entries) {
		lines.push(
			'',
			`## ${entry.manifest.name}`,
			`- Manifest: ${entry.manifestPath}`,
			`- Overlay: ${entry.manifest.id}`,
			`- Owner: ${entry.manifest.owner}`,
			`- Source package: ${entry.manifest.sourcePackage}`,
			`- Modalities: ${entry.manifest.targetModalities.join(', ')}`,
			`- Status: ${entry.review.status}`,
			`- Summary: ${entry.review.summary}`
		);

		if (entry.review.integrityIssues.length) {
			lines.push(`- Integrity issues: ${entry.review.integrityIssues.length}`);
			for (const issue of entry.review.integrityIssues) {
				lines.push(`  - ${issue.message}`);
			}
		}

		for (const decision of entry.review.extensionDecisions) {
			lines.push(
				`- Intake ${decision.packet.id}: ${decision.decision.action} (${decision.decision.stage})`
			);
		}
	}

	return lines.join('\n');
}

function summarizeOverlayInventory(entries: CanonProjectOverlayInventoryEntry[]) {
	return {
		total: entries.length,
		ready: countReviews(entries, 'ready'),
		needsArtifacts: countReviews(entries, 'needs-artifacts'),
		needsEvidence: countReviews(entries, 'needs-evidence'),
		needsReview: countReviews(entries, 'needs-review'),
		candidateIntakes: countDecisions(entries, 'candidate'),
		projectLocalIntakes: countDecisions(entries, 'project-local')
	};
}

function countReviews(
	entries: CanonProjectOverlayInventoryEntry[],
	status: CanonProjectOverlayReview['status']
) {
	return entries.filter((entry) => entry.review.status === status).length;
}

function countDecisions(
	entries: CanonProjectOverlayInventoryEntry[],
	stage: 'candidate' | 'project-local'
) {
	return entries.reduce(
		(count, entry) =>
			count +
			entry.review.extensionDecisions.filter((decision) => decision.decision.stage === stage)
				.length,
		0
	);
}

async function inspectCanonProjectOverlayIntegrity({
	rootDir,
	manifestFile,
	manifest
}: {
	rootDir: string;
	manifestFile: string;
	manifest: CanonProjectOverlayManifest;
}): Promise<CanonProjectOverlayIntegrityIssue[]> {
	const overlayRoot = dirname(manifestFile);
	const packageRoot = overlayRoot.endsWith('/canon-overlay') ? dirname(overlayRoot) : overlayRoot;
	const registryIds = new Set(CANON_REGISTRY_MANIFEST.items.map((item) => item.id));
	const issues: CanonProjectOverlayIntegrityIssue[] = [];

	if (manifest.sourcePath) {
		await addMissingPathIssue({
			issues,
			rootDir,
			baseDir: overlayRoot,
			context: 'manifest.sourcePath',
			path: manifest.sourcePath,
			kind: 'missing-source-path'
		});
	}

	for (const artifact of manifest.artifacts) {
		await addMissingPathIssue({
			issues,
			rootDir,
			baseDir: overlayRoot,
			context: `artifact.${artifact.kind}`,
			path: artifact.path,
			kind: 'missing-artifact-file'
		});
		for (const registryItemId of artifact.registryItemIds ?? []) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `artifact.${artifact.kind}.registryItemIds`,
				registryItemId
			});
		}
	}

	for (const packet of manifest.extensionIntakes ?? []) {
		if (packet.sourcePath) {
			await addMissingPathIssue({
				issues,
				rootDir,
				baseDir: packageRoot,
				context: `intake.${packet.id}.sourcePath`,
				path: packet.sourcePath,
				kind: 'missing-source-path'
			});
		}
		for (const surface of packet.surfaces) {
			if (!surface.sourcePath) continue;
			await addMissingPathIssue({
				issues,
				rootDir,
				baseDir: packageRoot,
				context: `intake.${packet.id}.surface.${surface.surfaceId}.sourcePath`,
				path: surface.sourcePath,
				kind: 'missing-source-path'
			});
		}
		for (const registryItemId of packet.dependencies ?? []) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.dependencies`,
				registryItemId
			});
		}
		if (packet.matchesRegistryItemId) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.matchesRegistryItemId`,
				registryItemId: packet.matchesRegistryItemId
			});
		}
		if (packet.deprecatesRegistryItemId) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.deprecatesRegistryItemId`,
				registryItemId: packet.deprecatesRegistryItemId
			});
		}
	}

	return issues;
}

async function addMissingPathIssue({
	issues,
	rootDir,
	baseDir,
	context,
	path,
	kind
}: {
	issues: CanonProjectOverlayIntegrityIssue[];
	rootDir: string;
	baseDir: string;
	context: string;
	path: string;
	kind: 'missing-artifact-file' | 'missing-source-path';
}) {
	const fullPath = resolve(baseDir, path);
	if (await pathExists(fullPath)) return;

	const normalizedPath = normalizeRelativePath(rootDir, fullPath);
	issues.push({
		kind,
		context,
		path: normalizedPath,
		message:
			kind === 'missing-artifact-file'
				? `${context} points to missing overlay artifact path ${normalizedPath}.`
				: `${context} points to missing source path ${normalizedPath}.`
	});
}

function addUnknownRegistryIssue({
	issues,
	registryIds,
	context,
	registryItemId
}: {
	issues: CanonProjectOverlayIntegrityIssue[];
	registryIds: Set<string>;
	context: string;
	registryItemId: string;
}) {
	if (registryIds.has(registryItemId)) return;
	issues.push({
		kind: 'unknown-registry-item',
		context,
		registryItemId,
		message: `${context} references unknown Canon registry item ${registryItemId}.`
	});
}

async function pathExists(path: string) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function walk(root: string, visitFile: (filePath: string) => Promise<void>): Promise<void> {
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		const filePath = join(root, entry.name);
		if (entry.isDirectory()) {
			if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) continue;
			await walk(filePath, visitFile);
			continue;
		}

		if (entry.isFile()) {
			await visitFile(filePath);
		}
	}
}

function normalizeSearchRoots(searchRoots = DEFAULT_SEARCH_ROOTS) {
	return searchRoots.map((root) => root.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));
}

function normalizeRelativePath(rootDir: string, filePath: string) {
	return relative(rootDir, isAbsolute(filePath) ? filePath : resolve(filePath)).replace(/\\/g, '/');
}

function isProjectTemplateManifest(rootDir: string, filePath: string) {
	return (
		normalizeRelativePath(rootDir, filePath) ===
		'packages/canon/src/lib/overlays/project-template/manifest.ts'
	);
}

function isCanonProjectOverlayManifest(value: unknown): value is CanonProjectOverlayManifest {
	if (!value || typeof value !== 'object') return false;
	const manifest = value as Partial<CanonProjectOverlayManifest>;
	return (
		typeof manifest.id === 'string' &&
		manifest.id.startsWith('overlay.') &&
		typeof manifest.name === 'string' &&
		typeof manifest.owner === 'string' &&
		typeof manifest.sourcePackage === 'string' &&
		Array.isArray(manifest.targetModalities) &&
		manifest.targetModalities.every(isCanonRegistryModality) &&
		Array.isArray(manifest.artifacts)
	);
}

function isCanonRegistryModality(value: unknown): value is CanonRegistryModality {
	return (
		value === 'web' ||
		value === 'chat' ||
		value === 'app' ||
		value === 'voice' ||
		value === 'glasses'
	);
}
