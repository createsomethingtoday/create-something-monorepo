import type { RequestHandler } from './$types';

interface SitemapPage {
  loc: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

const pages: SitemapPage[] = [
  { loc: '/', changefreq: 'weekly', priority: 1.0 },
  { loc: '/services', changefreq: 'weekly', priority: 0.95 },
  { loc: '/ai-automation-agency', changefreq: 'weekly', priority: 0.9 },
  { loc: '/automation-agency', changefreq: 'weekly', priority: 0.9 },
  { loc: '/ai-governance-for-automation', changefreq: 'weekly', priority: 0.85 },
  { loc: '/custom-ai-automation', changefreq: 'weekly', priority: 0.85 },
  { loc: '/use-cases/business', changefreq: 'weekly', priority: 0.85 },
  { loc: '/use-cases/enterprise', changefreq: 'weekly', priority: 0.85 },
  { loc: '/methodology', changefreq: 'monthly', priority: 0.8 },
  { loc: '/products', changefreq: 'weekly', priority: 0.8 },
  { loc: '/products/loom', changefreq: 'monthly', priority: 0.75 },
  { loc: '/products/ground', changefreq: 'monthly', priority: 0.75 },
  { loc: '/about', changefreq: 'monthly', priority: 0.7 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.7 },
  { loc: '/security', changefreq: 'monthly', priority: 0.5 },
  { loc: '/bearer-token-policy', changefreq: 'monthly', priority: 0.5 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.3 }
];

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildSitemap(baseUrl: string): string {
  const lastmod = new Date().toISOString().split('T')[0];

  const urls = pages
    .map((page) => {
      const loc = escapeXml(`${baseUrl}${page.loc}`);
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export const GET: RequestHandler = async ({ url }) => {
  const baseUrl = `${url.protocol}//${url.host}`;
  const sitemap = buildSitemap(baseUrl);

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600'
    }
  });
};
