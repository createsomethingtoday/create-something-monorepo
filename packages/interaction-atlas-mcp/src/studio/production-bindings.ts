import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { readSession, writeSession } from './store.js';
import type {
  AtlasCanvasNode,
  AtlasNodeSync,
  AtlasPrimitiveBinding,
  AtlasPrimitiveBindingCheck,
  AtlasPrimitiveSyncStatus,
  AtlasSession
} from './types.js';

export type AtlasProductionBindingProfile = 'template-system';

export type AtlasHealSummary = {
  profile: AtlasProductionBindingProfile;
  checkedAt: string;
  nodesChecked: number;
  bindingsChecked: number;
  synced: number;
  partial: number;
  missing: number;
  unbound: number;
};

export type AtlasHealResult = {
  profile: AtlasProductionBindingProfile;
  summary: AtlasHealSummary;
  session: AtlasSession;
};

const TEMPLATE_SYSTEM_BINDINGS: Record<string, AtlasPrimitiveBinding[]> = {
  actor_template_creator: [
    binding(
      'template-submission-readme',
      'repo_path',
      'Template submission app contract',
      'apps/marketplace-template-submission-cloud/README.md',
      'Public creator intake + template submission form'
    )
  ],
  human_marketplace_reviewer: [
    binding(
      'template-review-human-boundary',
      'policy',
      'Reviewer-owned write boundary',
      'packages/webflow-template-review-mcp/README.md',
      'reviewer-safe workflow helpers'
    )
  ],
  actor_cs_operator: [
    binding(
      'marketplace-delivery-index',
      'repo_path',
      'Marketplace delivery packet',
      'docs/deliveries/webflow-marketplace/README.md',
      'Agent instructions, validator logic, and review MCP guardrails'
    )
  ],
  ai_template_review_hub: [
    binding(
      'dify-template-review-hub-inventory',
      'dify_agent',
      'Dify Template Review Hub inventory',
      'config/dify/inventory.json',
      '"template-review-hub"'
    ),
    binding(
      'template-review-hub-dsl',
      'dify_agent',
      'Dify Template Review Hub DSL',
      'config/dify-agents/template-review-hub.dify.yml',
      'template_review_format_agent_review_feedback'
    )
  ],
  ai_bettermode_creator_agent: [
    binding(
      'bettermode-creator-agent-dsl',
      'dify_agent',
      'Bettermode creator Dify agent',
      'config/dify-agents/bettermode-marketplace-creator-agent.dify.yml',
      'Bettermode Marketplace Creator Agent'
    ),
    binding(
      'bettermode-creator-mcp-registry',
      'mcp_server',
      'Bettermode Creator MCP registry entry',
      'config/mcp-hub/registry.json',
      '"bettermode-creator"'
    )
  ],

  data_airtable_assets: [
    binding(
      'airtable-assets-table',
      'airtable_table',
      'Airtable Assets table',
      'packages/webflow-template-review-mcp/README.md',
      'tblRwzpWoLgE9MrUm'
    ),
    binding(
      'airtable-asset-versions-table',
      'airtable_table',
      'Airtable Asset Versions table',
      'packages/webflow-template-review-mcp/README.md',
      'tblHxZ2hgSFLZxsZu'
    ),
    binding(
      'airtable-asset-releases-table',
      'airtable_table',
      'Airtable Asset Releases table',
      'packages/webflow-template-review-mcp/README.md',
      'tblhLAXcJiXrkZxUL'
    )
  ],
  data_webflow_cms: [
    binding(
      'webflow-template-collection',
      'config',
      'Webflow template collection id',
      'packages/webflow-template-search/wrangler.toml',
      'WEBFLOW_TEMPLATE_COLLECTION_ID'
    ),
    binding(
      'webflow-template-site',
      'config',
      'Webflow template site id',
      'packages/webflow-template-search/wrangler.toml',
      'WEBFLOW_TEMPLATE_ASSET_SITE_ID'
    )
  ],
  data_d1_search_index: [
    binding(
      'template-search-d1',
      'cloudflare_d1',
      'Template search D1 database',
      'packages/webflow-template-search/wrangler.toml',
      'database_name = "webflow-template-search"'
    )
  ],
  data_r2_submission_uploads: [
    binding(
      'dashboard-uploads-r2',
      'cloudflare_r2',
      'Dashboard uploads R2 bucket',
      'apps/webflow-dashboard-cloud/wrangler.json',
      '"bucket_name": "webflow-dashboard-cloud-uploads"'
    ),
    binding(
      'validator-result-artifacts-r2',
      'cloudflare_r2',
      'Validator result artifacts R2 bucket',
      'packages/webflow-template-validation/worker/wrangler.jsonc',
      '"bucket_name": "validator-result-artifacts"'
    )
  ],
  data_review_receipt: [
    binding(
      'agent-feedback-script',
      'script',
      'Template Review Hub agent feedback runner',
      'scripts/template-review-hub-agent-feedback.ts',
      'template_review_save_agent_feedback'
    ),
    binding(
      'agent-feedback-formatter',
      'policy',
      'Agent review feedback formatter',
      'packages/webflow-template-review-mcp/README.md',
      'template_review_format_agent_review_feedback'
    )
  ],

  system_submission_cloud: [
    binding(
      'submission-cloud-app',
      'webflow_cloud_app',
      'Marketplace submission Cloud app',
      'apps/marketplace-template-submission-cloud/wrangler.json',
      '"name": "marketplace-template-submission-cloud"'
    ),
    binding(
      'submission-webflow-cloud',
      'webflow_cloud_app',
      'Submission Webflow Cloud framework',
      'apps/marketplace-template-submission-cloud/webflow.json',
      '"framework": "nextjs"'
    )
  ],
  system_validator_worker: [
    binding(
      'validator-worker',
      'cloudflare_worker',
      'Webflow Way Validator worker',
      'packages/webflow-template-validation/worker/wrangler.jsonc',
      '"name": "validation-worker"'
    ),
    binding(
      'validator-app-readme',
      'repo_path',
      'Validator app submission artifacts',
      'packages/webflow-template-validation/README.md',
      'Validator app submission artifacts'
    )
  ],
  system_review_mcp: [
    binding(
      'template-review-mcp-worker',
      'cloudflare_worker',
      'Template Review MCP worker',
      'packages/webflow-template-review-mcp/worker/wrangler.toml',
      'name = "webflow-template-review-mcp"'
    ),
    binding(
      'template-review-mcp-registry',
      'mcp_server',
      'Template Review MCP registry entry',
      'config/mcp-hub/registry.json',
      '"webflow-template-review-mcp"'
    )
  ],
  system_hub_mcp_broker: [
    binding(
      'template-review-hub-card',
      'config',
      'Template-review Hub MCP card',
      'config/dify/inventory.json',
      '"template-review"'
    ),
    binding(
      'template-review-hub-proxy-tools',
      'config',
      'Hub proxy tool access',
      'config/dify/inventory.json',
      'hub_execute_proxy_tool'
    )
  ],
  system_search_worker: [
    binding(
      'template-search-worker',
      'cloudflare_worker',
      'webflow-template-search Worker',
      'packages/webflow-template-search/wrangler.toml',
      'name = "webflow-template-search"'
    ),
    binding(
      'template-search-api-readme',
      'repo_path',
      'Template search API contract',
      'packages/webflow-template-search/README.md',
      'GET /api/templates/search'
    )
  ],
  system_webflow_code_components: [
    binding(
      'marketplace-code-components',
      'webflow_code_component',
      'Marketplace Code Components package',
      'packages/webflow-components/README.md',
      'Template Grid'
    ),
    binding(
      'template-grid-component',
      'webflow_code_component',
      'TemplateGrid implementation',
      'packages/webflow-components/src/components/grid/TemplateGrid.tsx',
      'TemplateGrid'
    )
  ],
  system_dashboard_cloud: [
    binding(
      'dashboard-cloud-app',
      'webflow_cloud_app',
      'Asset Dashboard Cloud app',
      'apps/webflow-dashboard-cloud/wrangler.json',
      '"name": "webflow-dashboard-cloud"'
    ),
    binding(
      'dashboard-cloud-readme',
      'repo_path',
      'Dashboard Cloud route surface',
      'apps/webflow-dashboard-cloud/README.md',
      '/marketplace'
    )
  ],

  touchpoint_public_marketplace: [
    binding(
      'marketplace-delivery-project',
      'repo_path',
      'Marketplace delivery project manifest',
      'config/delivery/projects/webflow-marketplace.json',
      '"marketplace-discovery"'
    )
  ],
  touchpoint_review_queue_dashboard: [
    binding(
      'review-queue-tools',
      'mcp_server',
      'Template review queue tools',
      'packages/webflow-template-review-mcp/README.md',
      'queue and version inspection'
    )
  ],
  touchpoint_bettermode_community: [
    binding(
      'bettermode-community-agent',
      'dify_agent',
      'Bettermode creator community agent',
      'config/dify-agents/bettermode-marketplace-creator-agent.dify.yml',
      'Webflow Community Marketplace Creators'
    )
  ],

  constraint_human_decision_boundary: [
    binding(
      'human-review-boundary',
      'policy',
      'Agent output is not official review decision',
      'docs/deliveries/webflow-marketplace/2026-06-05-agent-review-validation-report.md',
      'final approval/rejection remains a human-review action'
    )
  ],
  constraint_published_site_supplemental: [
    binding(
      'published-site-supplemental-policy',
      'policy',
      'Published-site validation is supplemental',
      'docs/deliveries/webflow-marketplace/2026-06-05-agent-review-validation-report.md',
      'Published-site validation remains supplemental triage evidence'
    )
  ],
  constraint_secret_access_boundary: [
    binding(
      'template-review-secret-boundary',
      'policy',
      'Template review MCP bearer auth boundary',
      'packages/webflow-template-review-mcp/README.md',
      'MCP_API_KEY'
    ),
    binding(
      'dify-secret-inventory-boundary',
      'policy',
      'Dify secret storage boundary',
      'config/dify/inventory.json',
      'DIFY_TEMPLATE_REVIEW_HUB_API_KEY'
    )
  ],
  constraint_manual_checks_remaining: [
    binding(
      'manual-checks-policy',
      'policy',
      'Manual checks required',
      'docs/deliveries/webflow-marketplace/2026-06-05-agent-review-validation-report.md',
      'Manual checks remain necessary'
    )
  ],
  constraint_measurement_refresh: [
    binding(
      'measurement-trajectory-report',
      'policy',
      'Measurement refresh boundary',
      'docs/deliveries/webflow-marketplace/2026-06-05-measurement-trajectory-report.md',
      'Safari'
    )
  ]
};

