import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routesRoot = path.join(packageRoot, 'src/routes');
const searchRoutesPath = path.join(packageRoot, 'src/lib/data/searchRoutes.json');
const robotsPath = path.join(packageRoot, 'static/robots.txt');
const headersPath = path.join(packageRoot, '_headers');

const routeEntries = JSON.parse(fs.readFileSync(searchRoutesPath, 'utf8'));
const sitemapRoutes = new Set(routeEntries.map((entry) => entry.path));
const robots = fs.readFileSync(robotsPath, 'utf8');
const headers = fs.readFileSync(headersPath, 'utf8');
const pageFiles = findFiles(routesRoot, '+page.svelte');
const errors = [];

const robotsBlockedPrefixes = [
	'/admin',
	'/account',
	'/api',
	'/login',
	'/auth',
	'/dashboard',
	'/mcp-access',
	'/prospects'
];
const requiredFaqRoutes = new Set([
	'/',
	'/stack',
	'/products',
	'/dify',
	'/cloudflare',
	'/notion',
	'/use-cases/business',
	'/use-cases/enterprise'
]);
const requiredDedicatedOgImages = new Map([
	['/dify', '/og/dify-lane.svg'],
	['/dify/content-engine', '/og/dify-content-engine.svg'],
	['/dify/mcp-control-plane', '/og/dify-mcp-control-plane.svg'],
	['/dify/n8n-vs-dify', '/og/dify-vs-n8n.svg'],
	['/cloudflare', '/og/cloudflare-lane.svg'],
	['/notion', '/og/notion-lane.svg'],
	['/use-cases/enterprise', '/og/policy-os.svg']
]);
const requiredInPageArticleVisuals = new Map([
	['/dify/content-engine', '/images/articles/dify-content-engine/content-engine-funnel.svg'],
	['/dify/n8n-vs-dify', '/images/articles/dify-vs-n8n/dify-n8n-layer-map.svg'],
	['/notion', '/images/articles/notion-ops-workspace/notion-operator-workspace.svg']
]);

