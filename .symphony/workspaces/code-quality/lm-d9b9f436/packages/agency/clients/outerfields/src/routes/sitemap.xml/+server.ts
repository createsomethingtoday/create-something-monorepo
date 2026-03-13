/**
 * OUTERFIELDS Sitemap Generator
 *
 * Dynamic XML sitemap for search engines and AI crawlers
 */

import type { RequestHandler } from './$types';

const SITE_URL = 'https://outerfields.createsomething.agency';

interface SitemapPage {
	loc: string;
	lastmod?: string;
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: number;
}

const pages: SitemapPage[] = [
	{
		loc: '/',
		lastmod: new Date().toISOString().split('T')[0],
		changefreq: 'weekly',
		priority: 1.0
	},
	{
		loc: '/login',
		changefreq: 'monthly',
		priority: 0.5
	},
	{
		loc: '/signup',
		changefreq: 'monthly',
		priority: 0.6
	},
	{
		loc: '/docs',
		changefreq: 'weekly',
		priority: 0.8
	},
	{
		loc: '/design',
		changefreq: 'weekly',
		priority: 0.7
	}
];

function generateSitemap(pages: SitemapPage[]): string {
	const urlEntries = pages
		.map((page) => {
			const url = `${SITE_URL}${page.loc}`;
			let entry = `  <url>\n    <loc>${url}</loc>`;

			if (page.lastmod) {
				entry += `\n    <lastmod>${page.lastmod}</lastmod>`;
			}
			if (page.changefreq) {
				entry += `\n    <changefreq>${page.changefreq}</changefreq>`;
			}
			if (page.priority !== undefined) {
				entry += `\n    <priority>${page.priority.toFixed(1)}</priority>`;
			}

			entry += '\n  </url>';
			return entry;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;
}

export const GET: RequestHandler = async () => {
	const sitemap = generateSitemap(pages);

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600, s-maxage=3600'
		}
	});
};
