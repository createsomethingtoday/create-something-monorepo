function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizePath(path: string): string {
  if (path === '/' || path === '') return '/';

  const [pathname, query] = path.split('?', 2);
  const normalizedPathname = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

/** Render a deterministic sitemap from a property's indexable route catalog. */
export function renderSitemap(domain: string, paths: Iterable<string>): string {
  const normalizedDomain = domain.replace(/\/+$/, '');
  const normalizedPaths = [...new Set([...paths].map(normalizePath))].sort((left, right) => {
    if (left === '/') return -1;
    if (right === '/') return 1;
    return left.localeCompare(right);
  });

  const entries = normalizedPaths
    .map((path) => {
      const url = path === '/' ? `${normalizedDomain}/` : `${normalizedDomain}${path}`;
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
