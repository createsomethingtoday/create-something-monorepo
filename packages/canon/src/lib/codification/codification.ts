import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export type CanonCodificationClassification =
	| 'canon-owned'
	| 'canon-importing'
	| 'overlay-governed'
	| 'product-local-exempt'
	| 'needs-canon-decision';

export type CanonCodificationExemptionReason =
	| 'canon-support-library'
	| 'webflow-code-component-library'
	| 'render-tooling-surface'
	| 'operator-tooling'
	| 'webflow-review-tooling'
	| 'admin-shell-tooling'
	| 'mcp-tooling-demo'
	| 'research-prototype';

export type CanonCodificationExemption = {
	path: string;
	reason: CanonCodificationExemptionReason;
	justification: string;
};

export type CanonCodificationAuditEntry = {
	path: string;
	packageName?: string;
	packageDir?: string;
	classification: CanonCodificationClassification;
	reason: string;
	exemption?: CanonCodificationExemption;
};

export type CanonCodificationAuditReport = {
	id: 'canon-codification-audit';
	rootDir: string;
	entries: CanonCodificationAuditEntry[];
	exemptions: CanonCodificationExemption[];
	summary: {
		totalUiFiles: number;
		canonOwned: number;
		canonImporting: number;
		overlayGoverned: number;
		productLocalExempt: number;
		needsCanonDecision: number;
	};
};

export type CanonCodificationAuditOptions = {
	exemptions?: CanonCodificationExemption[];
	searchRoots?: string[];
};

type PackageInfo = {
	name?: string;
	dir: string;
	relativeDir: string;
	hasOverlay: boolean;
};

const DEFAULT_SEARCH_ROOTS = ['apps', 'packages'];
const UI_SOURCE_EXTENSIONS = new Set(['.svelte', '.tsx', '.jsx']);
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

export const CANON_CODIFICATION_EXEMPTIONS: CanonCodificationExemption[] = [
	{
		path: 'packages/webflow-components',
		reason: 'webflow-code-component-library',
		justification:
			'Webflow code components are packaged through Webflow library manifests and declareComponent registrations; Canon governs them through future candidate review, not direct Svelte package migration.'
	},
	{
		path: 'packages/halfdozen-landing',
		reason: 'webflow-code-component-library',
		justification:
			'Half Dozen landing sections are React/Webflow code components for a client-owned brand surface; Canon governs them through candidate review rather than direct Svelte package migration.'
	},
	{
		path: 'packages/motion-studio',
		reason: 'render-tooling-surface',
		justification:
			'Motion Studio is non-rendered Canon-adjacent render tooling in the overlay coverage model; it should remain product-local until promoted into a rendered property surface.'
	},
	{
		path: 'packages/tufte',
		reason: 'canon-support-library',
		justification:
			'Tufte is an upstream Canon support library excluded from property overlay coverage; its local UI files are intentionally not Canon overlays.'
	},
	{
		path: 'packages/bundle-scanner',
		reason: 'operator-tooling',
		justification:
			'Bundle scanner UI is operator tooling, not a rendered Canon-consuming product surface.'
	},
	{
		path: 'packages/webflow-review',
		reason: 'webflow-review-tooling',
		justification:
			'Webflow review UI is tooling for review workflows and browser extension surfaces, not a Canon-consuming property shell.'
	},
	{
		path: 'packages/webflow-app-review-preflight/extension',
		reason: 'webflow-review-tooling',
		justification:
			'App Review Preflight is a Webflow Designer review tool with Webflow-native UI constraints, not a rendered Canon-consuming property shell.'
	},
	{
		path: 'packages/webflow-apps-admin',
		reason: 'admin-shell-tooling',
		justification:
			'The parent Webflow apps admin shell is local admin tooling; its dashboard subpackage carries its own Canon overlay when it is a rendered property surface.'
	},
	{
		path: 'packages/interaction-atlas-mcp',
		reason: 'mcp-tooling-demo',
		justification:
			'Interaction Atlas MCP UI is a tooling demo attached to MCP package behavior, not a rendered Canon-consuming property surface.'
	},
	{
		path: 'packages/canvas-kernel',
		reason: 'render-tooling-surface',
		justification:
			'Canvas Kernel is shared render infrastructure for Atlas, Substrate, and topology surfaces; Canon governs rendered product shells while this package remains a product-local compute surface.'
	},
	{
		path: 'packages/agent-sdk/experiments',
		reason: 'research-prototype',
		justification:
			'Agent SDK experiment UI artifacts are research outputs attached to model/pipeline experiments, not reusable product components or rendered Canon-consuming property surfaces.'
	},
	{
		path: 'packages/sieve',
		reason: 'research-prototype',
		justification:
			'Sieve is a prototype UI surface without package ownership metadata; it needs promotion into a package and overlay before Canon treats it as a rendered property.'
	}
];

