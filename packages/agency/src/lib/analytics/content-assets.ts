export type AgencyContentIntent =
  | 'booking'
  | 'compare'
  | 'versus'
  | 'how-to'
  | 'checklist'
  | 'definition'
  | 'partner-proof'
  | 'service';

export type AgencyContentFunnelStage = 'awareness' | 'consideration' | 'decision';

export interface AgencyContentAssetAnalytics {
  contentAssetId: string;
  contentType: 'article' | 'conversion-page' | 'guide' | 'partner-page' | 'service-page';
  contentCluster: string;
  contentIntent: AgencyContentIntent;
  contentAudience: string;
  contentFunnelStage: AgencyContentFunnelStage;
  contentPrimaryKeyword: string;
  contentPrimaryCta: string;
  contentLinearIssue?: string;
}

const AGENCY_CONTENT_ASSETS_BY_PATH: Record<string, AgencyContentAssetAnalytics> = {
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
    contentAssetId: 'partner.implementation-stack.v20260518',
    contentType: 'partner-page',
    contentCluster: 'partner-implementation-lanes',
    contentIntent: 'partner-proof',
    contentAudience: 'operator evaluating vendor-neutral implementation support',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'AI implementation partner',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/cloudflare': {
    contentAssetId: 'partner.cloudflare-runtime.v20260518',
    contentType: 'partner-page',
    contentCluster: 'partner-implementation-lanes',
    contentIntent: 'partner-proof',
    contentAudience: 'operator evaluating Cloudflare-backed AI workflow infrastructure',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Cloudflare AI workflow implementation partner',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/dify': {
    contentAssetId: 'partner.dify-agent-systems.v20260518',
    contentType: 'partner-page',
    contentCluster: 'dify-governed-agent-systems',
    contentIntent: 'partner-proof',
    contentAudience: 'operator evaluating Dify implementation support',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Dify implementation partner',
    contentPrimaryCta: 'request-workflow-teardown'
  },
  '/dify/content-engine': {
    contentAssetId: 'article.dify-content-engine.v20260518',
    contentType: 'guide',
    contentCluster: 'dify-affiliate-content',
    contentIntent: 'how-to',
    contentAudience: 'agency consultant or operator building a Dify acquisition lane',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Dify affiliate content strategy',
    contentPrimaryCta: 'get-governance-checklist',
    contentLinearIssue: 'CRE-373'
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
  },
  '/dify/n8n-vs-dify': {
    contentAssetId: 'article.dify-vs-n8n.v20260518',
    contentType: 'article',
    contentCluster: 'ai-workflow-platform-comparisons',
    contentIntent: 'versus',
    contentAudience: 'operator comparing workflow automation and agent app tools',
    contentFunnelStage: 'decision',
    contentPrimaryKeyword: 'Dify vs n8n',
    contentPrimaryCta: 'request-workflow-teardown',
    contentLinearIssue: 'CRE-374'
  },
  '/notion': {
    contentAssetId: 'partner.notion-ops-workspace.v20260518',
    contentType: 'partner-page',
    contentCluster: 'partner-implementation-lanes',
    contentIntent: 'partner-proof',
    contentAudience: 'operator evaluating Notion implementation support',
    contentFunnelStage: 'consideration',
    contentPrimaryKeyword: 'Notion operations workspace consultant',
    contentPrimaryCta: 'request-workflow-teardown'
  }
};

export function getAgencyContentAssetAnalyticsMetadata(
  pathname: string
): AgencyContentAssetAnalytics | undefined {
  return AGENCY_CONTENT_ASSETS_BY_PATH[pathname];
}