function binding(
  id: string,
  kind: AtlasPrimitiveBinding['kind'],
  label: string,
  source: string,
  selector?: string
): AtlasPrimitiveBinding {
  return {
    id,
    kind,
    label,
    source,
    selector,
    required: true
  };
}

function bindingsForNode(node: AtlasCanvasNode): AtlasPrimitiveBinding[] {
  return TEMPLATE_SYSTEM_BINDINGS[node.atlasId ?? node.id] ?? TEMPLATE_SYSTEM_BINDINGS[node.id] ?? [];
}

async function checkBinding(
  candidate: AtlasPrimitiveBinding,
  cwd: string
): Promise<AtlasPrimitiveBindingCheck> {
  const absolutePath = path.resolve(cwd, candidate.source);
  if (!existsSync(absolutePath)) {
    return {
      ...candidate,
      status: 'missing',
      summary: `Missing ${candidate.source}`
    };
  }

  if (!candidate.selector) {
    return {
      ...candidate,
      status: 'synced',
      summary: `Found ${candidate.source}`
    };
  }

  const content = await readFile(absolutePath, 'utf8');
  const status = content.includes(candidate.selector) ? 'synced' : 'missing';
  return {
    ...candidate,
    status,
    summary:
      status === 'synced'
        ? `Found ${candidate.selector} in ${candidate.source}`
        : `Missing ${candidate.selector} in ${candidate.source}`
  };
}

