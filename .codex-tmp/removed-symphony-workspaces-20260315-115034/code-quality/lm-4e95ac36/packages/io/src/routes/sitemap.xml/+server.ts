import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return new Response('Database not available', { status: 500 });
	}

	try {
		// Get all published experiments
		const experimentsResult = await db
			.prepare(
				`SELECT id, title, updated_at, created_at
				FROM papers
				WHERE published = 1
				ORDER BY created_at DESC`
			)
			.all();

		const experiments = experimentsResult.results || [];

		// Get all categories
		const categoriesResult = await db
			.prepare(`SELECT id, slug FROM categories ORDER BY name`)
			.all();

		const categories = categoriesResult.results || [];

		// Get all tags
		const tagsResult = await db.prepare(`SELECT id, slug FROM tags ORDER BY name`).all();

		const tags = tagsResult.results || [];

		const baseUrl = 'https://createsomething.io';
		const today = new Date().toISOString().split('T')[0];

		// Build sitemap XML
		const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>

  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/experiments</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/methodology</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <lastmod>${today}</lastmod>
  </url>

  <!-- Categories -->
${categories
	.map(
		(category: any) => `  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>`
	)
	.join('\n')}

  <!-- Tags -->
${tags
	.map(
		(tag: any) => `  <url>
    <loc>${baseUrl}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>`
	)
	.join('\n')}

  <!-- Experiments -->
${experiments
	.map((experiment: any) => {
		const lastmod = experiment.updated_at || experiment.created_at || today;
		const formattedDate = lastmod.split('T')[0];
		return `  <url>
    <loc>${baseUrl}/experiments/${experiment.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <lastmod>${formattedDate}</lastmod>
  </url>`;
	})
	.join('\n')}
</urlset>`;

		return new Response(sitemap, {
			headers: {
				'Content-Type': 'application/xml',
				'Cache-Control': 'max-age=3600' // Cache for 1 hour
			}
		});
	} catch (error) {
		console.error('Failed to generate sitemap:', error);
		return new Response('Failed to generate sitemap', { status: 500 });
	}
};