export async function buildCanonCodificationAuditReport(
	rootDir: string,
	options: CanonCodificationAuditOptions = {}
): Promise<CanonCodificationAuditReport> {
	const root = resolve(rootDir);
	const exemptions = options.exemptions ?? CANON_CODIFICATION_EXEMPTIONS;
	const packageInfos = findPackageInfos(root, options.searchRoots ?? DEFAULT_SEARCH_ROOTS);
	const uiFiles = findUiSourceFiles(root, options.searchRoots ?? DEFAULT_SEARCH_ROOTS);
	const entries = uiFiles.map((file) => classifyUiFile(root, file, packageInfos, exemptions));

	return {
		id: 'canon-codification-audit',
		rootDir: root,
		entries,
		exemptions,
		summary: summarize(entries)
	};
}

export function assertCanonCodificationAudit(report: CanonCodificationAuditReport) {
	const undecided = report.entries.filter(
		(entry) => entry.classification === 'needs-canon-decision'
	);
	if (undecided.length === 0) return;

	throw new Error(
		[
			'Canon codification audit failed: UI files need an explicit Canon decision.',
			...undecided.map(
				(entry) =>
					`- ${entry.path}${entry.packageName ? ` (${entry.packageName})` : ''}: ${entry.reason}`
			)
		].join('\n')
	);
}

export function renderCanonCodificationAuditReport(
	report: CanonCodificationAuditReport,
	options: { verbose?: boolean } = {}
) {
	const lines = [
		'# Canon Codification Audit',
		'',
		`Root: ${report.rootDir}`,
		`UI source files: ${report.summary.totalUiFiles}`,
		`Canon-owned: ${report.summary.canonOwned}`,
		`Canon-importing: ${report.summary.canonImporting}`,
		`Overlay-governed: ${report.summary.overlayGoverned}`,
		`Product-local exempt: ${report.summary.productLocalExempt}`,
		`Needs Canon decision: ${report.summary.needsCanonDecision}`
	];

	if (!options.verbose) return lines.join('\n');

	const byClassification = groupByClassification(report.entries);
	for (const classification of [
		'canon-owned',
		'canon-importing',
		'overlay-governed',
		'product-local-exempt',
		'needs-canon-decision'
	] as CanonCodificationClassification[]) {
		const entries = byClassification.get(classification) ?? [];
		lines.push('', `## ${classification}`, '');
		for (const entry of entries) {
			lines.push(
				`- ${entry.path}${entry.packageName ? ` (${entry.packageName})` : ''}: ${entry.reason}`
			);
		}
	}

	return lines.join('\n');
}

function classifyUiFile(
	rootDir: string,
	absoluteFile: string,
	packages: PackageInfo[],
	exemptions: CanonCodificationExemption[]
): CanonCodificationAuditEntry {
	const path = normalizeRelativePath(rootDir, absoluteFile);
	const packageInfo = findOwningPackage(absoluteFile, packages);
	const base = {
		path,
		packageName: packageInfo?.name,
		packageDir: packageInfo?.relativeDir
	};

	if (path === 'packages/canon' || path.startsWith('packages/canon/')) {
		return {
			...base,
			classification: 'canon-owned',
			reason: 'UI source lives inside the Canon package boundary.'
		};
	}

	const source = readFileSync(absoluteFile, 'utf-8');
	if (source.includes('@create-something/canon')) {
		return {
			...base,
			classification: 'canon-importing',
			reason: 'UI source directly imports the public Canon package.'
		};
	}

	if (packageInfo?.hasOverlay) {
		return {
			...base,
			classification: 'overlay-governed',
			reason: 'Owning package has a checked-in canon-overlay/manifest.ts.'
		};
	}

	const exemption = findMatchingExemption(path, exemptions);
	if (exemption) {
		return {
			...base,
			classification: 'product-local-exempt',
			reason: exemption.justification,
			exemption
		};
	}

	return {
		...base,
		classification: 'needs-canon-decision',
		reason:
			'UI source is outside Canon, does not import Canon, has no owning overlay, and is not covered by an explicit exemption.'
	};
}

