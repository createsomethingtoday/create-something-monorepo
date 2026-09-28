import { marketingPagePortfolio } from './marketingPages';

/** Palette ownership follows the reviewed portfolio, not URL prefix guesses.
 * Unknown routes fail closed. Utility shells and archived campaigns cannot opt in
 * accidentally when an entry is added to the marketing inventory.
 */
const privateOrUtilityRoute = /^\/(account|admin|dashboard|login|logout|auth|mcp-access|delivery|api|dify)(?:\/|$)/;
const publicSupportingRoutes = new Set([
  '/privacy', '/terms',
  // Current public search landing pages outside the editorial portfolio.
  '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation'
]);
const portfolioRoutes = new Set(
  marketingPagePortfolio.filter((entry) => entry.decision !== 'archive').map((entry) => entry.path)
);

export function usesAgencyOperatorPalette(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (privateOrUtilityRoute.test(path)) return false;
  // Preserve the already approved opt-in for the Map entry only. Nested maps,
  // handoffs, subscriptions and shared maps retain their own utility policy.
  if (path.startsWith('/map/')) return path === '/map/workspace';
  return portfolioRoutes.has(path) || publicSupportingRoutes.has(path);
}
