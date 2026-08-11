export const AGENCY_DIFY_ARTICLE_PATHS = [
  '/dify/ship-dify-app-with-mcp-tools',
  '/dify/agent-eval-gates',
  '/dify/mcp-control-plane'
] as const;

export const AGENCY_ATLAS_PROOF_PATHS = [
  '/services',
  '/map',
  '/practice',
  '/methodology',
  '/stack',
  '/products',
  '/proof/marketplace-workflow',
  '/products/signal',
  '/products/decision',
  '/products/proof'
] as const;

export const AGENCY_COMPACT_PRIVACY_PATHS = [
  '/',
  '/ai-workflow-control',
  '/ai-workflow-recovery',
  '/book',
  '/field-reports',
  '/field-reports/template-review',
  '/field-reports/upstream-contributions',
  '/marketplace-review-automation',
  '/workflows',
  ...AGENCY_ATLAS_PROOF_PATHS
] as const;

export const AGENCY_ROUTE_OWNED_PERFORMANCE_ENDING_PATHS = [
  '/',
  '/ai-workflow-control',
  '/ai-workflow-recovery',
  '/services',
  '/book',
  '/contact',
  '/map',
  '/control',
  '/proof/marketplace-workflow',
  '/products',
  '/products/ground',
  '/products/signal',
  '/products/decision',
  '/products/proof',
  '/products/loom',
  '/stack',
  '/partners',
  '/for-service-providers',
  '/methodology',
  '/practice',
  '/security',
  '/bearer-token-policy',
  '/cloudflare',
  '/field-reports',
  '/field-reports/template-review',
  '/field-reports/upstream-contributions',
  '/marketplace-review-automation',
  '/workflows',
  '/use-cases/business',
  '/use-cases/enterprise',
  '/about'
] as const;

function normalizeAgencyPathname(pathname: string): string {
  const normalized = pathname.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/';
  return normalized === '' ? '/' : normalized;
}

export function isAgencyDifyArticlePath(pathname: string): boolean {
  const normalized = normalizeAgencyPathname(pathname);
  return AGENCY_DIFY_ARTICLE_PATHS.includes(
    normalized as (typeof AGENCY_DIFY_ARTICLE_PATHS)[number]
  );
}

export function isAgencyAtlasProofPath(pathname: string): boolean {
  const normalized = normalizeAgencyPathname(pathname);
  return AGENCY_ATLAS_PROOF_PATHS.includes(normalized as (typeof AGENCY_ATLAS_PROOF_PATHS)[number]);
}

export function usesCompactAgencyPrivacyPrompt(pathname: string): boolean {
  const normalized = normalizeAgencyPathname(pathname);
  return (
    AGENCY_COMPACT_PRIVACY_PATHS.includes(
      normalized as (typeof AGENCY_COMPACT_PRIVACY_PATHS)[number]
    ) || isAgencyDifyArticlePath(normalized)
  );
}

export function usesRouteOwnedAgencyPerformanceEnding(pathname: string): boolean {
  const normalized = normalizeAgencyPathname(pathname);
  return AGENCY_ROUTE_OWNED_PERFORMANCE_ENDING_PATHS.includes(
    normalized as (typeof AGENCY_ROUTE_OWNED_PERFORMANCE_ENDING_PATHS)[number]
  );
}