function summarizeNode(checks: AtlasPrimitiveBindingCheck[], checkedAt: string): AtlasNodeSync {
  if (!checks.length) {
    return {
      status: 'unbound',
      checkedAt,
      summary: 'No production primitive binding is defined for this node.',
      bindingCount: 0,
      issueCount: 0,
      checks: []
    };
  }

  const missing = checks.filter((check) => check.status === 'missing');
  const unknown = checks.filter((check) => check.status === 'unknown');
  let status: AtlasPrimitiveSyncStatus = 'synced';
  if (missing.length === checks.length) status = 'missing';
  else if (missing.length || unknown.length) status = 'partial';

  return {
    status,
    checkedAt,
    summary:
      status === 'synced'
        ? `${checks.length} production primitive${checks.length === 1 ? '' : 's'} synced.`
        : `${missing.length + unknown.length} of ${checks.length} production primitive bindings need attention.`,
    bindingCount: checks.length,
    issueCount: missing.length + unknown.length,
    checks
  };
}

function summarizeSession(
  session: AtlasSession,
  profile: AtlasProductionBindingProfile,
  checkedAt: string
): AtlasHealSummary {
  const counts = session.canvas.nodes.reduce(
    (acc, node) => {
      const status = node.sync?.status ?? 'unknown';
      acc.bindingsChecked += node.sync?.bindingCount ?? 0;
      if (status === 'synced') acc.synced += 1;
      else if (status === 'partial') acc.partial += 1;
      else if (status === 'missing') acc.missing += 1;
      else if (status === 'unbound') acc.unbound += 1;
      return acc;
    },
    {
      profile,
      checkedAt,
      nodesChecked: session.canvas.nodes.length,
      bindingsChecked: 0,
      synced: 0,
      partial: 0,
      missing: 0,
      unbound: 0
    }
  );
  return counts;
}

