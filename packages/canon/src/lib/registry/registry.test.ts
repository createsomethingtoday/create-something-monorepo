import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	CANON_PROJECT_OVERLAY_TEMPLATE_FILES,
	CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST,
	CANON_PROJECT_OVERLAY_TEMPLATE_ROOT
} from '../overlays/project-template/index.js';
import {
	CANON_REGISTRY_MANIFEST,
	getCanonRegistryItem,
	listCanonRegistryModalities,
	reviewCanonProjectOverlay,
	routeCanonExtensionIntake,
	searchCanonRegistry
} from './index.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const canonPackageJson = JSON.parse(
	readFileSync(join(repoRoot, 'packages/canon/package.json'), 'utf-8')
) as {
	exports: Record<string, unknown>;
};
const mcpCanonRegistrySnapshotPath = join(
	repoRoot,
	'packages/create-something-mcp/src/content/generated/canon-registry.ts'
);

function exportKeyForCanonImportPath(importPath: string): string | null {
	if (importPath === '@create-something/canon') return '.';
	const prefix = '@create-something/canon/';
	if (!importPath.startsWith(prefix)) return null;
	return `./${importPath.slice(prefix.length)}`;
}

function readMcpCanonRegistrySnapshot() {
	const source = readFileSync(mcpCanonRegistrySnapshotPath, 'utf-8');
	const assignment = 'export const CANON_REGISTRY_MANIFEST: CanonRegistryManifest = ';
	const start = source.indexOf(assignment);
	const end = source.lastIndexOf('\n};');

	expect(start, 'generated MCP Canon registry assignment').toBeGreaterThanOrEqual(0);
	expect(end, 'generated MCP Canon registry terminator').toBeGreaterThan(start);

	return JSON.parse(source.slice(start + assignment.length, end + 2));
}

function clearComponentIdForExport(exportName: string) {
	return `component.${exportName
		.replace(/^Clear/, 'clear')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase()}`;
}

function prefixedComponentIdForExport(idPrefix: string, exportName: string) {
	return `component.${idPrefix}-${exportName
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase()}`;
}

function publicDefaultExports(relativeIndexPath: string) {
	const source = readFileSync(join(repoRoot, relativeIndexPath), 'utf-8');
	return [...source.matchAll(/default as ([A-Za-z0-9]+)/g)].map((match) => match[1]);
}

function expectPublicComponentBarrelCovered(options: {
	componentDir: 'form' | 'feedback' | 'navigation';
	idPrefix: string;
	docsPath: string;
	tag: string;
}) {
	const exportNames = publicDefaultExports(
		`packages/canon/src/lib/components/${options.componentDir}/index.ts`
	);
	const registryIds = new Set(CANON_REGISTRY_MANIFEST.items.map((item) => item.id));

	expect(exportNames.length).toBeGreaterThan(0);
	expect(new Set(exportNames).size).toBe(exportNames.length);

	for (const exportName of exportNames) {
		const id = prefixedComponentIdForExport(options.idPrefix, exportName);

		expect(registryIds.has(id), id).toBe(true);
		const item = getCanonRegistryItem(id);

		expect(item?.kind, id).toBe('component');
		expect(item?.maturity, id).toBe('stable');
		expect(item?.sourcePath, id).toBe(
			`packages/canon/src/lib/components/${options.componentDir}/${exportName}.svelte`
		);
		expect(item?.importPath, id).toBe('@create-something/canon');
		expect(item?.docsPath, id).toBe(options.docsPath);
		expect(item?.tags, id).toContain(options.tag);
		expect(item?.dependencies, id).toContain('token.canon-core');
	}
}

