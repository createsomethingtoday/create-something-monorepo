import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

import { CANON_REGISTRY_MANIFEST } from '../registry/index.js';
import type { CanonRegistryItem } from '../registry/schema.js';

export type CanonStableComponentDepthDimension =
	| 'docs'
	| 'examples'
	| 'prop-contract'
	| 'accessibility-evidence'
	| 'visual-regression'
	| 'modality-behavior'
	| 'property-usage';

export type CanonStableComponentDepthStatus = 'ready' | 'needs-evidence';
export type CanonStableComponentDepthDimensionStatus = 'covered' | 'gap';

export type CanonStableComponentDepthEvidence = {
	kind:
		| 'registry'
		| 'docs'
		| 'source'
		| 'test'
		| 'property-source'
		| 'component-readme'
		| 'heuristic';
	path?: string;
	detail: string;
};

export type CanonStableComponentDepthDimensionEntry = {
	dimension: CanonStableComponentDepthDimension;
	status: CanonStableComponentDepthDimensionStatus;
	evidence: CanonStableComponentDepthEvidence[];
	requiredEvidence: string;
};

export type CanonStableComponentDepthComponentEntry = {
	id: string;
	name: string;
	sourcePath: string;
	importPath?: string;
	docsPath?: string;
	modalities: CanonRegistryItem['modalities'];
	dimensions: Record<
		CanonStableComponentDepthDimension,
		CanonStableComponentDepthDimensionEntry
	>;
	gapCount: number;
};

export type CanonStableComponentDepthGap = {
	componentId: string;
	componentName: string;
	dimension: CanonStableComponentDepthDimension;
	message: string;
	requiredEvidence: string;
};

