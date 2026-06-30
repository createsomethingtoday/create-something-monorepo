import { abundanceSite, absoluteUrl } from '$lib/site/seo';

const disallow = ['/chat/', '/settings', '/style-guide', '/agents/'];

export const GET = () => {
	const body = [
		'User-agent: *',
		...disallow.map((path) => `Disallow: ${path}`),
		`Sitemap: ${absoluteUrl('/sitemap.xml')}`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600',
			'x-abundance-site': abundanceSite.name
		}
	});
};
