export const AGENCY_DIFY_ARTICLE_PATHS = [
  '/dify/ship-dify-app-with-mcp-tools',
  '/dify/agent-eval-gates',
  '/dify/mcp-control-plane'
] as const;

export const AGENCY_ATLAS_PROOF_PATHS = [
  '/services',
  '/atlas',
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
  '/book',
  '/field-reports',
  '/field-reports/template-review',
  ...AGENCY_ATLAS_PROOF_PATHS
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
