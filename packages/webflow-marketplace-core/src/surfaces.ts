export const MARKETPLACE_SURFACE_TYPES = [
  'hosted_app',
  'mcp',
  'designer_extension',
  'automation_worker',
  'admin_tooling',
] as const;

export type MarketplaceSurfaceType = (typeof MARKETPLACE_SURFACE_TYPES)[number];

export const MARKETPLACE_SURFACE_IDS = [
  'webflow_app_form_cloud',
  'webflow_dashboard_cloud',
  'webflow_mcp',
  'webflow_template_review_mcp',
  'webflow_site_analyzer_mcp',
  'webflow_review_extension',
  'webflow_apps_admin',
  'webflow_automation',
] as const;

export type MarketplaceSurfaceId = (typeof MARKETPLACE_SURFACE_IDS)[number];

export type MarketplaceSurfaceDescriptor = {
  id: MarketplaceSurfaceId;
  type: MarketplaceSurfaceType;
  owner: string;
  users: string;
  role: string;
  deployTarget: string;
  sourceOfTruth: string[];
};

export const MARKETPLACE_SURFACES: MarketplaceSurfaceDescriptor[] = [
  {
    id: 'webflow_app_form_cloud',
    type: 'hosted_app',
    owner: 'Marketplace Senior Systems Architect',
    users: 'App submitters and Marketplace ops',
    role: 'Public app submission surface',
    deployTarget: 'Webflow Cloud compatible Next.js app',
    sourceOfTruth: ['submission storage', 'webhook delivery state', 'file uploads'],
  },
  {
    id: 'webflow_dashboard_cloud',
    type: 'hosted_app',
    owner: 'Marketplace Senior Systems Architect',
    users: 'Template creators and reviewers',
    role: 'Creator dashboard and template intake',
    deployTarget: 'Webflow Cloud compatible Next.js app',
    sourceOfTruth: ['creator dashboard state', 'template intake workflow'],
  },
  {
    id: 'webflow_mcp',
    type: 'mcp',
    owner: 'Marketplace engineering',
    users: 'Agents and internal operators',
    role: 'Marketplace MCP tool surface',
    deployTarget: 'MCP server runtime',
    sourceOfTruth: ['agent tool contracts'],
  },
  {
    id: 'webflow_template_review_mcp',
    type: 'mcp',
    owner: 'Marketplace engineering',
    users: 'Template review operators and agents',
    role: 'Template review MCP tools',
    deployTarget: 'MCP server runtime',
    sourceOfTruth: ['template review metrics and workflows'],
  },
  {
    id: 'webflow_site_analyzer_mcp',
    type: 'mcp',
    owner: 'Marketplace engineering',
    users: 'Agents and site analysis workflows',
    role: 'Designer and site analysis tooling',
    deployTarget: 'MCP server runtime',
    sourceOfTruth: ['site analysis recipes and scan outputs'],
  },
  {
    id: 'webflow_review_extension',
    type: 'designer_extension',
    owner: 'Marketplace engineering',
    users: 'Marketplace reviewers',
    role: 'Reviewer-side Designer Extension surface',
    deployTarget: 'Webflow Designer Extension',
    sourceOfTruth: ['review workflow actions'],
  },
  {
    id: 'webflow_apps_admin',
    type: 'admin_tooling',
    owner: 'Marketplace engineering',
    users: 'Apps Marketplace admins',
    role: 'Administrative dashboards and audits',
    deployTarget: 'Dashboard and extension tooling',
    sourceOfTruth: ['admin audits and reports'],
  },
  {
    id: 'webflow_automation',
    type: 'automation_worker',
    owner: 'Marketplace engineering',
    users: 'Internal automation operators',
    role: 'Deterministic workflow and Airtable automation layer',
    deployTarget: 'Worker and Airtable automation runtime',
    sourceOfTruth: ['automation jobs and sync behavior'],
  },
];