function findPackageInfos(rootDir: string, searchRoots: string[]): PackageInfo[] {
	const packages: PackageInfo[] = [];

	for (const searchRoot of searchRoots) {
		const absolute = resolve(rootDir, searchRoot);
		if (existsSync(absolute)) walkPackageInfos(rootDir, absolute, packages);
	}

	return packages.sort((a, b) => b.dir.length - a.dir.length);
}

function walkPackageInfos(rootDir: string, dir: string, packages: PackageInfo[]) {
	const entries = readdirSync(dir, { withFileTypes: true });
	const packageJson = entries.find((entry) => entry.isFile() && entry.name === 'package.json');

	if (packageJson) {
		const packagePath = join(dir, 'package.json');
		const json = JSON.parse(readFileSync(packagePath, 'utf-8')) as { name?: string };
		packages.push({
			name: json.name,
			dir,
			relativeDir: normalizeRelativePath(rootDir, dir),
			hasOverlay: existsSync(join(dir, 'canon-overlay/manifest.ts'))
		});
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
		walkPackageInfos(rootDir, join(dir, entry.name), packages);
	}
}

function findUiSourceFiles(rootDir: string, searchRoots: string[]) {
	const files: string[] = [];

	for (const searchRoot of searchRoots) {
		const absolute = resolve(rootDir, searchRoot);
		if (existsSync(absolute)) walkUiSourceFiles(absolute, files);
	}

	return files.sort((a, b) => normalizeRelativePath(rootDir, a).localeCompare(normalizeRelativePath(rootDir, b)));
}

function walkUiSourceFiles(dir: string, files: string[]) {
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walkUiSourceFiles(join(dir, entry.name), files);
			continue;
		}

		if (!isUiSourceFile(entry.name) || isTestOrStoryFile(entry.name)) continue;
		files.push(join(dir, entry.name));
	}
}

function isUiSourceFile(fileName: string) {
	return Array.from(UI_SOURCE_EXTENSIONS).some((extension) => fileName.endsWith(extension));
}

function isTestOrStoryFile(fileName: string) {
	return /\.(test|spec|stories)\.(svelte|tsx|jsx)$/.test(fileName);
}

function findOwningPackage(filePath: string, packages: PackageInfo[]) {
	return packages.find((pkg) => isPathWithin(filePath, pkg.dir));
}

function findMatchingExemption(path: string, exemptions: CanonCodificationExemption[]) {
	return [...exemptions]
		.sort((a, b) => b.path.length - a.path.length)
		.find((exemption) => path === exemption.path || path.startsWith(`${exemption.path}/`));
}

function isPathWithin(path: string, parent: string) {
	return path === parent || path.startsWith(`${parent}${sep}`);
}

function normalizeRelativePath(rootDir: string, path: string) {
	return relative(rootDir, path).split(sep).join('/');
}

function summarize(entries: CanonCodificationAuditEntry[]): CanonCodificationAuditReport['summary'] {
	return {
		totalUiFiles: entries.length,
		canonOwned: count(entries, 'canon-owned'),
		canonImporting: count(entries, 'canon-importing'),
		overlayGoverned: count(entries, 'overlay-governed'),
		productLocalExempt: count(entries, 'product-local-exempt'),
		needsCanonDecision: count(entries, 'needs-canon-decision')
	};
}

function count(entries: CanonCodificationAuditEntry[], classification: CanonCodificationClassification) {
	return entries.filter((entry) => entry.classification === classification).length;
}

function groupByClassification(entries: CanonCodificationAuditEntry[]) {
	const groups = new Map<CanonCodificationClassification, CanonCodificationAuditEntry[]>();
	for (const entry of entries) {
		const current = groups.get(entry.classification) ?? [];
		current.push(entry);
		groups.set(entry.classification, current);
	}
	return groups;
}
