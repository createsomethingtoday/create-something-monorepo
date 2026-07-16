export type MarketingPageDecision = 'index' | 'route' | 'archive';
export type MarketingPageCluster =
  | 'home'
  | 'core-services'
  | 'conversion'
  | 'map'
  | 'control'
  | 'stack-boundary'
  | 'workflow-tool-stack'
  | 'dify'
  | 'methodology'
  | 'delegation-practice'
  | 'products'
  | 'field-reports'
  | 'proof-lab'
  | 'workflow-proof'
  | 'trust'
  | 'business-use-case'
  | 'enterprise-use-case'
  | 'about';
export type MarketingPageRole =
  | 'pillar'
  | 'support'
  | 'comparison'
  | 'implementation'
  | 'operations';
export type MarketingFunnelStage = 'discover' | 'understand' | 'evaluate' | 'implement' | 'book';
export type MarketingSelfHealingLever =
  | 'copy:heal'
  | 'search-route:sync'
  | 'canonical-route:review'
  | 'archive-route:review';

export type MarketingPageEntry = {
  path: string;
  cluster: MarketingPageCluster;
  role: MarketingPageRole;
  decision: MarketingPageDecision;
  routeTarget?: string;
  audience: string;
  funnelStage: MarketingFunnelStage;
  intent: string;
  primaryAction: string;
  requiredTerms: string[];
  requiredLinks: string[];
  schema: 'faq' | 'article' | 'page';
  search: {
    changefreq: 'daily' | 'weekly' | 'monthly';
    priority: string;
    lastmod: string;
  };
  selfHealing: MarketingSelfHealingLever[];
};

export type MarketingPageScore = {
  total: number;
  maximum: number;
  percent: number;
  status: 'strong' | 'route-review' | 'archive-review';
  checks: Array<{
    id: string;
    label: string;
    points: number;
    max: number;
    passed: boolean;
  }>;
};

export const marketingPageMinimums: Record<MarketingPageDecision, number> = {
  index: 82,
  route: 60,
  archive: 0
};

