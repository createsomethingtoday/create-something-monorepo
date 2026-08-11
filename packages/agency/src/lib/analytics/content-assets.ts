export type AgencyContentIntent =
  | 'booking'
  | 'compare'
  | 'versus'
  | 'how-to'
  | 'checklist'
  | 'definition'
  | 'workflow-proof'
  | 'service'
  | 'paid-search';

export type AgencyContentFunnelStage = 'awareness' | 'consideration' | 'decision';

export interface AgencyContentAssetAnalytics {
  contentAssetId: string;
  contentType: 'article' | 'conversion-page' | 'guide' | 'service-page';
  contentCluster: string;
  contentIntent: AgencyContentIntent;
  contentAudience: string;
  contentFunnelStage: AgencyContentFunnelStage;
  contentPrimaryKeyword: string;
  contentPrimaryCta: string;
  contentLinearIssue?: string;
}

const AGENCY_CONTENT_ASSETS_BY_PATH: Record<string, AgencyContentAssetAnalytics> = {
  '/marketplace-review-automation': {
    contentAssetId: 'conversion.marketplace-review-automation.v20260810',
    contentType: 'conversion-page',
    contentCluster: 'marketplace-workflow-review',
    contentIntent: 'paid-search',
    contentAudience: 'marketplace operator evaluating evidence preparation and approval controls',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'marketplace review automation',
    contentPrimaryCta: 'workflow-draft-started',
    contentLinearIssue: 'CRE-1674'
  },
  '/ai-workflow-recovery': {
    contentAssetId: 'conversion.ai-workflow-recovery.v20260810',
    contentType: 'conversion-page',
    contentCluster: 'ai-workflow-recovery',
    contentIntent: 'paid-search',
    contentAudience: 'operator with a brittle or failed AI workflow',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'AI agent recovery',
    contentPrimaryCta: 'workflow-draft-started',
    contentLinearIssue: 'CRE-1674'
  },
  '/ai-workflow-control': {
    contentAssetId: 'conversion.ai-workflow-control.v20260810',
    contentType: 'conversion-page',
    contentCluster: 'human-approval-and-control',
    contentIntent: 'paid-search',
    contentAudience: 'operator defining human approval and stop conditions for AI work',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'AI workflow human approval',
    contentPrimaryCta: 'workflow-draft-started',
    contentLinearIssue: 'CRE-1674'
  },
  '/services': {
    contentAssetId: 'service.workflow-infrastructure.v20260518',
    contentType: 'service-page',
    contentCluster: 'workflow-infrastructure-services',
    contentIntent: 'service',
    contentAudience: 'operator evaluating governed workflow implementation support',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'AI workflow systems consultant',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/contact': {
    contentAssetId: 'conversion.contact-funnel.v20260525',
    contentType: 'conversion-page',
    contentCluster: 'workflow-infrastructure-services',
    contentIntent: 'service',
    contentAudience: 'reader choosing between checklist, teardown, and mapping session',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'AI workflow governance checklist',
    contentPrimaryCta: 'choose-conversion-path'
  },
  '/book': {
    contentAssetId: 'conversion.book-mapping-session.v20260518',
    contentType: 'conversion-page',
    contentCluster: 'workflow-infrastructure-services',
    contentIntent: 'booking',
    contentAudience: 'qualified team ready to map a governed workflow',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'workflow mapping session',
    contentPrimaryCta: 'book-mapping-session'
  },
  '/partners': {
    contentAssetId: 'workflow-tool-stack.v20260518',
    contentType: 'guide',
    contentCluster: 'workflow-tool-stack',
    contentIntent: 'definition',
    contentAudience: 'operator choosing a tool path for one controlled workflow',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'workflow tool stack',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/cloudflare': {
    contentAssetId: 'workflow.cloudflare-runtime.v20260518',
    contentType: 'guide',
    contentCluster: 'workflow-tool-stack',
    contentIntent: 'workflow-proof',
    contentAudience: 'operator evaluating Cloudflare-backed AI workflow infrastructure',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Cloudflare workflow runtime',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/dify': {
    contentAssetId: 'workflow.dify-agent-systems.v20260518',
    contentType: 'guide',
    contentCluster: 'dify-governed-agent-systems',
    contentIntent: 'definition',
    contentAudience: 'operator evaluating Dify workflow systems',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Dify workflow systems',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/dify/mcp-control-plane': {
    contentAssetId: 'article.dify-mcp-control-plane.v20260518',
    contentType: 'article',
    contentCluster: 'dify-governed-agent-systems',
    contentIntent: 'how-to',
    contentAudience: 'technical operator connecting Dify to governed MCP tools',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'Dify MCP control plane',
    contentPrimaryCta: 'request-workflow-teardown',
    contentLinearIssue: 'CRE-444'
  },
  '/dify/agent-eval-gates': {
    contentAssetId: 'article.dify-agent-eval-gates.v20260622',
    contentType: 'article',
    contentCluster: 'dify-governed-agent-systems',
    contentIntent: 'how-to',
    contentAudience: 'operator validating a Dify app before production use',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'Dify agent eval gates',
    contentPrimaryCta: 'book-mapping-session',
    contentLinearIssue: 'CRE-751'
  },
  '/dify/ship-dify-app-with-mcp-tools': {
    contentAssetId: 'article.ship-dify-app-with-mcp-tools.v20260623',
    contentType: 'article',
    contentCluster: 'dify-governed-agent-systems',
    contentIntent: 'how-to',
    contentAudience: 'builder or agency packaging a Dify workflow with governed MCP tools',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'ship Dify app with MCP tools',
    contentPrimaryCta: 'request-workflow-teardown'
  }
};

export function getAgencyContentAssetAnalyticsMetadata(
  pathname: string
): AgencyContentAssetAnalytics | undefined {
  return AGENCY_CONTENT_ASSETS_BY_PATH[pathname];
}