export type CanonStableComponentDepthReport = {
	schemaVersion: 1;
	id: 'canon-stable-component-depth-report';
	sourceOfTruth: '@create-something/canon/stable-component-depth';
	rootDir: string;
	status: CanonStableComponentDepthStatus;
	description: string;
	dimensions: Array<{
		dimension: CanonStableComponentDepthDimension;
		covered: number;
		gaps: number;
	}>;
	summary: {
		stableComponents: number;
		componentsReady: number;
		componentsNeedingEvidence: number;
		totalDimensionChecks: number;
		coveredDimensionChecks: number;
		gaps: number;
	};
	components: CanonStableComponentDepthComponentEntry[];
	gaps: CanonStableComponentDepthGap[];
	agentContract: {
		purpose: 'canon-stable-component-depth';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export type CanonStableComponentDepthReportOptions = {
	registryItems?: CanonRegistryItem[];
	propertyRoots?: string[];
	searchRoots?: string[];
};

const DIMENSIONS: CanonStableComponentDepthDimension[] = [
	'docs',
	'examples',
	'prop-contract',
	'accessibility-evidence',
	'visual-regression',
	'modality-behavior',
	'property-usage'
];

const REQUIRED_EVIDENCE: Record<CanonStableComponentDepthDimension, string> = {
	docs: 'A registry docsPath backed by a Canon docs content page.',
	examples: 'A docs, README, source, or test example that shows component usage.',
	'prop-contract': 'A source-level props contract such as Props, $props(), or exported props.',
	'accessibility-evidence':
		'Registry or source evidence naming accessibility requirements, ARIA, keyboard behavior, or semantic structure.',
	'visual-regression':
		'A named visual scenario plus screenshot, Playwright, story, or component test evidence for the component.',
	'modality-behavior':
		'Registry and contract/docs evidence explaining modality behavior for web, chat, app, voice, or glasses.',
	'property-usage':
		'At least one CREATE SOMETHING property source file using or importing the component.'
};

const DEFAULT_PROPERTY_ROOTS = [
	'packages/agency',
	'packages/io',
	'packages/space',
	'packages/ltd',
	'packages/lms',
	'packages/learn'
];

const DEFAULT_SEARCH_ROOTS = ['apps', 'packages'];
const SEARCH_EXTENSIONS = new Set(['.svelte', '.ts', '.tsx', '.md', '.mjs', '.js']);
const SKIP_DIRS = new Set([
	'.cache',
	'.git',
	'.svelte-kit',
	'.vite',
	'.wrangler',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'output',
	'playwright-report',
	'test-results'
]);

type SearchFile = {
	path: string;
	text: string;
};

type DepthContext = {
	rootDir: string;
	propertyFiles: SearchFile[];
	testFiles: SearchFile[];
};

export function buildCanonStableComponentDepthReport(
	rootDir: string,
	options: CanonStableComponentDepthReportOptions = {}
): CanonStableComponentDepthReport {
	const root = resolve(rootDir);
	const registryItems = options.registryItems ?? CANON_REGISTRY_MANIFEST.items;
	const stableComponents = registryItems
		.filter((item) => item.kind === 'component' && item.maturity === 'stable')
		.sort((left, right) => left.id.localeCompare(right.id));
	const context: DepthContext = {
		rootDir: root,
		propertyFiles: readSearchFiles(root, options.propertyRoots ?? DEFAULT_PROPERTY_ROOTS),
		testFiles: readSearchFiles(root, options.searchRoots ?? DEFAULT_SEARCH_ROOTS).filter(
			(file) => isTestOrVisualEvidencePath(file.path)
		)
	};
	const components = stableComponents.map((component) => buildComponentEntry(component, context));
	const gaps = components.flatMap((component) =>
		DIMENSIONS.flatMap((dimension) => {
			const entry = component.dimensions[dimension];
			if (entry.status === 'covered') return [];

			return [
				{
					componentId: component.id,
					componentName: component.name,
					dimension,
					message: `${component.id} needs ${dimension} evidence.`,
					requiredEvidence: entry.requiredEvidence
				}
			];
		})
	);
	const dimensions = DIMENSIONS.map((dimension) => ({
		dimension,
		covered: components.filter((component) => component.dimensions[dimension].status === 'covered')
			.length,
		gaps: components.filter((component) => component.dimensions[dimension].status === 'gap').length
	}));

	return {
		schemaVersion: 1,
		id: 'canon-stable-component-depth-report',
		sourceOfTruth: '@create-something/canon/stable-component-depth',
		rootDir: root,
		status: gaps.length === 0 ? 'ready' : 'needs-evidence',
		description:
			'Agent-readable Canon stable component depth report covering docs, examples, prop contracts, accessibility evidence, visual regression coverage, modality behavior, and property usage.',
		dimensions,
		summary: {
			stableComponents: stableComponents.length,
			componentsReady: components.filter((component) => component.gapCount === 0).length,
			componentsNeedingEvidence: components.filter((component) => component.gapCount > 0).length,
			totalDimensionChecks: stableComponents.length * DIMENSIONS.length,
			coveredDimensionChecks: dimensions.reduce((total, entry) => total + entry.covered, 0),
			gaps: gaps.length
		},
		components,
		gaps,
		agentContract: {
			purpose: 'canon-stable-component-depth',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'auditing whether every stable Canon component has equal implementation depth',
				'turning broad stable-component claims into per-component evidence requirements',
				'prioritizing docs, examples, prop contracts, accessibility, visual regression, modality, and property-usage gaps',
				'feeding depth evidence into Linear, PRs, MCP resources, and Canon docs'
			],
			stopBefore: [
				'claiming every stable component is comprehensive when any dimension is missing evidence',
				'treating registry maturity as a substitute for examples, prop contracts, tests, or usage proof',
				'promoting advisory depth inventory to a hard health blocker without first burning down the reported gaps',
				'adding Node-backed depth scanning to the root browser-facing Canon barrel'
			]
		}
	};
}

export function assertCanonStableComponentDepthReport(
	report: CanonStableComponentDepthReport
) {
	if (report.gaps.length === 0) return;

	throw new Error(
		[
			'Canon stable component depth failed: stable components need equal-depth evidence.',
			...report.gaps
				.slice(0, 40)
				.map((gap) => `- ${gap.componentId} ${gap.dimension}: ${gap.requiredEvidence}`),
			report.gaps.length > 40 ? `... ${report.gaps.length - 40} more gaps` : ''
		]
			.filter(Boolean)
			.join('\n')
	);
}

export function renderCanonStableComponentDepthReport(
	report: CanonStableComponentDepthReport,
	options: { verbose?: boolean; gapLimit?: number } = {}
) {
	const gapLimit = options.gapLimit ?? (options.verbose ? report.gaps.length : 24);
	const lines = [
		'# Canon Stable Component Depth',
		'',
		report.description,
		'',
		`Root: ${report.rootDir}`,
		`Status: ${report.status}`,
		'',
		'## Summary',
		'',
		`- Stable components: ${report.summary.stableComponents}`,
		`- Components ready: ${report.summary.componentsReady}`,
		`- Components needing evidence: ${report.summary.componentsNeedingEvidence}`,
		`- Covered dimension checks: ${report.summary.coveredDimensionChecks}/${report.summary.totalDimensionChecks}`,
		`- Gaps: ${report.summary.gaps}`,
		'',
		'## Dimensions',
		''
	];

	for (const dimension of report.dimensions) {
		lines.push(`- ${dimension.dimension}: ${dimension.covered} covered, ${dimension.gaps} gaps`);
	}

	if (report.gaps.length) {
		lines.push('', '## Priority Gaps', '');
		for (const gap of report.gaps.slice(0, gapLimit)) {
			lines.push(`- ${gap.componentId} ${gap.dimension}: ${gap.requiredEvidence}`);
		}
		if (report.gaps.length > gapLimit) {
			lines.push(`- ... ${report.gaps.length - gapLimit} more gaps`);
		}
	}

	if (options.verbose) {
		lines.push('', '## Components', '');
		for (const component of report.components) {
			lines.push(`### ${component.id}`);
			lines.push('');
			lines.push(`- Source: ${component.sourcePath}`);
			lines.push(`- Docs: ${component.docsPath ?? 'none'}`);
			lines.push(`- Modalities: ${component.modalities.join(', ') || 'none'}`);
			lines.push(`- Gaps: ${component.gapCount}`);
			for (const dimension of DIMENSIONS) {
				const entry = component.dimensions[dimension];
				const evidence = entry.evidence
					.slice(0, 3)
					.map((item) => item.path ?? item.detail)
					.join('; ');
				lines.push(`- ${dimension}: ${entry.status}${evidence ? ` (${evidence})` : ''}`);
			}
			lines.push('');
		}
	}

	lines.push('', '## Next Actions', '');
	if (report.gaps.length === 0) {
		lines.push('- Keep stable component promotion tied to this depth report.');
	} else {
		lines.push('- Fill the highest-gap dimensions before turning this report into a health blocker.');
		lines.push('- Add explicit evidence rather than relying on registry maturity alone.');
		lines.push('- Use `--fail-on-gaps` only after the inventory has been burned down.');
	}

	return lines.join('\n').trimEnd();
}

function buildComponentEntry(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthComponentEntry {
	const dimensions = {
		docs: evaluateDocs(component, context),
		examples: evaluateExamples(component, context),
		'prop-contract': evaluatePropContract(component, context),
		'accessibility-evidence': evaluateAccessibilityEvidence(component, context),
		'visual-regression': evaluateVisualRegression(component, context),
		'modality-behavior': evaluateModalityBehavior(component, context),
		'property-usage': evaluatePropertyUsage(component, context)
	} satisfies Record<CanonStableComponentDepthDimension, CanonStableComponentDepthDimensionEntry>;
	const gapCount = DIMENSIONS.filter((dimension) => dimensions[dimension].status === 'gap').length;

	return {
		id: component.id,
		name: component.name,
		sourcePath: component.sourcePath,
		importPath: component.importPath,
		docsPath: component.docsPath,
		modalities: component.modalities,
		dimensions,
		gapCount
	};
}

function evaluateDocs(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const evidence = component.docsPath
		? canonDocsContentPathCandidates(context.rootDir, component.docsPath)
				.filter((path) => existsSync(path))
				.map((path) => ({
					kind: 'docs' as const,
					path: normalizeRelativePath(context.rootDir, path),
					detail: `Docs path ${component.docsPath} is backed by Canon content.`
				}))
		: [];

	return dimensionEntry('docs', evidence);
}

function evaluateExamples(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const files = [
		...componentEvidenceFiles(component, context.rootDir),
		...docsFilesForComponent(component, context.rootDir)
	];
	const evidence = files.flatMap((file) => {
		if (!existsSync(file)) return [];
		const text = readFileSync(file, 'utf-8');
		if (!containsExampleEvidence(text, component.name)) return [];

		return [
			{
				kind: isReadmePath(file) ? 'component-readme' : 'docs',
				path: normalizeRelativePath(context.rootDir, file),
				detail: `Contains usage/example evidence for ${component.name}.`
			} satisfies CanonStableComponentDepthEvidence
		];
	});

	return dimensionEntry('examples', uniqueEvidence(evidence));
}

function evaluatePropContract(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const sourcePath = resolve(context.rootDir, component.sourcePath);
	const evidence: CanonStableComponentDepthEvidence[] = [];

	if (existsSync(sourcePath)) {
		const source = readFileSync(sourcePath, 'utf-8');
		if (/\b(interface|type)\s+Props\b/.test(source) || /\$props\s*\(/.test(source)) {
			evidence.push({
				kind: 'source',
				path: component.sourcePath,
				detail: 'Source declares a Props contract or destructures $props().'
			});
		} else if (/\bexport\s+let\s+\w+/.test(source)) {
			evidence.push({
				kind: 'source',
				path: component.sourcePath,
				detail: 'Source declares exported Svelte props.'
			});
		}
	}

	return dimensionEntry('prop-contract', evidence);
}

function evaluateAccessibilityEvidence(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const evidence: CanonStableComponentDepthEvidence[] = [];
	const sourcePath = resolve(context.rootDir, component.sourcePath);

	if (component.contract.accessibility) {
		evidence.push({
			kind: 'registry',
			detail: component.contract.accessibility
		});
	}

	if (existsSync(sourcePath)) {
		const source = readFileSync(sourcePath, 'utf-8');
		if (/\b(aria-|role=|tabindex|on:keydown|onkeydown|focus|keyboard|screen reader|a11y)\b/i.test(source)) {
			evidence.push({
				kind: 'source',
				path: component.sourcePath,
				detail: 'Source contains accessibility, ARIA, focus, or keyboard behavior evidence.'
			});
		}
	}

	return dimensionEntry('accessibility-evidence', uniqueEvidence(evidence));
}

function evaluateVisualRegression(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const namePattern = componentEvidenceNamePattern(component.name);
	const evidence = context.testFiles
		.filter((file) => namePattern.test(file.path) || namePattern.test(file.text))
		.slice(0, 8)
		.map((file) => ({
			kind: 'test' as const,
			path: file.path,
			detail: `Test or visual evidence references ${component.name}.`
		}));

	return dimensionEntry('visual-regression', evidence);
}

function evaluateModalityBehavior(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const evidence: CanonStableComponentDepthEvidence[] = [];
	const contractText = Object.values(component.contract).filter(Boolean).join(' ');
	const docsText = docsFilesForComponent(component, context.rootDir)
		.filter((path) => existsSync(path))
		.map((path) => readFileSync(path, 'utf-8'))
		.join('\n');

	if (component.modalities.length > 0) {
		evidence.push({
			kind: 'registry',
			detail: `Registry lists modalities: ${component.modalities.join(', ')}.`
		});
	}

	if (mentionsAnyModality(contractText) || mentionsAnyModality(docsText)) {
		const docsEvidencePath = docsFilesForComponent(component, context.rootDir).find((path) =>
			existsSync(path)
		);
		evidence.push({
			kind: mentionsAnyModality(contractText) ? 'registry' : 'docs',
			path:
				mentionsAnyModality(docsText) && docsEvidencePath
					? normalizeRelativePath(context.rootDir, docsEvidencePath)
					: undefined,
			detail: 'Contract or docs mention modality-specific behavior.'
		});
	}

	return dimensionEntry('modality-behavior', uniqueEvidence(evidence));
}

function evaluatePropertyUsage(
	component: CanonRegistryItem,
	context: DepthContext
): CanonStableComponentDepthDimensionEntry {
	const namePattern = componentEvidenceNamePattern(component.name);
	const evidence = context.propertyFiles
		.filter((file) => namePattern.test(file.text))
		.slice(0, 10)
		.map((file) => ({
			kind: 'property-source' as const,
			path: file.path,
			detail: `Property source references ${componentEvidenceNames(component.name).join(' or ')}.`
		}));

	return dimensionEntry('property-usage', evidence);
}

function dimensionEntry(
	dimension: CanonStableComponentDepthDimension,
	evidence: CanonStableComponentDepthEvidence[]
): CanonStableComponentDepthDimensionEntry {
	return {
		dimension,
		status: evidence.length > 0 ? 'covered' : 'gap',
		evidence,
		requiredEvidence: REQUIRED_EVIDENCE[dimension]
	};
}

function docsFilesForComponent(component: CanonRegistryItem, rootDir: string) {
	if (!component.docsPath) return [];
	return canonDocsContentPathCandidates(rootDir, component.docsPath);
}

function canonDocsContentPathCandidates(rootDir: string, docsPath: string) {
	if (!docsPath.startsWith('/canon/')) return [];

	const contentPath = docsPath.replace(/^\/canon\//, '');

	return [
		resolve(rootDir, 'packages/ltd/src/lib/content/canon', `${contentPath}.md`),
		resolve(rootDir, 'packages/ltd/src/lib/content/canon', contentPath, 'index.md')
	];
}

function componentEvidenceFiles(component: CanonRegistryItem, rootDir: string) {
	const sourcePath = resolve(rootDir, component.sourcePath);
	const sourceDir = dirname(sourcePath);

	return [
		sourcePath,
		join(sourceDir, 'README.md'),
		join(sourceDir, `${component.name}.test.ts`),
		join(sourceDir, `${component.name}.spec.ts`)
	];
}

function containsExampleEvidence(text: string, componentName: string) {
	return (
		new RegExp(`<${escapeRegExp(componentName)}\\b`).test(text) ||
		/\b(examples?|usage|sample|demo)\b/i.test(text) ||
		/```(svelte|ts|tsx|html)/i.test(text)
	);
}

function readSearchFiles(rootDir: string, roots: string[]) {
	const files: SearchFile[] = [];

	for (const searchRoot of roots) {
		const absolute = resolve(rootDir, searchRoot);
		if (existsSync(absolute)) walkSearchFiles(rootDir, absolute, files);
	}

	return files.sort((left, right) => left.path.localeCompare(right.path));
}

function walkSearchFiles(rootDir: string, dir: string, files: SearchFile[]) {
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const absolute = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walkSearchFiles(rootDir, absolute, files);
			continue;
		}

		if (!SEARCH_EXTENSIONS.has(extname(entry.name))) continue;
		files.push({
			path: normalizeRelativePath(rootDir, absolute),
			text: readFileSync(absolute, 'utf-8')
		});
	}
}

function isTestOrVisualEvidencePath(path: string) {
	return (
		/\.(test|spec|stories)\.(ts|tsx|svelte|js|mjs)$/.test(path) ||
		/\b(playwright|visual|screenshot|snapshot|storybook|chromatic)\b/i.test(path)
	);
}

function mentionsAnyModality(text: string) {
	return /\b(web|chat|app|voice|glasses|modality|modalities)\b/i.test(text);
}

function componentEvidenceNames(componentName: string) {
	return componentName.startsWith('Clear')
		? [componentName, `Performance${componentName.slice('Clear'.length)}`]
		: [componentName];
}

function componentEvidenceNamePattern(componentName: string) {
	const names = componentEvidenceNames(componentName).map(escapeRegExp).join('|');
	return new RegExp(`\\b(?:${names})\\b`);
}

function isReadmePath(path: string) {
	return path.endsWith('/README.md');
}

function uniqueEvidence(evidence: CanonStableComponentDepthEvidence[]) {
	const seen = new Set<string>();
	const unique: CanonStableComponentDepthEvidence[] = [];

	for (const item of evidence) {
		const key = `${item.kind}:${item.path ?? ''}:${item.detail}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(item);
	}

	return unique;
}

function normalizeRelativePath(rootDir: string, path: string) {
	return relative(rootDir, path).split(sep).join('/');
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