export const marketingPagePortfolio: MarketingPageEntry[] = [
  {
    path: '/',
    cluster: 'home',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams looking for a plain explanation of AI workflow systems.',
    funnelStage: 'discover',
    intent: 'Introduce the category and route readers toward workflow mapping.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['workflow', 'business operations', 'Signal', 'Decision', 'Proof'],
    requiredLinks: ['/services', '/partners', '/products', '/field-reports/template-review'],
    schema: 'faq',
    search: {
      changefreq: 'weekly',
      priority: '1.0',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/services',
    cluster: 'core-services',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams with one messy business handoff that needs controlled AI assistance.',
    funnelStage: 'book',
    intent: 'Explain the core service path: map one workflow before build work starts.',
    primaryAction: 'Map the workflow',
    requiredTerms: ['workflow', 'Map', 'Build', 'Control', 'Proof'],
    requiredLinks: ['#map-warmup'],
    schema: 'faq',
    search: {
      changefreq: 'weekly',
      priority: '0.95',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/book',
    cluster: 'conversion',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams ready to schedule a workflow mapping session.',
    funnelStage: 'book',
    intent: 'Convert a mapped workflow need into a scoped booking path.',
    primaryAction: 'Choose a time',
    requiredTerms: ['workflow', 'handoff', 'owner', 'audit trail', 'controlled path'],
    requiredLinks: ['/services'],
    schema: 'page',
    search: {
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/contact',
    cluster: 'conversion',
    role: 'support',
    decision: 'index',
    audience: 'Teams that need to describe a workflow before booking.',
    funnelStage: 'book',
    intent: 'Collect the workflow context and route the reader to the right commitment level.',
    primaryAction: 'Book a mapping session',
    requiredTerms: ['workflow', 'control path', 'commitment', 'operating lane', 'decision'],
    requiredLinks: ['/book'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/map',
    cluster: 'map',
    role: 'pillar',
    decision: 'index',
    audience: 'Visitors who want to map one workflow before a call.',
    funnelStage: 'understand',
    intent: 'Let the reader see and edit a public workflow map before booking.',
    primaryAction: 'Open canvas',
    requiredTerms: ['workflow', 'owner', 'approvals', 'systems', 'booking context'],
    requiredLinks: ['/book'],
    schema: 'page',
    search: {
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/control',
    cluster: 'control',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams that need approvals, evidence, and recovery around a live human-agent workflow.',
    funnelStage: 'evaluate',
    intent: 'Explain Control as a standalone governed-execution subscription that includes Map.',
    primaryAction: 'Talk through one workflow',
    requiredTerms: ['Control', 'Map', 'Signal', 'Decision', 'Proof'],
    requiredLinks: ['/map', '/products/signal', '/products/decision', '/products/proof'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.85',
      lastmod: '2026-07-16'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/basketball-systems-lab',
    cluster: 'proof-lab',
    role: 'pillar',
    decision: 'index',
    audience: 'Readers evaluating CREATE SOMETHING systems thinking through a public prototype.',
    funnelStage: 'discover',
    intent:
      'Show a systems prototype as proof of policy, media, health, labor, and balance tradeoffs.',
    primaryAction: 'Run',
    requiredTerms: ['system', 'policy', 'media', 'health', 'labor'],
    requiredLinks: [],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: '2026-06-21'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/proof/marketplace-workflow',
    cluster: 'workflow-proof',
    role: 'pillar',
    decision: 'index',
    audience: 'Operators evaluating a complete governed workflow before mapping their own.',
    funnelStage: 'evaluate',
    intent:
      'Show one complete Marketplace workflow from versioned map through compiled contracts, representative replay, and deterministic proof.',
    primaryAction: 'Map your workflow',
    requiredTerms: ['workflow', 'Map', 'Marketplace', 'approval', 'proof'],
    requiredLinks: ['/products'],
    schema: 'article',
    search: {
      changefreq: 'monthly',
      priority: '0.82',
      lastmod: '2026-07-11'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/stack',
    cluster: 'stack-boundary',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams deciding what they own before AI tools act across accounts.',
    funnelStage: 'understand',
    intent: 'Explain the stack boundary in workflow terms before vendor choices dominate.',
    primaryAction: 'Map the stack boundary',
    requiredTerms: ['workflow', 'approval', 'evidence', 'runbook', 'vendor'],
    requiredLinks: ['/products', '/cloudflare', '/dify'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.85',
      lastmod: '2026-07-09'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/partners',
    cluster: 'workflow-tool-stack',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams choosing the right tool path for one controlled workflow.',
    funnelStage: 'understand',
    intent:
      'Explain CREATE SOMETHING as the owned system, Cloudflare as infrastructure, and OpenAI as intelligence.',
    primaryAction: 'Map the workflow',
    requiredTerms: ['Substrate', 'OpenAI', 'Cloudflare', 'workflow', 'evidence'],
    requiredLinks: ['/products', '/cloudflare', '/stack'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.85',
      lastmod: '2026-07-09'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/methodology',
    cluster: 'methodology',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams trying to understand the method before the service path.',
    funnelStage: 'understand',
    intent: 'Explain the subtract-first method and route readers back to services.',
    primaryAction: 'How I work',
    requiredTerms: ['workflow', 'approval', 'stop', 'operator', 'control'],
    requiredLinks: ['/services'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.75',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/practice',
    cluster: 'delegation-practice',
    role: 'pillar',
    decision: 'index',
    audience: 'Accountable operators learning to transfer authority over one workflow.',
    funnelStage: 'evaluate',
    intent: 'Let practitioners map, bound, test, and review delegated work against visible evidence.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['workflow', 'authority', 'operator', 'evidence', 'proof'],
    requiredLinks: ['/methodology', '/map', '/proof/marketplace-workflow'],
    schema: 'page',
    search: {
      changefreq: 'weekly',
      priority: '0.82',
      lastmod: '2026-07-15'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/security',
    cluster: 'trust',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams evaluating access, identity, and entitlement boundaries.',
    funnelStage: 'evaluate',
    intent: 'Explain security as a workflow access chain before credentials are used.',
    primaryAction: 'Map the workflow',
    requiredTerms: ['token', 'access', 'workflow', 'approval', 'audit trail'],
    requiredLinks: ['/bearer-token-policy'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/bearer-token-policy',
    cluster: 'trust',
    role: 'support',
    decision: 'index',
    audience: 'Users and operators who need the token policy in plain terms.',
    funnelStage: 'evaluate',
    intent: 'Document bearer-token responsibilities, revocation, audit controls, and enforcement.',
    primaryAction: 'Security Contact',
    requiredTerms: ['token', 'Authorization', 'revocation', 'audit', 'policy'],
    requiredLinks: ['/security'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.65',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/cloudflare',
    cluster: 'workflow-tool-stack',
    role: 'support',
    decision: 'index',
    audience: 'Teams whose workflow needs owned runtime routes and durable state.',
    funnelStage: 'evaluate',
    intent: 'Explain Cloudflare as the runtime substrate for controlled workflow routes.',
    primaryAction: 'Map the runtime',
    requiredTerms: ['Cloudflare', 'Workers', 'D1', 'workflow', 'evidence'],
    requiredLinks: ['/partners', '/stack'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/dify',
    cluster: 'dify',
    role: 'pillar',
    decision: 'archive',
    routeTarget: '/stack',
    audience: 'Teams evaluating Dify for controlled AI workflow systems.',
    funnelStage: 'understand',
    intent: 'Explain the Dify workflow path and route readers into the cluster.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['Dify', 'MCP', 'Policy OS', 'approval', 'evidence'],
    requiredLinks: [
      '/dify/mcp-control-plane',
      '/dify/agent-eval-gates',
      '/dify/template-marketplace-proof',
      '/stack'
    ],
    schema: 'faq',
    search: {
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: '2026-07-04'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/dify/mcp-control-plane',
    cluster: 'dify',
    role: 'support',
    decision: 'archive',
    routeTarget: '/stack',
    audience: 'Builders and operators who need Dify connected to governed tools.',
    funnelStage: 'understand',
    intent: 'Teach the operating model: Dify surface, MCP boundary, Policy OS rule.',
    primaryAction: 'Request workflow teardown',
    requiredTerms: ['Dify', 'MCP', 'Policy OS', 'approval', 'evidence'],
    requiredLinks: ['/dify', '/dify/agent-eval-gates'],
    schema: 'article',
    search: {
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: '2026-06-22'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/dify/agent-eval-gates',
    cluster: 'dify',
    role: 'operations',
    decision: 'archive',
    routeTarget: '/stack',
    audience: 'Operators deciding whether a Dify workflow is ready to run.',
    funnelStage: 'evaluate',
    intent: 'Show the gates that prove a Dify workflow can operate safely.',
    primaryAction: 'Request workflow teardown',
    requiredTerms: ['Dify', 'Langfuse', 'runtime trace', 'forbidden tool', 'secret refusal'],
    requiredLinks: ['/dify', '/dify/mcp-control-plane'],
    schema: 'article',
    search: {
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: '2026-06-23'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/dify/ship-dify-app-with-mcp-tools',
    cluster: 'dify',
    role: 'implementation',
    decision: 'archive',
    routeTarget: '/stack',
    audience: 'Teams ready to package one Dify workflow with scoped tools.',
    funnelStage: 'implement',
    intent: 'Give a practical shipping checklist for Dify plus MCP systems.',
    primaryAction: 'Book workflow mapping',
    requiredTerms: ['Dify', 'MCP', 'Policy OS', 'runbook', 'proof'],
    requiredLinks: ['/dify', '/dify/mcp-control-plane', '/dify/agent-eval-gates'],
    schema: 'article',
    search: {
      changefreq: 'weekly',
      priority: '0.85',
      lastmod: '2026-07-04'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/dify/template-marketplace-proof',
    cluster: 'dify',
    role: 'implementation',
    decision: 'archive',
    routeTarget: '/stack',
    audience: 'Teams turning a governed Dify workflow into a reusable template.',
    funnelStage: 'implement',
    intent:
      'Show how the first Dify marketplace submission should package Policy OS, MCP boundaries, setup steps, and proof.',
    primaryAction: 'Book workflow mapping',
    requiredTerms: ['Dify', 'Template Marketplace', 'Creator Center', 'Policy OS', 'MCP'],
    requiredLinks: ['/dify', '/dify/ship-dify-app-with-mcp-tools', '/dify/agent-eval-gates'],
    schema: 'article',
    search: {
      changefreq: 'weekly',
      priority: '0.82',
      lastmod: '2026-07-04'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/products',
    cluster: 'products',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams evaluating the product surfaces behind controlled AI workflow work.',
    funnelStage: 'evaluate',
    intent:
      'Explain Map and Control as standalone products, Build as the implementation service, and Signal, Decision, and Proof as Control surfaces.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['workflow', 'Map', 'Build', 'Control', 'Proof'],
    requiredLinks: [],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.75',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/products/ground',
    cluster: 'products',
    role: 'support',
    decision: 'index',
    audience: 'Developers evaluating Ground as proof of verify-before-claiming behavior.',
    funnelStage: 'evaluate',
    intent: 'Show Ground as a product proof surface for evidence-backed code analysis.',
    primaryAction: 'Copy command',
    requiredTerms: ['Ground', 'verify', 'claim', 'MCP', 'evidence'],
    requiredLinks: ['/products'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.65',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/products/signal',
    cluster: 'products',
    role: 'support',
    decision: 'index',
    audience: 'Teams that need proactive notification when product, API, or process updates affect reviewers.',
    funnelStage: 'evaluate',
    intent: 'Explain Signal as the Control inbox that routes updates into Map, Decision, and Proof.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['Signal', 'inbox', 'API updates', 'Map', 'Proof'],
    requiredLinks: ['/map', '/products/decision', '/products/proof', '/products'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.68',
      lastmod: '2026-06-30'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/products/decision',
    cluster: 'products',
    role: 'support',
    decision: 'index',
    audience: 'Teams designing human-in-the-loop review queues for agents and governed workflow actions.',
    funnelStage: 'evaluate',
    intent: 'Explain Decision as the queue that turns Signals into approval, policy action, stop states, and Proof.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['Decision', 'queue', 'human-in-the-loop', 'Signal', 'Proof'],
    requiredLinks: ['/products/signal', '/map', '/products/proof', '/products'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.68',
      lastmod: '2026-06-30'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/products/proof',
    cluster: 'products',
    role: 'support',
    decision: 'index',
    audience: 'Teams that need an inspectable ledger for app governance decisions and workflow outcomes.',
    funnelStage: 'evaluate',
    intent: 'Explain Proof as the ledger surface that records evidence, outcomes, receipts, and rollback notes.',
    primaryAction: 'Map one workflow',
    requiredTerms: ['Proof', 'ledger', 'audit trail', 'Map', 'Decision'],
    requiredLinks: ['/products/signal', '/products/decision', '/map', '/products'],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.68',
      lastmod: '2026-06-30'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/products/loom',
    cluster: 'products',
    role: 'support',
    decision: 'route',
    routeTarget: '/products',
    audience: 'Readers who land on the historical Loom MCP proof page.',
    funnelStage: 'evaluate',
    intent: 'Preserve Loom as historical proof while routing active product proof to /products.',
    primaryAction: 'Proof and Receipts',
    requiredTerms: ['Loom', 'archive', 'Linear', 'evidence', 'receipts'],
    requiredLinks: ['/products'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.65',
      lastmod: '2026-06-28'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'archive-route:review']
  },
  {
    path: '/field-reports',
    cluster: 'field-reports',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams evaluating whether CREATE SOMETHING workflow claims survive inspection.',
    funnelStage: 'evaluate',
    intent: 'Index measured workflow results, failed gates, evidence sources, and remaining questions.',
    primaryAction: 'Read the first report',
    requiredTerms: ['Field Reports', 'measured', 'evidence', 'human', 'result'],
    requiredLinks: ['/field-reports/template-review'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.82',
      lastmod: '2026-07-10'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/field-reports/template-review',
    cluster: 'field-reports',
    role: 'support',
    decision: 'index',
    audience: 'Operations and review teams evaluating evidence-assisted human judgment.',
    funnelStage: 'evaluate',
    intent: 'Show what the governed template-review workflow proved, failed, and still needs measured.',
    primaryAction: 'Inspect the result',
    requiredTerms: ['evidence', 'reviewer', 'synthetic', 'promotion blocked', 'time savings'],
    requiredLinks: ['/field-reports'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.86',
      lastmod: '2026-07-12'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  },
  {
    path: '/use-cases/business',
    cluster: 'business-use-case',
    role: 'pillar',
    decision: 'index',
    audience: 'Small teams carrying repeated workflow handoffs manually.',
    funnelStage: 'book',
    intent: 'Explain the small-team workflow pilot path in natural language.',
    primaryAction: 'Bring the workflow',
    requiredTerms: ['workflow', 'pilot', 'runbook', 'approval', 'evidence'],
    requiredLinks: [],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/use-cases/enterprise',
    cluster: 'enterprise-use-case',
    role: 'pillar',
    decision: 'index',
    audience: 'Teams whose AI-assisted workflows already affect operations or risk.',
    funnelStage: 'book',
    intent: 'Explain the enterprise Control path after the first workflow is live.',
    primaryAction: 'Bring the workflow',
    requiredTerms: ['Control', 'workflow', 'approval', 'evidence', 'reliability'],
    requiredLinks: [],
    schema: 'faq',
    search: {
      changefreq: 'monthly',
      priority: '0.8',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync']
  },
  {
    path: '/about',
    cluster: 'about',
    role: 'pillar',
    decision: 'index',
    audience: 'Readers who want to understand the operator behind CREATE SOMETHING .agency.',
    funnelStage: 'evaluate',
    intent: 'Explain Micah Johnson and route readers back to the workflow service path.',
    primaryAction: 'Book',
    requiredTerms: ['workflow', 'operator', 'judgment', 'evidence', 'trust'],
    requiredLinks: ['/services'],
    schema: 'page',
    search: {
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: '2026-06-19'
    },
    selfHealing: ['copy:heal', 'search-route:sync', 'canonical-route:review']
  }
];

export function scoreMarketingPage(
  entry: MarketingPageEntry,
  source: string,
  options: { plainLanguagePassed?: boolean } = {}
): MarketingPageScore {
  const plainLanguagePassed = options.plainLanguagePassed ?? true;
  const checks = [
    {
      id: 'route-job',
      label: 'Page has a defined funnel job',
      points: entry.intent && entry.audience && entry.funnelStage ? 12 : 0,
      max: 12,
      passed: Boolean(entry.intent && entry.audience && entry.funnelStage)
    },
    {
      id: 'seo',
      label: 'Page declares SEO title and description',
      points: hasSeoProp(source, 'title') && hasSeoProp(source, 'description') ? 14 : 0,
      max: 14,
      passed: hasSeoProp(source, 'title') && hasSeoProp(source, 'description')
    },
    {
      id: 'schema',
      label: `Page uses ${entry.schema} schema`,
      points:
        entry.schema === 'faq'
          ? /faqItems/.test(source)
            ? 12
            : 0
          : entry.schema === 'article'
            ? /ogType="article"/.test(source) && /publishedTime=/.test(source)
              ? 12
              : 0
            : /<SEO[\s\S]*?>/.test(source)
              ? 12
              : 0,
      max: 12,
      passed:
        entry.schema === 'faq'
          ? /faqItems/.test(source)
          : entry.schema === 'article'
            ? /ogType="article"/.test(source) && /publishedTime=/.test(source)
            : /<SEO[\s\S]*?>/.test(source)
    },
    {
      id: 'primary-action',
      label: 'Page includes a direct next action',
      points:
        source.includes('agencyCoreMessaging') || source.includes(entry.primaryAction) ? 14 : 0,
      max: 14,
      passed: source.includes('agencyCoreMessaging') || source.includes(entry.primaryAction)
    },
    {
      id: 'routing',
      label: 'Page routes to related cluster pages',
      points: entry.requiredLinks.every(
        (link) => source.includes(`"${link}"`) || source.includes(`href: '${link}'`)
      )
        ? 14
        : 0,
      max: 14,
      passed: entry.requiredLinks.every(
        (link) => source.includes(`"${link}"`) || source.includes(`href: '${link}'`)
      )
    },
    {
      id: 'terms',
      label: 'Page contains required intent terms',
      points: entry.requiredTerms.every((term) => source.toLowerCase().includes(term.toLowerCase()))
        ? 14
        : 0,
      max: 14,
      passed: entry.requiredTerms.every((term) => source.toLowerCase().includes(term.toLowerCase()))
    },
    {
      id: 'plain-language',
      label: 'Page avoids known internal marketing language',
      points: plainLanguagePassed ? 12 : 0,
      max: 12,
      passed: plainLanguagePassed
    },
    {
      id: 'route-decision',
      label: 'Indexable pages have search metadata',
      points:
        entry.decision === 'index' &&
        entry.search.changefreq &&
        entry.search.priority &&
        entry.search.lastmod
          ? 8
          : entry.decision !== 'index' && entry.routeTarget
            ? 8
            : 0,
      max: 8,
      passed:
        (entry.decision === 'index' &&
          Boolean(entry.search.changefreq && entry.search.priority && entry.search.lastmod)) ||
        (entry.decision !== 'index' && Boolean(entry.routeTarget))
    }
  ];

  const total = checks.reduce((sum, check) => sum + check.points, 0);
  const maximum = checks.reduce((sum, check) => sum + check.max, 0);
  const percent = Math.round((total / maximum) * 100);

  return {
    total,
    maximum,
    percent,
    status:
      percent >= marketingPageMinimums.index
        ? 'strong'
        : percent >= marketingPageMinimums.route
          ? 'route-review'
          : 'archive-review',
    checks
  };
}

function hasSeoProp(source: string, propName: string): boolean {
  return new RegExp(`<SEO[\\s\\S]*?(?:\\{${propName}\\}|${propName}=)`).test(source);
}
