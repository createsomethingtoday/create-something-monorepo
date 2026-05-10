export type PublicMcpTrustCard = {
  id: string;
  name: string;
  endpoint: string;
  serverInfo: string;
  toolCount: number;
  tier: 'Database' | 'Automation' | 'Judgment';
  scope: string;
  auth: 'No public auth required' | 'Auth required';
  status: 'Verified';
};

export const publicMcpTrustCards: PublicMcpTrustCard[] = [
  {
    id: 'create-something',
    name: 'CREATE SOMETHING Content',
    endpoint: 'https://mcp.createsomething.ltd/mcp',
    serverInfo: 'create-something@1.0.0',
    toolCount: 5,
    tier: 'Database',
    scope: 'Public methodology, content, and CREATE SOMETHING source material.',
    auth: 'No public auth required',
    status: 'Verified'
  },
  {
    id: 'three-tier-framework',
    name: 'Three-Tier Framework',
    endpoint: 'https://framework.mcp.createsomething.agency/mcp',
    serverInfo: 'three-tier-framework@1.0.0',
    toolCount: 6,
    tier: 'Judgment',
    scope: 'Database, Automation, and Judgment review language as an MCP surface.',
    auth: 'No public auth required',
    status: 'Verified'
  },
  {
    id: 'playbook',
    name: 'Playbook',
    endpoint: 'https://playbook.mcp.createsomething.ltd/mcp',
    serverInfo: 'playbook@1.5.0',
    toolCount: 14,
    tier: 'Automation',
    scope: 'Workflow playbooks, setup guidance, host playbooks, and MCP catalog support.',
    auth: 'No public auth required',
    status: 'Verified'
  }
];

export const publicGuideAgent = {
  id: 'create-something-guide-agent',
  name: 'CREATE SOMETHING Guide Agent',
  publicUrl: 'https://createsomething.agency/mcp-trust-catalog#create-something-guide-agent',
  localPath: '/mcp-trust-catalog#create-something-guide-agent',
  runtime: 'Dify',
  audience: 'Public',
  status: 'Published and smoke-covered',
  model: 'gpt-5.4',
  policyPack: 'public-create-something-guide.v1',
  evalSuite: 'braintrust:eval:dify:guide',
  scope:
    'Read-only public guide for CREATE SOMETHING MCPs, the Three-Tier Framework, and playbook setup patterns.',
  boundary:
    'No MCP tools are enabled. It does not claim private access to registries, Dify Studio, Linear, Notion, Cloudflare, or Infisical.',
  difyWebAppTokenSource: 'Dify Studio Publish -> Embed',
  serviceApiBaseUrl: 'https://api.dify.ai/v1'
};

export const publicTrustListingCopy = {
  headline: 'Public MCP trust catalog for CREATE SOMETHING',
  shortDescription:
    'Three no-auth public MCP endpoints plus a read-only Dify guide agent, all mapped to Database, Automation, and Judgment.',
  longDescription:
    'CREATE SOMETHING publishes a small, inspectable public trust catalog so builders can see which MCP surfaces are public, what each surface is allowed to expose, and which evidence checks back the catalog. The guide agent explains the same model without private runtime access or enabled tools.',
  bullets: [
    'Public endpoints are verified through no-auth MCP initialize and tools/list probes.',
    'Registry metadata marks included trust cards as direct public catalog entries.',
    'The guide agent is read-only and refuses credentials, bearer tokens, internal URLs, and private customer data.',
    'Private Hub, Exa, Notion, Linear, and telemetry surfaces are intentionally outside this public launch surface.'
  ]
};
