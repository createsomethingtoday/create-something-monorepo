import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const papersRouteDir = path.join(packageRoot, 'src/routes/papers');
const experimentsRouteDir = path.join(packageRoot, 'src/routes/experiments');
const contentPapersDir = path.join(packageRoot, 'content/papers');

const legacyStaticPaperRoutes = new Set([
	'agent-sdk-gemini-tools-integration',
	'agent-sdk-model-routing-optimization',
	'analyzer-mcp-review-architecture',
	'animation-spec-architecture',
	'autonomous-harness-architecture',
	'beads-cross-session-memory',
	'beads-integration-patterns',
	'code-mode-hermeneutic-analysis',
	'codex-orchestration',
	'cumulative-state-antipattern',
	'dual-agent-routing-experiment',
	'ethos-transfer-agentic-engineering',
	'ground-case-study',
	'ground-evidence-based-claims',
	'haiku-optimization',
	'haiku-ultrathink-validation',
	'harness-agent-sdk-migration',
	'hermeneutic-debugging',
	'hermeneutic-spiral-ux',
	'hermeneutic-triad-review',
	'intellectual-genealogy',
	'kickstand-triad-audit',
	'norvig-partnership',
	'observability-infrastructure',
	'open-weight-models-mcp-guidance',
	'policy-os-development-infrastructure',
	'ralph-implementation',
	'ralph-vs-gastown',
	'recursive-language-models',
	'spec-driven-development',
	'subtractive-form-design',
	'subtractive-studio',
	'teaching-modalities-experiment',
	'three-tier-framework',
	'threshold-dwelling',
	'tufte-mobile-optimization',
	'understanding-graphs',
	'webflow-dashboard-refactor',
	'webflow-template-review-webmcp',
	'workers-vs-python-sdk-plagiarism-detection',
	'wrap-pattern'
]);

const legacyStaticExperimentRoutes = new Set([
	'agent-operations',
	'agentic-visualization',
	'ai-native-filtering',
	'ascii-renderer',
	'awwwards-patterns',
	'canvas-interactivity',
	'data-patterns',
	'diagrams',
	'hybrid-scheduling',
	'ic-mvp-pipeline',
	'kickstand-triad-audit',
	'kinetic-typography',
	'living-arena',
	'living-arena-gpu',
	'render-preview',
	'render-studio',
	'spritz',
	'text-revelation',
	'understanding-graphs'
]);

const requiredPaperFrontmatter = [
	'title',
	'subtitle',
	'authors',
	'category',
	'abstract',
	'keywords',
	'publishedAt',
	'readingTime',
	'difficulty',
	'published'
];

function readText(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function routeSlugs(routeDir) {
	return fs
		.readdirSync(routeDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== '[slug]')
		.map((entry) => entry.name)
		.sort();
}

function frontmatterKeys(markdown) {
	const trimmed = markdown.trimStart();
	if (!trimmed.startsWith('---')) return [];
	const endIndex = trimmed.indexOf('---', 3);
	if (endIndex === -1) return [];
	return trimmed
		.slice(3, endIndex)
		.split(/\r?\n/u)
		.map((line) => line.match(/^([A-Za-z0-9_-]+):/u)?.[1])
		.filter(Boolean);
}

function unknownStaticRoutes(slugs, legacySet) {
	return slugs.filter((slug) => !legacySet.has(slug));
}

const failures = [];

const paperStaticSlugs = routeSlugs(papersRouteDir);
const experimentStaticSlugs = routeSlugs(experimentsRouteDir);
const newStaticPaperRoutes = unknownStaticRoutes(paperStaticSlugs, legacyStaticPaperRoutes);
const newStaticExperimentRoutes = unknownStaticRoutes(
	experimentStaticSlugs,
	legacyStaticExperimentRoutes
);

if (newStaticPaperRoutes.length > 0) {
	failures.push(
		[
			'New static paper routes must use the markdown-backed research artifact route instead:',
			...newStaticPaperRoutes.map((slug) => `  - ${slug}`),
			'Add metadata to src/lib/config/fileBasedPapers.ts and content to content/papers/{slug}.md.'
		].join('\n')
	);
}

if (newStaticExperimentRoutes.length > 0) {
	failures.push(
		[
			'New static experiment routes must be explicitly reviewed before bypassing the shared artifact template:',
			...newStaticExperimentRoutes.map((slug) => `  - ${slug}`),
			'Prefer src/lib/config/fileBasedExperiments.ts plus content/experiments/{slug}.md.'
		].join('\n')
	);
}

const paperDynamicRoute = readText(path.join(papersRouteDir, '[slug]/+page.svelte'));
if (!paperDynamicRoute.includes('ResearchArtifactPage')) {
	failures.push('papers/[slug]/+page.svelte must render through ResearchArtifactPage.');
}

const experimentDynamicRoute = readText(path.join(experimentsRouteDir, '[slug]/+page.svelte'));
if (!experimentDynamicRoute.includes('ResearchArtifactPage')) {
	failures.push('experiments/[slug]/+page.svelte must render through ResearchArtifactPage.');
}

for (const fileName of fs.readdirSync(contentPapersDir).filter((file) => file.endsWith('.md')).sort()) {
	if (fileName === 'test-markdown-paper.md') continue;
	const keys = new Set(frontmatterKeys(readText(path.join(contentPapersDir, fileName))));
	const missing = requiredPaperFrontmatter.filter((key) => !keys.has(key));
	if (missing.length > 0) {
		failures.push(`content/papers/${fileName} is missing frontmatter: ${missing.join(', ')}`);
	}
}

if (failures.length > 0) {
	console.error(failures.join('\n\n'));
	process.exit(1);
}

console.log(
	`Research artifact templates OK: shared dynamic routes active, ${paperStaticSlugs.length} legacy paper route exceptions, ${experimentStaticSlugs.length} legacy experiment route exceptions.`
);