for (const entry of routeEntries) {
	if (!entry.path || !entry.path.startsWith('/')) {
		errors.push(`Search route has invalid path: ${JSON.stringify(entry)}`);
	}

	if (!['daily', 'weekly', 'monthly'].includes(entry.changefreq)) {
		errors.push(`${entry.path} has invalid changefreq: ${entry.changefreq}`);
	}

	if (!/^\d(?:\.\d+)?$/.test(entry.priority)) {
		errors.push(`${entry.path} has invalid priority: ${entry.priority}`);
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod)) {
		errors.push(`${entry.path} has invalid lastmod: ${entry.lastmod}`);
	}

	const pageFile = pageFileForRoute(entry.path);
	if (!fs.existsSync(pageFile)) {
		errors.push(`${entry.path} is in searchRoutes.json but has no +page.svelte`);
		continue;
	}

	const source = fs.readFileSync(pageFile, 'utf8');
	if (/noindex=\{true\}/.test(source)) {
		errors.push(`${entry.path} is in searchRoutes.json but its SEO component is noindex`);
	}

	if (requiredFaqRoutes.has(entry.path) && !hasSeoProp(source, 'faqItems')) {
		errors.push(`${entry.path} is a high-intent search route but does not pass FAQ schema`);
	}

	const requiredOgImage = requiredDedicatedOgImages.get(entry.path);
	if (requiredOgImage) {
		const actualOgImage = source.match(/ogImage="([^"]+)"/)?.[1];
		if (actualOgImage !== requiredOgImage) {
			errors.push(`${entry.path} should use dedicated ogImage ${requiredOgImage}`);
		}

		const assetPath = path.join(packageRoot, 'static', requiredOgImage.replace(/^\//, ''));
		if (!fs.existsSync(assetPath)) {
			errors.push(`${entry.path} references missing OG image asset ${requiredOgImage}`);
		}
	}

	const requiredInPageArticleVisual = requiredInPageArticleVisuals.get(entry.path);
	if (requiredInPageArticleVisual) {
		if (!source.includes('ArticleVisualFigure')) {
			errors.push(`${entry.path} should render its owned article visual with ArticleVisualFigure`);
		}

		if (!source.includes(`src="${requiredInPageArticleVisual}"`)) {
			errors.push(`${entry.path} should render owned article visual ${requiredInPageArticleVisual}`);
		}

		const assetPath = path.join(packageRoot, 'static', requiredInPageArticleVisual.replace(/^\//, ''));
		if (!fs.existsSync(assetPath)) {
			errors.push(`${entry.path} references missing in-page article visual ${requiredInPageArticleVisual}`);
		}
	}
}

for (const file of pageFiles) {
	const route = routeFromPageFile(file);
	const source = fs.readFileSync(file, 'utf8');
	const noindex = /noindex=\{true\}/.test(source);
	const robotsBlocked = robotsBlockedPrefixes.some(
		(prefix) => route === prefix || route.startsWith(`${prefix}/`)
	);
	const dynamicRoute = route.includes('[');
	const indexable = !noindex && !robotsBlocked && !dynamicRoute;

	if (indexable && !sitemapRoutes.has(route)) {
		errors.push(`${route} is indexable but missing from searchRoutes.json`);
	}

	if (!indexable && sitemapRoutes.has(route)) {
		errors.push(`${route} is excluded by route policy but present in searchRoutes.json`);
	}

	if (/ogType="article"/.test(source) && !/publishedTime=/.test(source)) {
		errors.push(`${route} uses Article schema but does not pass publishedTime`);
	}
}

for (const requiredDisallow of [
	'Disallow: /job-applications',
	'Disallow: /Micah_Johnson_',
	'Disallow: /cover-letter-',
	'Disallow: /resume-',
	'Disallow: /*-combined.html'
]) {
	if (!robots.includes(requiredDisallow)) {
		errors.push(`robots.txt is missing ${requiredDisallow}`);
	}
}

for (const pattern of [
	'/job-applications/*',
	'/Micah_Johnson_*',
	'/cover-letter-*',
	'/resume-*',
	'/akkio-interview-prep.md',
	'/*-combined.html'
]) {
	const blockPattern = new RegExp(`${escapeRegExp(pattern)}\\s+X-Robots-Tag: noindex, nofollow`);
	if (!blockPattern.test(headers)) {
		errors.push(`_headers is missing X-Robots-Tag noindex coverage for ${pattern}`);
	}
}

if (fs.existsSync(path.join(packageRoot, 'static/_headers'))) {
	errors.push('static/_headers exists; Cloudflare adapter expects _headers at the package root');
}

if (fs.existsSync(path.join(packageRoot, 'static/sitemap.xml'))) {
	errors.push('static/sitemap.xml exists; use src/routes/sitemap.xml/+server.ts instead');
}

if (errors.length > 0) {
	console.error('SEO/AEO check failed:');
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(`SEO/AEO check passed for ${pageFiles.length} pages and ${routeEntries.length} sitemap routes.`);

function findFiles(dir, filename, files = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const absolute = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			findFiles(absolute, filename, files);
		} else if (entry.name === filename) {
			files.push(absolute);
		}
	}

	return files.sort();
}

function routeFromPageFile(file) {
	const relativeDir = path.relative(routesRoot, path.dirname(file));
	if (!relativeDir) return '/';
	return `/${relativeDir.split(path.sep).join('/')}`;
}

function pageFileForRoute(route) {
	const routeDir = route === '/' ? routesRoot : path.join(routesRoot, route.slice(1));
	return path.join(routeDir, '+page.svelte');
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasSeoProp(source, propName) {
	return new RegExp(`(?:\\{${propName}\\}|${propName}=)`).test(source);
}