describe('Canon registry manifest', () => {
	it('covers every required product modality', () => {
		expect(listCanonRegistryModalities()).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
	});

	it('keeps registry item ids unique and dependencies resolvable', () => {
		const ids = CANON_REGISTRY_MANIFEST.items.map((item) => item.id);
		expect(new Set(ids).size).toBe(ids.length);

		for (const item of CANON_REGISTRY_MANIFEST.items) {
			for (const dependencyId of item.dependencies ?? []) {
				expect(getCanonRegistryItem(dependencyId), `${item.id} -> ${dependencyId}`).toBeDefined();
			}
		}
	});

	it('keeps registry source paths backed by repo files', () => {
		for (const item of CANON_REGISTRY_MANIFEST.items) {
			expect(existsSync(join(repoRoot, item.sourcePath)), item.id).toBe(true);
		}
	});

	it('keeps Canon import paths aligned with package exports', () => {
		for (const item of CANON_REGISTRY_MANIFEST.items) {
			if (!item.importPath) continue;
			const exportKey = exportKeyForCanonImportPath(item.importPath);

			expect(exportKey, item.id).not.toBeNull();
			expect(canonPackageJson.exports, `${item.id} -> ${item.importPath}`).toHaveProperty(
				exportKey as string
			);
		}
	});

	it('keeps item modalities inside the required modality set', () => {
		const requiredModalities = new Set(CANON_REGISTRY_MANIFEST.requiredModalities);

		for (const item of CANON_REGISTRY_MANIFEST.items) {
			expect(item.modalities.length, item.id).toBeGreaterThan(0);
			for (const modality of item.modalities) {
				expect(requiredModalities.has(modality), `${item.id} -> ${modality}`).toBe(true);
			}
		}
	});

	it('keeps the MCP Canon registry snapshot synchronized', () => {
		expect(readMcpCanonRegistrySnapshot()).toEqual(CANON_REGISTRY_MANIFEST);
	});

	it('covers every public Clear primitive in the registry', () => {
		const clearIndexSource = readFileSync(
			join(repoRoot, 'packages/canon/src/lib/components/clear/index.ts'),
			'utf-8'
		);
		const clearExportNames = [...clearIndexSource.matchAll(/default as (Clear[A-Za-z0-9]+)/g)].map(
			(match) => match[1]
		);
		const expectedIds = clearExportNames.map(clearComponentIdForExport);
		const registryIds = new Set(CANON_REGISTRY_MANIFEST.items.map((item) => item.id));

		expect(clearExportNames.length).toBeGreaterThan(0);
		expect(new Set(clearExportNames).size).toBe(clearExportNames.length);

		for (const id of expectedIds) {
			expect(registryIds.has(id), id).toBe(true);
			const item = getCanonRegistryItem(id);
			const exportName = clearExportNames[expectedIds.indexOf(id)];

			expect(item?.kind, id).toBe('component');
			expect(item?.maturity, id).toBe('stable');
			expect(item?.sourcePath, id).toBe(
				`packages/canon/src/lib/components/clear/${exportName}.svelte`
			);
			expect(item?.importPath, id).toBe('@create-something/canon');
			expect(item?.docsPath, id).toBe('/canon/components/clear');
			expect(item?.tags, id).toContain('clear');
		}
	});

	it('covers every public foundation control primitive in the registry', () => {
		expectPublicComponentBarrelCovered({
			componentDir: 'form',
			idPrefix: 'form',
			docsPath: '/canon/components/form',
			tag: 'form'
		});
		expectPublicComponentBarrelCovered({
			componentDir: 'feedback',
			idPrefix: 'feedback',
			docsPath: '/canon/components/feedback',
			tag: 'feedback'
		});
		expectPublicComponentBarrelCovered({
			componentDir: 'navigation',
			idPrefix: 'navigation',
			docsPath: '/canon/components/navigation',
			tag: 'navigation'
		});
	});

	it('exposes ClearDecisionPanel as the shared decision surface', () => {
		const item = getCanonRegistryItem('component.clear-decision-panel');

		expect(item?.maturity).toBe('stable');
		expect(item?.modalities).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
		expect(item?.contract.evidence).toContain('evidence');
	});

	it('searches templates by modality and operational language', () => {
		const results = searchCanonRegistry('routing evidence', {
			kind: 'template',
			modality: 'glasses'
		});

		expect(results.map((item) => item.id)).toContain('template.glasses-routing-hud');
	});

	it('exposes the Canon extension intake template across modalities', () => {
		const item = getCanonRegistryItem('template.canon-extension-intake');

		expect(item?.kind).toBe('template');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.contract.evidence).toContain('two distinct surfaces');
	});

	it('exposes the Canon project overlay manifest across modalities', () => {
		const item = getCanonRegistryItem('template.canon-project-overlay-manifest');

		expect(item?.kind).toBe('template');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.dependencies).toContain('template.canon-extension-intake');
		expect(item?.contract.extension).toContain('named overlay artifacts');
	});

	it('exposes the Canon project overlay template pack across modalities', () => {
		const item = getCanonRegistryItem('template.canon-project-overlay-template-pack');

		expect(item?.kind).toBe('template');
		expect(item?.maturity).toBe('candidate');
		expect(item?.importPath).toBe('@create-something/canon/overlays/project-template');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.dependencies).toEqual([
			'template.canon-project-overlay-manifest',
			'template.canon-extension-intake',
			'token.canon-core',
			'policy.signal-decision-proof'
		]);
		expect(item?.contract.extension).toContain('instead of forks');
	});

	it('exposes the Atlas development handoff template for every modality', () => {
		const item = getCanonRegistryItem('template.atlas-development-handoff');

		expect(item?.kind).toBe('template');
		expect(item?.maturity).toBe('candidate');
		expect(item?.importPath).toBe('@create-something/canon/atlas/handoff');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.dependencies).toEqual([
			'adapter.atlas-graph-artifact',
			'policy.signal-decision-proof'
		]);
		expect(item?.contract.evidence).toContain('Linear evidence path');
	});

	it('keeps one-off overlay extensions project-local', () => {
		const decision = routeCanonExtensionIntake({
			id: 'overlay.client-proof-panel',
			title: 'Client Proof Panel',
			summary: 'A local proof panel for one client launch.',
			requestedKind: 'component',
			requestedModalities: ['web'],
			owner: 'client-team',
			sourcePackage: '@create-something/agency',
			sourcePath: 'packages/agency/src/lib/ClientProofPanel.svelte',
			tags: ['proof', 'client'],
			surfaces: [
				{
					surfaceId: 'agency-client-launch',
					name: 'Agency client launch',
					modality: 'web'
				}
			]
		});

		expect(decision.stage).toBe('project-local');
		expect(decision.action).toBe('keep-local');
		expect(decision.requiredEvidence.join(' ')).toContain('second surface');
	});

	it('routes repeated overlay evidence into candidate promotion', () => {
		const decision = routeCanonExtensionIntake({
			id: 'template.operator-handoff-brief',
			title: 'Operator Handoff Brief',
			summary: 'A compact state, owner, receipt, and next-action brief.',
			requestedKind: 'template',
			requestedModalities: ['chat', 'voice'],
			owner: 'canon',
			sourcePackage: '@create-something/canon',
			tags: ['handoff', 'brief', 'receipt'],
			surfaces: [
				{
					surfaceId: 'chat-reviewer-handoff',
					name: 'Chat reviewer handoff',
					modality: 'chat'
				},
				{
					surfaceId: 'voice-standup-brief',
					name: 'Voice standup brief',
					modality: 'voice'
				}
			]
		});

		expect(decision.stage).toBe('candidate');
		expect(decision.action).toBe('promote-candidate');
		expect(decision.stopBeforeStable.join(' ')).toContain('export path');
	});

	it('routes stable matches back to the existing Canon item', () => {
		const decision = routeCanonExtensionIntake({
			id: 'overlay.local-decision-card',
			title: 'Local Decision Card',
			summary: 'A local decision card that duplicates ClearDecisionPanel behavior.',
			requestedKind: 'component',
			requestedModalities: ['web'],
			owner: 'agency',
			sourcePackage: '@create-something/agency',
			tags: ['decision'],
			matchesRegistryItemId: 'component.clear-decision-panel',
			surfaces: []
		});

		expect(decision.stage).toBe('canon-stable');
		expect(decision.action).toBe('use-existing');
		expect(decision.rationale).toContain('component.clear-decision-panel');
	});

	it('requires migration evidence before deprecating a Canon item', () => {
		const decision = routeCanonExtensionIntake({
			id: 'replacement.proof-strip-v2',
			title: 'Proof Strip V2',
			summary: 'Replacement proposal for compact proof summaries.',
			requestedKind: 'component',
			requestedModalities: ['web', 'app'],
			owner: 'canon',
			sourcePackage: '@create-something/canon',
			tags: ['proof', 'replacement'],
			deprecatesRegistryItemId: 'component.clear-proof-strip',
			surfaces: []
		});

		expect(decision.stage).toBe('deprecated');
		expect(decision.action).toBe('mark-deprecated');
		expect(decision.requiredEvidence.join(' ')).toContain('Migration guidance');
	});

	it('marks a complete overlay manifest ready when shared extension evidence exists', () => {
		const review = reviewCanonProjectOverlay({
			id: 'overlay.agency-client',
			name: 'Agency Client Overlay',
			owner: 'agency',
			sourcePackage: '@create-something/agency',
			targetModalities: ['web', 'chat'],
			artifacts: [
				{ kind: 'theme', path: 'theme.css' },
				{ kind: 'tokens', path: 'tokens.json' },
				{ kind: 'templates', path: 'templates/' },
				{ kind: 'copy-rules', path: 'copy-rules.md' },
				{ kind: 'surface-policy', path: 'surface-policy.md' },
				{ kind: 'registry', path: 'registry.json' }
			],
			extensionIntakes: [
				{
					id: 'overlay.operator-handoff-brief',
					title: 'Operator Handoff Brief',
					summary: 'A compact state, owner, receipt, and next-action brief.',
					requestedKind: 'template',
					requestedModalities: ['chat', 'voice'],
					owner: 'agency',
					sourcePackage: '@create-something/agency',
					tags: ['handoff', 'brief'],
					surfaces: [
						{ surfaceId: 'chat-reviewer-handoff', name: 'Chat reviewer handoff', modality: 'chat' },
						{ surfaceId: 'voice-standup-brief', name: 'Voice standup brief', modality: 'voice' }
					]
				}
			]
		});

		expect(review.status).toBe('ready');
		expect(review.missingArtifacts).toEqual([]);
		expect(review.extensionDecisions[0]?.decision.action).toBe('promote-candidate');
	});

	it('reports missing overlay artifacts before treating a manifest as complete', () => {
		const review = reviewCanonProjectOverlay({
			id: 'overlay.partial-client',
			name: 'Partial Client Overlay',
			owner: 'client-team',
			sourcePackage: '@create-something/agency',
			targetModalities: ['web'],
			artifacts: [
				{ kind: 'tokens', path: 'tokens.json' },
				{ kind: 'registry', path: 'registry.json' }
			]
		});

		expect(review.status).toBe('needs-artifacts');
		expect(review.missingArtifacts).toEqual([
			'theme',
			'templates',
			'copy-rules',
			'surface-policy'
		]);
		expect(review.stopConditions.join(' ')).toContain('missing overlay artifacts');
	});

	it('keeps one-surface overlay intakes in evidence collection', () => {
		const review = reviewCanonProjectOverlay({
			id: 'overlay.local-client',
			name: 'Local Client Overlay',
			owner: 'client-team',
			sourcePackage: '@create-something/agency',
			targetModalities: ['web'],
			artifacts: [
				{ kind: 'theme', path: 'theme.css' },
				{ kind: 'tokens', path: 'tokens.json' },
				{ kind: 'templates', path: 'templates/' },
				{ kind: 'copy-rules', path: 'copy-rules.md' },
				{ kind: 'surface-policy', path: 'surface-policy.md' },
				{ kind: 'registry', path: 'registry.json' }
			],
			extensionIntakes: [
				{
					id: 'overlay.local-proof-card',
					title: 'Local Proof Card',
					summary: 'A local proof card for one launch.',
					requestedKind: 'component',
					requestedModalities: ['web'],
					owner: 'client-team',
					sourcePackage: '@create-something/agency',
					tags: ['proof'],
					surfaces: [{ surfaceId: 'client-launch', name: 'Client launch', modality: 'web' }]
				}
			]
		});

		expect(review.status).toBe('needs-evidence');
		expect(review.extensionDecisions[0]?.decision.stage).toBe('project-local');
		expect(review.stopConditions.join(' ')).toContain('repeated-surface evidence');
	});

	it('keeps the copyable overlay template pack complete and reviewable', () => {
		for (const file of CANON_PROJECT_OVERLAY_TEMPLATE_FILES) {
			expect(existsSync(join(repoRoot, CANON_PROJECT_OVERLAY_TEMPLATE_ROOT, file)), file).toBe(true);
		}

		for (const artifact of CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST.artifacts) {
			expect(existsSync(join(repoRoot, artifact.path)), artifact.path).toBe(true);
		}

		const review = reviewCanonProjectOverlay(CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST);

		expect(review.status).toBe('ready');
		expect(review.missingArtifacts).toEqual([]);
		expect(review.presentArtifacts).toEqual([
			'theme',
			'tokens',
			'templates',
			'copy-rules',
			'surface-policy',
			'registry'
		]);
		expect(review.extensionDecisions[0]?.decision.action).toBe('promote-candidate');
		expect(review.stopConditions.join(' ')).toContain('Do not fork Canon primitives');
	});
});
