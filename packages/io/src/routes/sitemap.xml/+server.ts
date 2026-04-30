import type { Paper } from '@create-something/canon/types';
import type { RequestHandler } from './$types';
import {
	buildCategories,
	getLocalResearchArtifacts,
	mergeBySlug,
	sortByFeaturedThenDate,
	type ResearchArtifact
} from '$lib/config/researchArtifacts';

const baseUrl = 'https://createsomething.io';

type SitemapUrl = {
	path: string;
	changefreq: 'daily' | 'weekly' | 'monthly';
	priority: string;
	lastmod: string;
};

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function toDateOnly(value?: string | null): string {
	if (!value) return new Date().toISOString().split('T')[0];

	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) return new Date().toISOString().split('T')[0];

	return new Date(timestamp).toISOString().split('T')[0];
}

function artifactPath(artifact: ResearchArtifact): string {
	if (artifact.route?.startsWith('/')) return artifact.route;
	return `/experiments/${artifact.slug}`;
}

function artifactLastmod(artifact: ResearchArtifact): string {
	return toDateOnly(artifact.updated_at || artifact.published_at || artifact.created_at || artifact.date);
}

function urlEntry({ path, changefreq, priority, lastmod }: SitemapUrl): string {
	return `  <url>
    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
}

function uniqueUrls(urls: SitemapUrl[]): SitemapUrl[] {
	const seen = new Set<string>();
	const unique: SitemapUrl[] = [];

	for (const url of urls) {
		if (seen.has(url.path)) continue;
		seen.add(url.path);
		unique.push(url);
	}

	return unique;
}

async function loadResearchArtifacts(platform: App.Platform | undefined): Promise<ResearchArtifact[]> {
	const localArtifacts = getLocalResearchArtifacts();

	if (!platform?.env?.DB) {
		return localArtifacts;
	}

	try {
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
    `
		).all<Paper>();

		return mergeBySlug((result.results || []) as ResearchArtifact[], localArtifacts);
	} catch (error) {
		console.error('Failed to fetch sitemap research artifacts from D1:', error);
		return localArtifacts;
	}
}

export const GET: RequestHandler = async ({ platform }) => {
	const today = new Date().toISOString().split('T')[0];
	const artifacts = sortByFeaturedThenDate(await loadResearchArtifacts(platform));
	const categories = buildCategories(artifacts);

	const urls = uniqueUrls([
		{ path: '/', changefreq: 'daily', priority: '1.0', lastmod: today },
		{ path: '/papers', changefreq: 'daily', priority: '0.9', lastmod: today },
		{ path: '/experiments', changefreq: 'daily', priority: '0.9', lastmod: today },
		{ path: '/methodology', changefreq: 'weekly', priority: '0.8', lastmod: today },
		{ path: '/categories', changefreq: 'weekly', priority: '0.8', lastmod: today },
		{ path: '/about', changefreq: 'monthly', priority: '0.7', lastmod: today },
		{ path: '/contact', changefreq: 'monthly', priority: '0.7', lastmod: today },
		{ path: '/privacy', changefreq: 'monthly', priority: '0.5', lastmod: today },
		{ path: '/terms', changefreq: 'monthly', priority: '0.5', lastmod: today },
		...categories.map((category) => ({
			path: `/category/${category.slug}`,
			changefreq: 'weekly' as const,
			priority: '0.8',
			lastmod: today
		})),
		...artifacts.map((artifact) => ({
			path: artifactPath(artifact),
			changefreq: 'monthly' as const,
			priority: artifact.featured ? '0.9' : '0.8',
			lastmod: artifactLastmod(artifact)
		}))
	]).filter((url) => !url.path.startsWith('http'));

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlEntry).join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
