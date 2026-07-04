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
	CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
	CANON_REGISTRY_MANIFEST,
	getCanonRegistryItem,
	getCanonPublicExportClassification,
	listCanonRegistryModalities,
	reviewCanonProjectOverlay,
	routeCanonExtensionIntake,
	searchCanonRegistry
} from './index.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const canonPackageJson = JSON.parse(
	readFileSync(join(repoRoot, 'packages/canon/package.json'), 'utf-8')
) as {
	exports: Record<string, string | { svelte?: string; default?: string; import?: string }>;
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

function componentIdForExport(exportName: string) {
	return `component.${exportName
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.toLowerCase()}`;
}

function publicDefaultExports(relativeIndexPath: string) {
	const source = readFileSync(join(repoRoot, relativeIndexPath), 'utf-8');
	return [...source.matchAll(/default as ([A-Za-z0-9]+)/g)].map((match) => match[1]);
}

function sourceIndexPathForSvelteExport(exportValue: {
	svelte?: string;
	default?: string;
	import?: string;
}) {
	const exportTarget = exportValue.svelte;
	if (!exportTarget?.startsWith('./dist/') || !exportTarget.endsWith('.js')) return null;

	return exportTarget.replace('./dist/', 'packages/canon/src/lib/').replace(/\.js$/, '.ts');
}

function publicSvelteComponentExports() {
	return Object.entries(canonPackageJson.exports).flatMap(([exportPath, exportValue]) => {
		if (typeof exportValue === 'string') return [];

		const sourcePath = sourceIndexPathForSvelteExport(exportValue);
		if (!sourcePath) return [];

		const absoluteSourcePath = join(repoRoot, sourcePath);
		if (!existsSync(absoluteSourcePath)) return [];

		const source = readFileSync(absoluteSourcePath, 'utf-8');
		const exportNames = [
			...source.matchAll(/export \{ default as ([A-Za-z0-9]+) \} from ['"][^'"]+\.svelte['"]/g),
			...source.matchAll(/default as ([A-Za-z0-9]+)/g)
		].map((match) => match[1]);

		return [...new Set(exportNames)].map((exportName) => ({
			exportPath,
			exportName,
			sourcePath
		}));
	});
}

function candidateRegistryItemIdsForPublicExport(exportPath: string, exportName: string) {
	const ids = [componentIdForExport(exportName)];
	const exportPathParts = exportPath.replace(/^\.\//, '').split('/');

	if (exportPathParts[0] === 'components' && exportPathParts[1]) {
		ids.push(prefixedComponentIdForExport(exportPathParts[1], exportName));
	} else if (exportPathParts[0] && exportPathParts[0] !== '.') {
		ids.push(prefixedComponentIdForExport(exportPathParts[0], exportName));
	}

	return [...new Set(ids)];
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

	it('promotes first accessibility and layout foundation exports into stable registry items', () => {
		const promotedItems = [
			{
				id: 'component.heading',
				exportPath: './components',
				exportName: 'Heading',
				sourcePath: 'packages/canon/src/lib/components/Heading.svelte',
				importPath: '@create-something/canon',
				tag: 'typography'
			},
			{
				id: 'component.skip-to-content',
				exportPath: './components',
				exportName: 'SkipToContent',
				sourcePath: 'packages/canon/src/lib/components/SkipToContent.svelte',
				importPath: '@create-something/canon',
				tag: 'accessibility'
			},
			{
				id: 'component.layout-section',
				exportPath: './layout',
				exportName: 'Section',
				sourcePath: 'packages/canon/src/lib/layout/Section.svelte',
				importPath: '@create-something/canon/layout',
				tag: 'layout'
			},
			{
				id: 'component.layout-section-header',
				exportPath: './layout',
				exportName: 'SectionHeader',
				sourcePath: 'packages/canon/src/lib/layout/SectionHeader.svelte',
				importPath: '@create-something/canon/layout',
				tag: 'layout'
			}
		];

		for (const promoted of promotedItems) {
			const item = getCanonRegistryItem(promoted.id);
			const classification = getCanonPublicExportClassification(
				promoted.exportPath,
				promoted.exportName
			);

			expect(item?.kind, promoted.id).toBe('component');
			expect(item?.maturity, promoted.id).toBe('stable');
			expect(item?.sourcePath, promoted.id).toBe(promoted.sourcePath);
			expect(item?.importPath, promoted.id).toBe(promoted.importPath);
			expect(item?.tags, promoted.id).toContain(promoted.tag);
			expect(item?.dependencies, promoted.id).toContain('token.canon-core');
			expect(classification?.registryPolicy, promoted.exportName).toBe('registry-covered');
		}
	});

	it('promotes generic layout primitives while leaving project-specific layout under review', () => {
		const promotedItems = [
			{
				id: 'component.layout-bento-grid',
				exportName: 'BentoGrid',
				sourcePath: 'packages/canon/src/lib/layout/BentoGrid.svelte',
				tag: 'grid',
				dependency: 'component.layout-bento-item'
			},
			{
				id: 'component.layout-bento-item',
				exportName: 'BentoItem',
				sourcePath: 'packages/canon/src/lib/layout/BentoItem.svelte',
				tag: 'grid-item',
				dependency: 'token.canon-core'
			},
			{
				id: 'component.layout-split-section',
				exportName: 'SplitSection',
				sourcePath: 'packages/canon/src/lib/layout/SplitSection.svelte',
				tag: 'split',
				dependency: 'component.layout-section'
			}
		];

		for (const promoted of promotedItems) {
			const item = getCanonRegistryItem(promoted.id);
			const classification = getCanonPublicExportClassification('./layout', promoted.exportName);

			expect(item?.kind, promoted.id).toBe('component');
			expect(item?.maturity, promoted.id).toBe('stable');
			expect(item?.sourcePath, promoted.id).toBe(promoted.sourcePath);
			expect(item?.importPath, promoted.id).toBe('@create-something/canon/layout');
			expect(item?.tags, promoted.id).toContain(promoted.tag);
			expect(item?.dependencies, promoted.id).toContain('token.canon-core');
			expect(item?.dependencies, promoted.id).toContain(promoted.dependency);
			expect(classification?.registryPolicy, promoted.exportName).toBe('registry-covered');
		}

		expect(getCanonPublicExportClassification('./layout', 'ProjectGridInteractive')).toMatchObject({
			registryPolicy: 'candidate-review'
		});
	});

	it('promotes the accessible icon primitive while keeping icon helpers reviewable', () => {
		const item = getCanonRegistryItem('component.icon');
		const classification = getCanonPublicExportClassification('./icons', 'Icon');
		const helperClassification = getCanonPublicExportClassification('./icons', 'ICON_PATHS');

		expect(item?.kind).toBe('component');
		expect(item?.maturity).toBe('stable');
		expect(item?.sourcePath).toBe('packages/canon/src/lib/icons/Icon.svelte');
		expect(item?.importPath).toBe('@create-something/canon/icons');
		expect(item?.tags).toContain('icon');
		expect(item?.tags).toContain('accessibility');
		expect(item?.dependencies).toContain('token.canon-core');
		expect(item?.modalities).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
		expect(classification?.registryPolicy).toBe('registry-covered');
		expect(helperClassification?.registryPolicy).toBe('candidate-review');
	});

	it('adds diagram candidates with explicit contracts without stable promotion', () => {
		const diagramCandidates = [
			['component.diagrams-flow-diagram', 'FlowDiagram', 'flow'],
			['component.diagrams-bar-chart', 'BarChart', 'bar'],
			['component.diagrams-line-chart', 'LineChart', 'line'],
			['component.diagrams-pie-chart', 'PieChart', 'pie'],
			['component.diagrams-timeline', 'Timeline', 'timeline'],
			['component.diagrams-matrix', 'Matrix', 'matrix'],
			['component.diagrams-knowledge-graph-canvas', 'KnowledgeGraphCanvas', 'knowledge-graph'],
			['component.diagrams-canvas-diagram', 'CanvasDiagram', 'canvas']
		] as const;

		for (const [id, exportName, tag] of diagramCandidates) {
			const item = getCanonRegistryItem(id);
			const classification = getCanonPublicExportClassification('./diagrams', exportName);

			expect(item?.kind, id).toBe('component');
			expect(item?.maturity, id).toBe('candidate');
			expect(item?.sourcePath, id).toBe(`packages/canon/src/lib/diagrams/${exportName}.svelte`);
			expect(item?.importPath, id).toBe('@create-something/canon/diagrams');
			expect(item?.docsPath, id).toBe('/canon/components/diagrams');
			expect(item?.tags, id).toContain('diagrams');
			expect(item?.tags, id).toContain(tag);
			expect(item?.dependencies, id).toContain('token.canon-core');
			expect(item?.modalities, id).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
			expect(item?.contract.accessibility, id).toBeTruthy();
			expect(item?.contract.evidence, id).toBeTruthy();
			expect(item?.contract.motion, id).toBeTruthy();
			expect(item?.contract.extension, id).toContain('Promote to stable only after');
			expect(classification?.registryPolicy, exportName).toBe('candidate-review');
		}

		expect(searchCanonRegistry('diagram', { maturity: 'candidate' }).map((item) => item.id)).toEqual(
			expect.arrayContaining(diagramCandidates.map(([id]) => id))
		);
	});

	it('adds TypographyHero as a candidate tied to heading and token contracts', () => {
		const item = getCanonRegistryItem('component.typography-typography-hero');
		const classification = getCanonPublicExportClassification('./typography', 'TypographyHero');

		expect(item?.kind).toBe('component');
		expect(item?.maturity).toBe('candidate');
		expect(item?.sourcePath).toBe('packages/canon/src/lib/typography/TypographyHero.svelte');
		expect(item?.importPath).toBe('@create-something/canon/typography');
		expect(item?.docsPath).toBe('/canon/components/typography');
		expect(item?.tags).toContain('typography');
		expect(item?.tags).toContain('hero');
		expect(item?.dependencies).toEqual(['token.canon-core', 'component.heading']);
		expect(item?.modalities).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
		expect(item?.contract.accessibility).toContain('semantic heading structure');
		expect(item?.contract.evidence).toContain('page claim');
		expect(item?.contract.motion).toContain('reduced-motion');
		expect(item?.contract.extension).toContain('Promote to stable only after');
		expect(classification?.registryPolicy).toBe('candidate-review');
	});

	it('adds Atlas renderers as candidates aligned to the headless graph artifact', () => {
		const atlasCandidates = [
			{
				id: 'component.atlas-atlas-flow',
				exportName: 'AtlasFlow',
				tag: 'workflow-map',
				dependency: 'token.canon-core'
			},
			{
				id: 'component.atlas-atlas-story-canvas',
				exportName: 'AtlasStoryCanvas',
				tag: 'story',
				dependency: 'component.atlas-atlas-flow'
			}
		] as const;

		for (const candidate of atlasCandidates) {
			const item = getCanonRegistryItem(candidate.id);
			const classification = getCanonPublicExportClassification('./atlas', candidate.exportName);

			expect(item?.kind, candidate.id).toBe('component');
			expect(item?.maturity, candidate.id).toBe('candidate');
			expect(item?.sourcePath, candidate.id).toBe(
				`packages/canon/src/lib/atlas/${candidate.exportName}.svelte`
			);
			expect(item?.importPath, candidate.id).toBe('@create-something/canon/atlas');
			expect(item?.docsPath, candidate.id).toBe('/canon/components/atlas');
			expect(item?.tags, candidate.id).toContain('atlas');
			expect(item?.tags, candidate.id).toContain('renderer');
			expect(item?.tags, candidate.id).toContain(candidate.tag);
			expect(item?.dependencies, candidate.id).toContain('adapter.atlas-graph-artifact');
			expect(item?.dependencies, candidate.id).toContain(candidate.dependency);
			expect(item?.modalities, candidate.id).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
			expect(item?.contract.accessibility, candidate.id).toBeTruthy();
			expect(item?.contract.evidence, candidate.id).toContain('artifact');
			expect(item?.contract.motion, candidate.id).toBeTruthy();
			expect(item?.contract.extension, candidate.id).toContain('Promote to stable only after');
			expect(classification?.registryPolicy, candidate.exportName).toBe('candidate-review');
		}

		expect(searchCanonRegistry('atlas renderer', { maturity: 'candidate' }).map((item) => item.id)).toEqual(
			expect.arrayContaining(atlasCandidates.map(({ id }) => id))
		);
	});

	it('adds advanced form controls as candidates aligned to foundation form primitives', () => {
		const formCandidates = [
			{
				id: 'component.forms-form-field',
				exportName: 'FormField',
				tag: 'field',
				dependencies: ['component.form-text-field']
			},
			{
				id: 'component.forms-combobox',
				exportName: 'Combobox',
				tag: 'combobox',
				dependencies: ['component.form-text-field', 'component.form-select']
			},
			{
				id: 'component.forms-date-picker',
				exportName: 'DatePicker',
				tag: 'date-picker',
				dependencies: ['component.form-text-field']
			},
			{
				id: 'component.forms-file-upload',
				exportName: 'FileUpload',
				tag: 'file-upload',
				dependencies: ['component.form-text-field']
			},
			{
				id: 'component.forms-otp-input',
				exportName: 'OTPInput',
				tag: 'otp',
				dependencies: ['component.form-text-field']
			}
		] as const;

		for (const candidate of formCandidates) {
			const item = getCanonRegistryItem(candidate.id);
			const classification = getCanonPublicExportClassification('./forms', candidate.exportName);

			expect(item?.kind, candidate.id).toBe('component');
			expect(item?.maturity, candidate.id).toBe('candidate');
			expect(item?.sourcePath, candidate.id).toBe(
				`packages/canon/src/lib/forms/${candidate.exportName}.svelte`
			);
			expect(item?.importPath, candidate.id).toBe('@create-something/canon/forms');
			expect(item?.docsPath, candidate.id).toBe('/canon/components/forms');
			expect(item?.tags, candidate.id).toContain('forms');
			expect(item?.tags, candidate.id).toContain(candidate.tag);
			expect(item?.dependencies, candidate.id).toContain('token.canon-core');
			for (const dependency of candidate.dependencies) {
				expect(item?.dependencies, `${candidate.id} -> ${dependency}`).toContain(dependency);
			}
			expect(item?.modalities, candidate.id).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
			expect(item?.contract.accessibility, candidate.id).toBeTruthy();
			expect(item?.contract.evidence, candidate.id).toBeTruthy();
			expect(item?.contract.motion, candidate.id).toBeTruthy();
			expect(item?.contract.extension, candidate.id).toContain('Promote to stable only after');
			expect(classification?.registryPolicy, candidate.exportName).toBe('candidate-review');
		}

		expect(searchCanonRegistry('form candidate', { maturity: 'candidate' }).map((item) => item.id)).toEqual(
			expect.arrayContaining(formCandidates.map(({ id }) => id))
		);
	});

	it('keeps every public Svelte export registry-covered or explicitly classified', () => {
		const registryIds = new Set(CANON_REGISTRY_MANIFEST.items.map((item) => item.id));
		const publicExports = publicSvelteComponentExports();
		const missingPolicy = publicExports.filter(({ exportPath, exportName }) => {
			const hasRegistryItem = candidateRegistryItemIdsForPublicExport(exportPath, exportName).some(
				(id) => registryIds.has(id)
			);

			return !hasRegistryItem && !getCanonPublicExportClassification(exportPath, exportName);
		});

		expect(publicExports.length).toBeGreaterThan(0);
		expect(missingPolicy).toEqual([]);
	});

	it('keeps public export classification rules non-stale and reviewable', () => {
		const publicExports = publicSvelteComponentExports();
		const publicExportPaths = new Set(publicExports.map(({ exportPath }) => exportPath));
		const publicExportKeys = new Set(
			publicExports.map(({ exportPath, exportName }) => `${exportPath}:${exportName}`)
		);
		const exactRuleKeys = CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.filter(
			(rule) => rule.exportName
		).map((rule) => `${rule.exportPath}:${rule.exportName}`);

		expect(new Set(exactRuleKeys).size).toBe(exactRuleKeys.length);

		for (const rule of CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES) {
			expect(rule.rationale.trim().length, `${rule.exportPath}:${rule.exportName ?? '*'}`).toBeGreaterThan(
				10
			);

			if (rule.exportName) {
				expect(publicExportKeys.has(`${rule.exportPath}:${rule.exportName}`), rule.exportName).toBe(
					true
				);
			} else {
				expect(publicExportPaths.has(rule.exportPath), rule.exportPath).toBe(true);
			}
		}
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
