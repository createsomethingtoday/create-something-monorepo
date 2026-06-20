import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const experimentsRouteDir = path.join(packageRoot, 'src/routes/experiments');
const papersRouteDir = path.join(packageRoot, 'src/routes/papers');
const fileBasedExperimentsPath = path.join(packageRoot, 'src/lib/config/fileBasedExperiments.ts');
const fileBasedPapersPath = path.join(packageRoot, 'src/lib/config/fileBasedPapers.ts');
const experimentCatalogPath = path.join(packageRoot, 'src/lib/config/experimentCatalog.ts');
const manifestRoutePath = path.join(packageRoot, 'src/routes/api/manifest/+server.ts');
const sitemapRoutePath = path.join(packageRoot, 'src/routes/sitemap.xml/+server.ts');
const staticSitemapPath = path.join(packageRoot, 'static/sitemap.xml');
const contentExperimentsDir = path.join(packageRoot, 'content/experiments');

function readText(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function uniqueSorted(values) {
	return [...new Set(values.filter(Boolean))].sort();
}

function duplicateValues(values) {
	const seen = new Set();
	const duplicates = new Set();
	for (const value of values) {
		if (seen.has(value)) duplicates.add(value);
		seen.add(value);
	}
	return [...duplicates].sort();
}

function quotedValues(source) {
	return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function valuesForConstSet(source, name) {
	const start = source.indexOf(`export const ${name}`);
	if (start === -1) return [];
	const open = source.indexOf('[', start);
	const close = source.indexOf(']);', open);
	if (open === -1 || close === -1) return [];
	return quotedValues(source.slice(open, close));
}

function valuesForConstArray(source, name) {
	const start = source.indexOf(`export const ${name}`);
	if (start === -1) return [];
	const open = source.indexOf('[', start);
	const close = source.indexOf('\n];', open);
	if (open === -1 || close === -1) return [];
	return [...source.slice(open, close).matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
}

function getStaticExperimentRouteSlugs() {
	return fs
		.readdirSync(experimentsRouteDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== '[slug]')
		.filter((entry) => {
			const routeDir = path.join(experimentsRouteDir, entry.name);
			return fs.existsSync(path.join(routeDir, '+page.svelte')) || fs.existsSync(path.join(routeDir, '+page.server.ts'));
		})
		.map((entry) => entry.name)
		.sort();
}

function getStaticPaperSlugs() {
	return fs
		.readdirSync(papersRouteDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== '[slug]')
		.map((entry) => entry.name)
		.sort();
}

function getMarkdownExperimentSlugs() {
	return fs
		.readdirSync(contentExperimentsDir)
		.filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
		.map((fileName) => fileName.replace(/\.md$/u, ''))
		.sort();
}

function objectBlockForSlug(source, slug) {
	const slugIndex = source.indexOf(`slug: '${slug}'`);
	if (slugIndex === -1) return '';
	const start = source.lastIndexOf('\n\t{', slugIndex);
	const end = source.indexOf('\n\t},', slugIndex);
	if (start === -1 || end === -1) return source.slice(slugIndex, slugIndex + 500);
	return source.slice(start, end);
}

function missingRequiredFields(source, slug, fields) {
	const block = objectBlockForSlug(source, slug);
	return fields.filter((field) => !new RegExp(`${field}:`, 'u').test(block));
}

const fileBasedExperimentsSource = readText(fileBasedExperimentsPath);
const fileBasedPapersSource = readText(fileBasedPapersPath);
const experimentCatalogSource = readText(experimentCatalogPath);
const manifestSource = readText(manifestRoutePath);
const sitemapSource = readText(sitemapRoutePath);

const fileBasedExperimentSlugs = [...fileBasedExperimentsSource.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
const fileBasedExperimentIds = [...fileBasedExperimentsSource.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
const staticExperimentSlugs = getStaticExperimentRouteSlugs();
const staticCatalogSlugs = valuesForConstArray(experimentCatalogSource, 'staticRouteExperiments');
const legacyRedirectSlugs = valuesForConstSet(experimentCatalogSource, 'LEGACY_EXPERIMENT_REDIRECT_SLUGS');
const markdownExperimentSlugs = getMarkdownExperimentSlugs();
const staticPaperSlugs = getStaticPaperSlugs();
const fileBasedPaperSlugs = [...fileBasedPapersSource.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);

const fileBasedExperimentSlugSet = new Set(fileBasedExperimentSlugs);
const staticCatalogSlugSet = new Set(staticCatalogSlugs);
const legacyRedirectSlugSet = new Set(legacyRedirectSlugs);
const publishedExperimentSlugSet = new Set([...fileBasedExperimentSlugs, ...staticCatalogSlugs]);
const staticExperimentSlugSet = new Set(staticExperimentSlugs);
const markdownExperimentSlugSet = new Set(markdownExperimentSlugs);
const paperSlugSet = new Set([...staticPaperSlugs, ...fileBasedPaperSlugs]);
const failures = [];

for (const duplicate of duplicateValues(fileBasedExperimentSlugs)) {
	failures.push(`Duplicate file-based experiment slug: ${duplicate}`);
}

for (const duplicate of duplicateValues(fileBasedExperimentIds)) {
	failures.push(`Duplicate file-based experiment id: ${duplicate}`);
}

for (const duplicate of duplicateValues(staticCatalogSlugs)) {
	failures.push(`Duplicate static-route experiment catalog slug: ${duplicate}`);
}

const requiredFileBasedFields = [
	'id',
	'slug',
	'title',
	'description',
	'excerpt_short',
	'excerpt_long',
	'category',
	'tags',
	'created_at',
	'updated_at',
	'reading_time_minutes',
	'difficulty'
];

for (const slug of uniqueSorted(fileBasedExperimentSlugs)) {
	const missing = missingRequiredFields(fileBasedExperimentsSource, slug, requiredFileBasedFields);
	if (missing.length > 0) {
		failures.push(`File-based experiment ${slug} is missing required field(s): ${missing.join(', ')}`);
	}
}

const uncatalogedStaticRoutes = staticExperimentSlugs.filter(
	(slug) =>
		!fileBasedExperimentSlugSet.has(slug) &&
		!staticCatalogSlugSet.has(slug) &&
		!legacyRedirectSlugSet.has(slug)
);
if (uncatalogedStaticRoutes.length > 0) {
	failures.push(
		[
			'Static experiment routes missing file-based metadata, static catalog metadata, or legacy redirect classification:',
			...uncatalogedStaticRoutes.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

const staticCatalogWithoutRoute = staticCatalogSlugs.filter((slug) => !staticExperimentSlugSet.has(slug));
if (staticCatalogWithoutRoute.length > 0) {
	failures.push(
		[
			'Static-route experiment catalog entries without a matching route directory:',
			...staticCatalogWithoutRoute.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

const missingMarkdownForDynamicFileBased = fileBasedExperimentSlugs.filter(
	(slug) => !staticExperimentSlugSet.has(slug) && !markdownExperimentSlugSet.has(slug)
);
if (missingMarkdownForDynamicFileBased.length > 0) {
	failures.push(
		[
			'File-based experiments without a static route must have content/experiments markdown:',
			...missingMarkdownForDynamicFileBased.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

const orphanMarkdownSlugs = markdownExperimentSlugs.filter(
	(slug) => !fileBasedExperimentSlugSet.has(slug) && !staticCatalogSlugSet.has(slug)
);
if (orphanMarkdownSlugs.length > 0) {
	failures.push(
		[
			'Markdown experiments missing file-based or static catalog metadata:',
			...orphanMarkdownSlugs.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

const paperCollisions = [...publishedExperimentSlugSet].filter((slug) => paperSlugSet.has(slug));
if (paperCollisions.length > 0) {
	failures.push(
		[
			'Experiment slugs collide with paper slugs:',
			...paperCollisions.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

if (fs.existsSync(staticSitemapPath)) {
	failures.push(
		'Do not add packages/io/static/sitemap.xml. The generated /sitemap.xml route owns sitemap output.'
	);
}

if (!manifestSource.includes('getExperimentManifestItems')) {
	failures.push('packages/io/src/routes/api/manifest/+server.ts must use getExperimentManifestItems().');
}

if (/const\s+EXPERIMENTS\s*:/u.test(manifestSource)) {
	failures.push('Do not maintain a manual EXPERIMENTS array in /api/manifest. Use experimentCatalog.ts.');
}

if (!sitemapSource.includes('getPublishedExperimentMetas')) {
	failures.push('packages/io/src/routes/sitemap.xml/+server.ts must use getPublishedExperimentMetas().');
}

if (failures.length > 0) {
	console.error(failures.join('\n\n'));
	process.exit(1);
}

console.log(
	`Experiment catalog OK: ${staticExperimentSlugs.length} static routes, ${fileBasedExperimentSlugs.length} file-based entries, ${staticCatalogSlugs.length} static-only catalog entries, ${legacyRedirectSlugs.length} legacy redirects.`
);