export async function applyProductionBindings(
  session: AtlasSession,
  options: { profile?: AtlasProductionBindingProfile; cwd?: string } = {}
): Promise<{ session: AtlasSession; summary: AtlasHealSummary }> {
  const profile = options.profile ?? 'template-system';
  if (profile !== 'template-system') {
    throw new Error(`Unsupported Atlas production binding profile: ${profile}`);
  }

  const cwd = options.cwd ?? process.cwd();
  const checkedAt = new Date().toISOString();
  const nodes = await Promise.all(
    session.canvas.nodes.map(async (node) => {
      const bindings = bindingsForNode(node);
      const checks = await Promise.all(bindings.map((candidate) => checkBinding(candidate, cwd)));
      return {
        ...node,
        bindings,
        sync: summarizeNode(checks, checkedAt),
        updatedAt: checkedAt
      };
    })
  );

  const next: AtlasSession = {
    ...session,
    canvas: {
      ...session.canvas,
      nodes
    },
    observations: [
      {
        id: `observation_heal_${Date.now().toString(36)}`,
        source: 'agent',
        text: `Self-heal checked Template System production primitive bindings across ${nodes.length} nodes.`,
        createdAt: checkedAt
      },
      ...session.observations
    ]
  };

  return {
    session: next,
    summary: summarizeSession(next, profile, checkedAt)
  };
}

export async function healSessionProductionBindings(
  sessionId: string,
  options: { profile?: AtlasProductionBindingProfile; cwd?: string } = {}
): Promise<AtlasHealResult> {
  const cwd = options.cwd ?? process.cwd();
  const profile = options.profile ?? 'template-system';
  const session = await readSession(sessionId, cwd);
  const healed = await applyProductionBindings(session, { cwd, profile });
  const written = await writeSession(healed.session, cwd);
  return {
    profile,
    summary: healed.summary,
    session: written
  };
}
