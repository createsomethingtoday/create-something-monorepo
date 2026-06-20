import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const papersRouteDir = path.join(packageRoot, 'src/routes/papers');
const fileBasedPapersPath = path.join(packageRoot, 'src/lib/config/fileBasedPapers.ts');
const staticSitemapPath = path.join(packageRoot, 'static/sitemap.xml');
const testPaperPath = path.join(packageRoot, 'content/papers/test-markdown-paper.md');
const contentPapersDir = path.join(packageRoot, 'content/papers');

function readText(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function getStaticPaperSlugs() {
	return fs
		.readdirSync(papersRouteDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== '[slug]')
		.map((entry) => entry.name)
		.sort();
}

function getStaticPaperMetaSlugs(routeSlugs) {
	return routeSlugs
		.filter((slug) => fs.existsSync(path.join(papersRouteDir, slug, 'meta.ts')))
		.sort();
}

function getFileBasedPaperSlugs() {
	return [...readText(fileBasedPapersPath).matchAll(/slug:\s*'([^']+)'/g)]
		.map((match) => match[1])
		.sort();
}

const staticPaperSlugs = getStaticPaperSlugs();
const staticPaperMetaSlugs = getStaticPaperMetaSlugs(staticPaperSlugs);
const fileBasedPaperSlugs = getFileBasedPaperSlugs();
const catalogSlugs = new Set([...staticPaperMetaSlugs, ...fileBasedPaperSlugs]);
const missingFromCatalog = staticPaperSlugs.filter((slug) => !catalogSlugs.has(slug));
const staticRouteSlugSet = new Set(staticPaperSlugs);
const fileBasedPaperSlugSet = new Set(fileBasedPaperSlugs);
const orphanMarkdownSlugs = fs
	.readdirSync(contentPapersDir)
	.filter((fileName) => fileName.endsWith('.md'))
	.map((fileName) => fileName.replace(/\.md$/, ''))
	.filter((slug) => !staticRouteSlugSet.has(slug) && !fileBasedPaperSlugSet.has(slug))
	.sort();
const failures = [];

if (missingFromCatalog.length > 0) {
	failures.push(
		[
			'Static paper routes missing catalog metadata:',
			...missingFromCatalog.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

if (fs.existsSync(staticSitemapPath)) {
	failures.push(
		'Do not add packages/io/static/sitemap.xml. The generated /sitemap.xml route owns sitemap output.'
	);
}

if (fs.existsSync(testPaperPath)) {
	failures.push(
		'Remove content/papers/test-markdown-paper.md from production content. Use fixtures outside content/papers.'
	);
}

if (orphanMarkdownSlugs.length > 0) {
	failures.push(
		[
			'Markdown papers missing a static route or file-based catalog entry:',
			...orphanMarkdownSlugs.map((slug) => `  - ${slug}`)
		].join('\n')
	);
}

if (failures.length > 0) {
	console.error(failures.join('\n\n'));
	process.exit(1);
}

console.log(
	`Paper catalog OK: ${staticPaperSlugs.length} static routes, ${staticPaperMetaSlugs.length} static metas, ${fileBasedPaperSlugs.length} file-based entries.`
);
