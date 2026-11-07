import { marketingPagePortfolio } from './marketingPages';
import { isAgencyWebflowPortfolioPath } from '../atlas/surface-policy';

/** Palette ownership follows the reviewed portfolio, not URL prefix guesses.
 * Unknown routes fail closed. Utility shells and archived campaigns cannot opt in
 * accidentally when an entry is added to the marketing inventory.
 */
const privateOrUtilityRoute = /^\/(account|admin|dashboard|login|logout|auth|mcp-access|delivery|api|dify|prospects)(?:\/|$)/;
const publicSupportingRoutes = new Set([
  '/privacy', '/terms', '/support-brief',
  // Current public search landing pages outside the editorial portfolio.
  '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation'
]);
const portfolioRoutes = new Set(
  marketingPagePortfolio.filter((entry) => entry.decision !== 'archive').map((entry) => entry.path)
);
// These noindex catalogs and their served details are public Agency pages.
// Their loaders still decide whether a requested slug exists and is published.
const publicPreviewRoute = /^\/(?:arc|experiments)\/[^/]+$/;

export function usesAgencyOperatorPalette(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  // Customer entry adopts Agency styling; private workspace policy stays separate.
  if (path === '/login') return true;
  if (privateOrUtilityRoute.test(path)) return false;
  // Preserve the already approved opt-in for the Map entry only. Nested maps,
  // handoffs, subscriptions and shared maps retain their own utility policy.
  if (path.startsWith('/map/')) return path === '/map/workspace';
  return portfolioRoutes.has(path) || publicSupportingRoutes.has(path)
    || path === '/arcs' || path === '/experiments' || publicPreviewRoute.test(path);
}

/** The measured brand belongs to reviewed public Agency pages only.
 * Palette ownership is broader (including sign-in and the Map entry), so it is
 * deliberately not the authority for this SSR presentation boundary.
 */
export function usesAgencyMeasuredPublicSurface(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (privateOrUtilityRoute.test(path) || path.startsWith('/map/')) return false;
  if (isAgencyWebflowPortfolioPath(path)) return false;
  return portfolioRoutes.has(path) || publicSupportingRoutes.has(path)
    || path === '/arcs' || path === '/experiments' || publicPreviewRoute.test(path);
}
