import type { RequestHandler } from './$types';
import { getSiteConfig } from '$lib/config/tenant';

/**
 * Dynamic Sitemap Generator
 *
 * Generates XML sitemap for search engines.
 * Add new pages here as the site grows.
 */

const pages = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/services', priority: '0.9', changefreq: 'monthly' },
	{ path: '/about', priority: '0.8', changefreq: 'monthly' },
	{ path: '/team', priority: '0.7', changefreq: 'monthly' },
	{ path: '/contact', priority: '0.9', changefreq: 'monthly' },
	{ path: '/privacy', priority: '0.3', changefreq: 'yearly' },
	{ path: '/terms', priority: '0.3', changefreq: 'yearly' }
];

export const GET: RequestHandler = async ({ url, platform }) => {
	const { config: siteConfig } = await getSiteConfig(url, platform);
	const baseUrl = siteConfig.url;
	const lastmod = new Date().toISOString().split('T')[0];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
