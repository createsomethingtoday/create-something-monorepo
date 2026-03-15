/**
 * Three-Tier Framework — Case Study Examples
 *
 * Real systems analyzed through the framework. Served via
 * framework://examples/* resource URIs.
 * Concrete examples teach better than abstract definitions.
 */

export interface CaseStudy {
  name: string;
  slug: string;
  domain: string;
  description: string;
  components: {
    name: string;
    tier: 'database' | 'automation' | 'judgment';
    mcpPrimitive?: string;
    role: string;
  }[];
  crossCutting: {
    concern: string;
    implementation: string;
  }[];
  recursiveProperty: string | null;
  policyArtifacts: string[];
  keyInsight: string;
  tierCoverage: {
    database: boolean;
    automation: boolean;
    judgment: boolean;
  };
}

export const CASE_STUDIES: Record<string, CaseStudy> = {
  'workway': {
    name: 'WORKWAY — Construction Automation',
    slug: 'workway',
    domain: 'Construction project management via Procore',
    description: 'The Automation Layer for Construction. Connects Procore to AI via MCP, with Skills that draft RFIs, summarize daily logs, and flag compliance issues.',
    components: [
      { name: 'Procore API data', tier: 'database', mcpPrimitive: 'Resources', role: 'Projects, RFIs, daily logs, submittals, change orders as structured data' },
      { name: 'Procore MCP Server', tier: 'automation', mcpPrimitive: 'Tools', role: 'Tools for reading/writing Procore data, managing workflows' },
      { name: 'Draft RFI Skill', tier: 'automation', mcpPrimitive: 'Tools', role: 'Generate RFIs from specs and conversation context' },
      { name: 'Daily Log Summary Skill', tier: 'automation', mcpPrimitive: 'Tools', role: 'Synthesize daily logs into executive reports' },
      { name: 'Compliance Policy', tier: 'judgment', mcpPrimitive: 'Prompts', role: 'Construction compliance rules, safety standards, approval gates' },
      { name: 'Human Approval Gates', tier: 'judgment', role: 'Project manager reviews before RFIs are submitted' },
      { name: 'D1 Database', tier: 'database', role: 'Cached Procore data, sync state, agent memory' },
      { name: 'Cloudflare Workers', tier: 'automation', role: 'Edge execution for MCP server and Skills' }
    ],
    crossCutting: [
      { concern: 'Touchpoints', implementation: 'MCP server endpoints, Slack notifications, email alerts' },
      { concern: 'Artifacts', implementation: 'RFI objects, daily log summaries, compliance flags as typed payloads' },
      { concern: 'Orchestration', implementation: 'Workflow triggers for daily log processing, webhook handlers for Procore events' },
      { concern: 'Insight', implementation: 'Execution traces, approval audit logs, confidence scores on generated content' }
    ],
    recursiveProperty: 'The Draft RFI Skill could use sampling to ask the LLM "does this RFI meet compliance standards?" before returning it — Automation requesting Judgment mid-execution.',
    policyArtifacts: [
      'Construction safety standards (immutable)',
      'RFI formatting templates (mutable, versioned)',
      'Approval thresholds by project value (contextual)',
      'Daily log summary style preferences (mutable)'
    ],
    keyInsight: 'The entry point is connectivity (MCP to Procore), not intelligence. Trust is established through the Database tier before the Automation tier adds value. Skills are the upsell, not the starting point.',
    tierCoverage: { database: true, automation: true, judgment: true }
  },

  'gmail-sync': {
    name: 'Half Dozen Gmail Sync',
    slug: 'gmail-sync',
    domain: 'Email extraction and CRM sync',
    description: 'MCP server that syncs Gmail emails to Notion, with multi-user OAuth support. Deployed as both a stdio server and a Cloudflare Worker with Streamable HTTP transport.',
    components: [
      { name: 'Gmail API', tier: 'database', mcpPrimitive: 'Resources', role: 'Source data — emails, threads, labels from authorized accounts' },
      { name: 'Notion Database', tier: 'database', role: 'Target persistence — contacts, interactions stored as Notion pages' },
      { name: 'KV Namespace', tier: 'database', role: 'OAuth token storage for multi-user Gmail authorization' },
      { name: 'search_emails tool', tier: 'automation', mcpPrimitive: 'Tools', role: 'Query Gmail with search syntax, return structured results' },
      { name: 'sync_email tool', tier: 'automation', mcpPrimitive: 'Tools', role: 'Extract email, find/create contact, sync to Notion with dedup' },
      { name: 'find_contact tool', tier: 'automation', mcpPrimitive: 'Tools', role: 'Search Notion contacts by name or email' },
      { name: 'McpAgent Durable Object', tier: 'automation', role: 'Session state management for Streamable HTTP transport' },
      { name: 'OAuth flow', tier: 'judgment', role: 'User-controlled authorization — which accounts can be accessed' }
    ],
    crossCutting: [
      { concern: 'Touchpoints', implementation: 'Streamable HTTP (/mcp), SSE (/sse), OAuth callback (/callback)' },
      { concern: 'Artifacts', implementation: 'Email objects, contact records, sync results as typed payloads' },
      { concern: 'Orchestration', implementation: 'OAuth redirect flow, email-to-Notion sync pipeline' },
      { concern: 'Insight', implementation: 'Sync results with counts (synced/skipped/failed), recording URLs from Steel sessions' }
    ],
    recursiveProperty: null,
    policyArtifacts: [
      'Gmail OAuth scopes (immutable — readonly access only)',
      'Notion property mapping (mutable — which fields map where)',
      'Dedup strategy (contextual — skip vs update existing)'
    ],
    keyInsight: 'This server is Tools-only — no Resources or Prompts. The framework reveals the gap: Gmail data could be exposed as Resources (application-controlled), and sync strategy preferences could be Prompts (user-controlled). Currently the agent must call tools to get data rather than reading it directly.',
    tierCoverage: { database: false, automation: true, judgment: false }
  },

  'three-tier-framework': {
    name: 'Three-Tier Framework MCP Server (this server)',
    slug: 'three-tier-framework',
    domain: 'Agent system architecture and design',
    description: 'The framework itself as an MCP server — the first to use all three MCP primitives. Demonstrates its own thesis by mapping Resources to Database, Tools to Automation, and Prompts to Judgment.',
    components: [
      { name: 'Tier definitions', tier: 'database', mcpPrimitive: 'Resources', role: 'Framework definitions as structured JSON (framework://definitions)' },
      { name: 'Mapping tables', tier: 'database', mcpPrimitive: 'Resources', role: 'MCP, Cloudflare, Automotive convergence tables' },
      { name: 'Framework document', tier: 'database', mcpPrimitive: 'Resources', role: 'Full v1.3 document as markdown (framework://full)' },
      { name: 'classify_component', tier: 'automation', mcpPrimitive: 'Tools', role: 'Classify components into tiers with confidence scores' },
      { name: 'debug_system', tier: 'automation', mcpPrimitive: 'Tools', role: 'Apply causality heuristic to failures' },
      { name: 'analyze_mcp_server', tier: 'automation', mcpPrimitive: 'Tools', role: 'Map MCP servers to framework tiers, find gaps' },
      { name: 'architecture_review', tier: 'judgment', mcpPrimitive: 'Prompts', role: 'Template for reviewing systems against the framework' },
      { name: 'mcp_design', tier: 'judgment', mcpPrimitive: 'Prompts', role: 'Template for designing MCP servers using the framework' }
    ],
    crossCutting: [
      { concern: 'Touchpoints', implementation: 'Streamable HTTP (/mcp), SSE (/sse), stdio (local dev)' },
      { concern: 'Artifacts', implementation: 'Classification results, diagnostic checklists, analysis reports as typed JSON' },
      { concern: 'Orchestration', implementation: 'Sampling feedback loop — tools optionally request LLM validation' },
      { concern: 'Insight', implementation: 'Validation field in tool responses shows whether LLM agreed with heuristic' }
    ],
    recursiveProperty: 'Tools with validate=true use MCP sampling to ask the LLM "was this classification correct?" — Automation requesting Judgment. The recursive property is not just described by this server; it is demonstrated by it.',
    policyArtifacts: [
      'Framework definitions (immutable — the ontology itself)',
      'Heuristic signal words (mutable — can be refined as accuracy data accumulates)',
      'Sampling system prompt (mutable — "Validate Three-Tier Framework classifications")',
      'Confidence thresholds (contextual — what counts as "high confidence" depends on use case)'
    ],
    keyInsight: 'This server is recursively self-referential: it uses all three MCP primitives in exactly the tier mapping that the framework describes. The framework is not an abstraction imposed on MCP — it is the structure MCP already assumes, made explicit and executable.',
    tierCoverage: { database: true, automation: true, judgment: true }
  },

  'devops-platform': {
    name: 'DevOps Platform (Reference Architecture)',
    slug: 'devops-platform',
    domain: 'Infrastructure and deployment automation',
    description: 'A reference architecture showing how a typical DevOps platform maps to the Three-Tier Framework. Not a real system but a composite of common patterns.',
    components: [
      { name: 'Terraform state', tier: 'database', role: 'Infrastructure state files — what infrastructure exists' },
      { name: 'Container registry', tier: 'database', role: 'Docker images — versioned build artifacts' },
      { name: 'Secrets manager (Vault)', tier: 'database', role: 'Encrypted credentials, API keys, certificates' },
      { name: 'CI/CD pipeline (GitHub Actions)', tier: 'automation', role: 'Build, test, deploy workflows triggered by commits' },
      { name: 'ArgoCD', tier: 'automation', role: 'GitOps continuous delivery — syncs desired state to clusters' },
      { name: 'Kubernetes operators', tier: 'automation', role: 'Reconciliation loops maintaining desired state' },
      { name: 'PagerDuty', tier: 'judgment', role: 'Escalation policies — who gets notified, when, how urgently' },
      { name: 'OPA (Open Policy Agent)', tier: 'judgment', role: 'Policy-as-code — admission control, RBAC, resource quotas' },
      { name: 'Datadog', tier: 'judgment', role: 'Observability — but also alerting thresholds which are judgment calls' }
    ],
    crossCutting: [
      { concern: 'Touchpoints', implementation: 'GitHub webhooks, Slack alerts, PagerDuty pages, Grafana dashboards' },
      { concern: 'Artifacts', implementation: 'Helm charts, Docker images, Terraform plans, deployment manifests' },
      { concern: 'Orchestration', implementation: 'CI/CD pipelines, GitOps sync loops, cron-based scaling' },
      { concern: 'Insight', implementation: 'Datadog APM, distributed tracing, deployment frequency metrics' }
    ],
    recursiveProperty: 'A deployment pipeline that encounters a failing canary could use sampling to ask "should I roll back?" — Automation requesting Judgment based on real-time metrics. This is currently done by static thresholds, but could be made adaptive.',
    policyArtifacts: [
      'OPA policies (immutable safety boundaries, mutable resource quotas)',
      'PagerDuty escalation rules (contextual — severity-dependent)',
      'Canary deployment thresholds (mutable — error rate %, latency percentile)',
      'RBAC role definitions (immutable security, mutable permissions)',
      'Resource quotas (contextual — varies by namespace and team)'
    ],
    keyInsight: 'Datadog sits at the boundary between Automation and Judgment. Its monitoring is Insight (cross-cutting), but its alerting thresholds are Judgment calls that determine what triggers action. This boundary blurriness is where the most interesting design decisions live.',
    tierCoverage: { database: true, automation: true, judgment: true }
  }
};

export const CASE_STUDY_LIST = Object.values(CASE_STUDIES).map(cs => ({
  name: cs.name,
  slug: cs.slug,
  domain: cs.domain,
  tierCoverage: cs.tierCoverage,
  keyInsight: cs.keyInsight
}));
