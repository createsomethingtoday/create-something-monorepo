import type { RequestHandler } from './$types';
import {
	PUBLIC_AGENT_TRUST_CARDS,
	PUBLIC_MCP_TRUST_CARDS
} from '$lib/config/publicTrustCatalog';
import {
	getPublishedExperimentMetas,
	getPublishedExperimentSlugs
} from '$lib/config/experimentCatalog';
import { getPublishedPaperMetas, getPublishedPaperSlugs } from '$lib/config/paperCatalog';

const paperMetas = getPublishedPaperMetas();
const knownPaperSlugs = getPublishedPaperSlugs();

function isMissingPapersTable(error: unknown): boolean {
	return error instanceof Error && error.message.includes('no such table: papers');
}

type SitemapUrl = {
	loc: string;
	changefreq: 'daily' | 'weekly' | 'monthly';
	priority: string;
	lastmod: string;
};

export const GET: RequestHandler = async ({ platform }) => {
	const baseUrl = 'https://createsomething.io';
	const today = new Date().toISOString().split('T')[0];
	const urls: SitemapUrl[] = [
		{ loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
		{ loc: `${baseUrl}/experiments`, changefreq: 'daily', priority: '0.9', lastmod: today },
		{ loc: `${baseUrl}/papers`, changefreq: 'weekly', priority: '0.9', lastmod: today },
		{ loc: `${baseUrl}/methodology`, changefreq: 'weekly', priority: '0.8', lastmod: today },
		{ loc: `${baseUrl}/categories`, changefreq: 'weekly', priority: '0.8', lastmod: today },
		{ loc: `${baseUrl}/mcp`, changefreq: 'weekly', priority: '0.9', lastmod: today },
		{ loc: `${baseUrl}/agents`, changefreq: 'weekly', priority: '0.8', lastmod: today },
		{ loc: `${baseUrl}/about`, changefreq: 'monthly', priority: '0.7', lastmod: today },
		{ loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.7', lastmod: today },
		{ loc: `${baseUrl}/privacy`, changefreq: 'monthly', priority: '0.5', lastmod: today },
		{ loc: `${baseUrl}/terms`, changefreq: 'monthly', priority: '0.5', lastmod: today }
	];

	for (const card of PUBLIC_MCP_TRUST_CARDS) {
		urls.push({
			loc: `${baseUrl}/mcp/${card.slug}`,
			changefreq: 'weekly',
			priority: '0.8',
			lastmod: card.lastVerifiedDate || today
		});
	}

	for (const card of PUBLIC_AGENT_TRUST_CARDS) {
		urls.push({
			loc: `${baseUrl}/agents/${card.slug}`,
			changefreq: 'weekly',
			priority: '0.7',
			lastmod: card.lastVerifiedDate || today
		});
	}

	for (const paper of paperMetas) {
		urls.push({
			loc: `${baseUrl}/papers/${paper.slug}`,
			changefreq: 'monthly',
			priority: '0.8',
			lastmod: paper.date || today
		});
	}

	const knownExperimentSlugs = getPublishedExperimentSlugs();
	for (const experiment of getPublishedExperimentMetas()) {
		knownExperimentSlugs.add(experiment.slug);
		urls.push({
			loc: `${baseUrl}/experiments/${experiment.slug}`,
			changefreq: 'monthly',
			priority: '0.9',
			lastmod: (experiment.updated_at || experiment.created_at || today).split('T')[0]
		});
	}

	const db = platform?.env?.DB;
	if (db) {
		try {
			const experimentsResult = await db
				.prepare(
					`SELECT id, slug, updated_at, created_at
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC`
				)
				.all();

			for (const experiment of experimentsResult.results || []) {
				const record = experiment as { id: string; slug?: string | null; updated_at?: string; created_at?: string };
				const slug = record.slug || record.id;
				if (!slug || knownPaperSlugs.has(slug) || knownExperimentSlugs.has(slug)) continue;
				knownExperimentSlugs.add(slug);
				const lastmod = record.updated_at || record.created_at || today;
				urls.push({
					loc: `${baseUrl}/experiments/${slug}`,
					changefreq: 'monthly',
					priority: '0.9',
					lastmod: lastmod.split('T')[0]
				});
			}

			const categoriesResult = await db.prepare(`SELECT slug FROM categories ORDER BY name`).all();
			for (const category of categoriesResult.results || []) {
				const record = category as { slug: string };
				urls.push({
					loc: `${baseUrl}/category/${record.slug}`,
					changefreq: 'weekly',
					priority: '0.8',
					lastmod: today
				});
			}

			const tagsResult = await db.prepare(`SELECT slug FROM tags ORDER BY name`).all();
			for (const tag of tagsResult.results || []) {
				const record = tag as { slug: string };
				urls.push({
					loc: `${baseUrl}/tag/${record.slug}`,
					changefreq: 'weekly',
					priority: '0.7',
					lastmod: today
				});
			}
		} catch (error) {
			if (!isMissingPapersTable(error)) {
				console.error('Failed to add database-backed sitemap entries:', error);
			}
		}
	}

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(renderUrl).join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};

function renderUrl(url: SitemapUrl): string {
	return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    <lastmod>${url.lastmod}</lastmod>
  </url>`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
