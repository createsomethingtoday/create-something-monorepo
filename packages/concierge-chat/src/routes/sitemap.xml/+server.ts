import { absoluteUrl } from '$lib/site/seo';

const routes = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/nurses', priority: '0.9', changefreq: 'weekly' },
	{ path: '/jobs', priority: '0.9', changefreq: 'daily' },
	{ path: '/facilities', priority: '0.8', changefreq: 'weekly' },
	{ path: '/agents', priority: '0.6', changefreq: 'weekly' },
	{ path: '/apply', priority: '0.8', changefreq: 'weekly' }
];

export const GET = () => {
	const updated = new Date().toISOString();
	const urls = routes
		.map(
			(route) => `<url><loc>${absoluteUrl(route.path)}</loc><lastmod>${updated}</lastmod><changefreq>${route.changefreq}</changefreq><priority>${route.priority}</priority></url>`
		)
		.join('');
	const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
