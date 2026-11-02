import path from 'node:path';

/** Resolve public sitemap URLs to their owning Svelte page, including dynamic families. */
export function pageFileForRoute(route, routesRoot) {
  if (route.startsWith('/workflows/')) {
    return path.join(routesRoot, 'workflows', '[slug]', '+page.svelte');
  }
  if (/^\/case-studies\/webflow-marketplace\/[^/]+$/.test(route)) {
    return path.join(routesRoot, 'case-studies', 'webflow-marketplace', '[study]', '+page.svelte');
  }
  const routeDir = route === '/' ? routesRoot : path.join(routesRoot, route.slice(1));
  return path.join(routeDir, '+page.svelte');
}

/** Recognize both the shared SEO component and authored static robots metadata. */
export function sourceDeclaresNoindex(source) {
  if (/noindex=\{true\}/.test(source) || /search-policy:\s*noindex/.test(source)) return true;
  return [...source.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => {
    const name = tag.match(/\bname\s*=\s*(['"])(.*?)\1/i)?.[2];
    const content = tag.match(/\bcontent\s*=\s*(['"])(.*?)\1/i)?.[2] ?? '';
    return name?.toLowerCase() === 'robots' && /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(content);
  });
}
