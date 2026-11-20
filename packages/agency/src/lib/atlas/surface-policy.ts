export const AGENCY_WEBFLOW_PORTFOLIO_PATHS = [
  '/case-studies/webflow-marketplace',
  ...['asset-dashboard', 'validator', 'preflight', 'apps', 'submission', 'review-mcp', 'skills', 'listings'].map(id => `/case-studies/webflow-marketplace/${id}`)
];
export function isAgencyWebflowPortfolioPath(pathname: string): boolean {
  return AGENCY_WEBFLOW_PORTFOLIO_PATHS.includes(normalizeAgencyPathname(pathname));
}

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
  ...AGENCY_WEBFLOW_PORTFOLIO_PATHS,
  '/scopefield',
  '/airtable-workflow-consulting',
  '/dfw-tech-support',
  '/',
  '/ai-workflow-control',
  '/ai-workflow-recovery',
  '/agent-readiness',
  '/agent-foundation',
  '/technical-review',
  '/book',
  '/field-reports',
  '/field-reports/template-review',
  '/field-reports/upstream-contributions',
  '/marketplace-review-automation',
  '/workflow-compiler-integration',
  '/workflows',
  '/openai-dots',
  '/dental-ai-agents',
  ...AGENCY_ATLAS_PROOF_PATHS
] as const;

export const AGENCY_ROUTE_OWNED_PERFORMANCE_ENDING_PATHS = [
  ...AGENCY_WEBFLOW_PORTFOLIO_PATHS,
  '/dispatch',
  '/scopefield',
  '/airtable-workflow-consulting',
  '/dfw-tech-support',
  '/',
  '/ai-workflow-control',
  '/ai-workflow-recovery',
  '/agent-readiness',
  '/agent-foundation',
  '/technical-review',
  '/services',
  '/workflow-compiler-integration',
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
  '/openai-dots',
  '/dental-ai-agents',
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
    normalized === '/login' ||
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
