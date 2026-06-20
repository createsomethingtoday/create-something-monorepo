import type { RequestHandler } from './$types';
import searchRoutes from '$lib/data/searchRoutes.json';

type SearchRoute = {
	path: string;
	changefreq: 'daily' | 'weekly' | 'monthly';
	priority: string;
	lastmod: string;
};

const baseUrl = 'https://createsomething.agency';

export const GET: RequestHandler = async () => {
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(searchRoutes as SearchRoute[]).map(renderUrl).join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};

function renderUrl(route: SearchRoute): string {
	const path = route.path === '/' ? '' : route.path;

	return `  <url>
    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <lastmod>${route.lastmod}</lastmod>
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
