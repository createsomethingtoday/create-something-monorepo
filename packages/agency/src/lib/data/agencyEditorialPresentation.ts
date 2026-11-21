/** Presentation only. Route loaders and actions remain the access authority. */
export function agencyEditorialPageKind(pathname: string, status = 200): 'public' | 'workspace' | 'identity' | 'error' {
  if (status >= 400) return 'error';
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (/^\/(login|auth)(?:\/|$)/.test(path)) return 'identity';
  if (/^\/(account|admin|dashboard|mcp-access|delivery|prospects)(?:\/|$)/.test(path)
    || /^\/map\/(workspace|share|subscribe)(?:\/|$)/.test(path)) return 'workspace';
  return 'public';
}

/** Exact public paths served by Webflow Cloud. Keep this inventory aligned with
 * the private site route-ownership artifact; descendants are never implied. */
export const agencyWebflowPagePaths = new Set([
  '/', '/about', '/bearer-token-policy', '/blog', '/blog/posts/moving-the-agency-site-to-astro',
  '/book', '/contact', '/dispatch', '/field-reports', '/field-reports/template-review',
  '/field-reports/upstream-contributions', '/qualifications', '/security', '/sign-in',
  '/terms', '/work/cato'
]);
export function agencyNeedsDocumentNavigation(destination: URL, current: URL): boolean {
  if (destination.origin !== current.origin) return false;
  const path = destination.pathname.replace(/\/+$/, '') || '/';
  const currentPath = current.pathname.replace(/\/+$/, '') || '/';
  if (path === currentPath && destination.search === current.search && destination.hash) return false;
  return agencyWebflowPagePaths.has(path);
}
