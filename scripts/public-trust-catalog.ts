#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PublicAccessStatus = 'public' | 'sandbox' | 'byo_auth' | 'waitlist' | 'private';
type AccessModel = 'read_only' | 'simulated_write' | 'approval_required' | 'live_write';
type ToolRisk = 'read' | 'write' | 'external_side_effect' | 'secret_sensitive' | 'unknown';

type PublicTrustCardMetadata = {
  summary: string;
  limitations: string[];
  policy_pack: string;
  eval_suite: string;
  last_verified_date?: string;
  evidence_ref: string;
  escalation?: string;
};

type PublicObservability = {
  braintrust?: {
    project?: string;
    experiment?: string;
  };
  langfuse?: {
    project?: string;
    environment?: string;
  };
};

type ExternalListings = {
  glama?: string;
  hugging_face?: string;
  docker?: string;
  github?: string;
  official_registry?: string;
};

type PublicAccess = {
  status: PublicAccessStatus;
  access_model: AccessModel;
  url?: string;
  trust_card: PublicTrustCardMetadata;
  observability?: PublicObservability;
  external_listings?: ExternalListings;
};

type RegistryServer = {
  transport: 'http' | 'stdio';
  url?: string;
  command?: string;
  description?: string;
  tags?: string[];
  bearer_token_env_var?: string;
  estimated_tool_count?: number;
  catalog?: {
    include?: boolean;
    name?: string;
    slug?: string;
    category?: string;
    description?: string;
    transports?: string[];
    requiresAuth?: boolean;
    authType?: string;
  };
  public_access?: PublicAccess;
};

type Registry = {
  version: number;
  servers: Record<string, RegistryServer>;
};

type DifyTool = {
  name: string;
  enabled: boolean;
  risk: ToolRisk;
};

type DifyMcpServer = {
  display_name: string;
  source_mcp_registry_server?: string;
  transport: 'http';
  url: string;
  auth: {
    type: 'none' | 'bearer' | 'oauth' | 'custom';
  };
  tools: DifyTool[];
};

type DifyAgent = {
  display_name: string;
  runtime: 'dify';
  status: 'planned' | 'draft' | 'imported' | 'published' | 'retired';
  audience: 'internal' | 'client' | 'public';
  mode: string;
  allowed_mcp_servers: string[];
  enabled_tools: string[];
  policy_pack: string;
  eval_suite: string;
  evals: {
    owner_system: 'braintrust';
    project?: string;
    experiment?: string;
    required_checks: string[];
    local_command?: string;
    published_command?: string;
    last_verified_at?: string;
  };
  smoke_command?: string;
  owner: string;
  write_policy?: 'none' | 'requires_explicit_confirmation' | 'disabled';
  public_access?: PublicAccess;
  observability?: PublicObservability;
};

type DifyInventory = {
  version: number;
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type EvidenceStatus = 'pass' | 'fail' | 'pending';

type EvidenceEntry = {
  id: string;
  subject_kind: 'mcp' | 'agent';
  subject_slug: string;
  title: string;
  catalog_review_status: EvidenceStatus;
  summary: string;
  risk_summary: string;
  reviewed_at: string;
  reviewed_by: string;
  evals: Array<{
    suite: string;
    required_checks: string[];
    status: EvidenceStatus;
    last_verified_date?: string;
    notes?: string;
  }>;
  runtime_observability?: {
    provider: string;
    status: string;
    notes?: string;
  };
  redacted_samples?: Array<{
    title: string;
    path: string;
  }>;
};

type EvidenceFile = {
  version: number;
  entries: EvidenceEntry[];
};

type PublicSnippet = {
  host: string;
  language: string;
  value: string;
};

type PublicTrustCard = {
  kind: 'mcp' | 'agent';
  slug: string;
  name: string;
  description: string;
  status: PublicAccessStatus;
  accessModel: AccessModel;
  url: string;
  transport: string;
  authModel: string;
  toolCount: number;
  riskSummary: string;
  policyPack: string;
  evalSuite: string;
  evalStatus: EvidenceStatus;
  requiredChecks: string[];
  lastVerifiedDate: string;
  evidenceRef: string;
  evidenceSummary: string;
  observability: PublicObservability;
  runtimeObservability?: EvidenceEntry['runtime_observability'];
  externalListings: Required<ExternalListings>;
  samples: Array<{
    title: string;
    path: string;
  }>;
  limitations: string[];
  escalation: string;
  installSnippets: PublicSnippet[];
  sourceRefs: string[];
};

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const DIFY_INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const EVIDENCE_PATH = resolve(ROOT, 'config/public-trust/evidence.json');
const GENERATED_CONFIG_PATH = resolve(
  ROOT,
  'packages/io/src/lib/config/publicTrustCatalog.generated.ts'
);
const GENERATED_DOC_PATH = resolve(ROOT, 'docs/PUBLIC_AGENT_MCP_TRUST_CATALOG.generated.md');

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['check', 'generate', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/public-trust-catalog.ts [check|generate|validate]');
  process.exit(2);
}

for (const path of [REGISTRY_PATH, DIFY_INVENTORY_PATH, EVIDENCE_PATH]) {
  if (!existsSync(path)) {
    console.error(`Required file missing: ${relativeToRoot(path)}`);
    process.exit(1);
  }
}

const registry = readJson<Registry>(REGISTRY_PATH);
const difyInventory = readJson<DifyInventory>(DIFY_INVENTORY_PATH);
const evidenceFile = readJson<EvidenceFile>(EVIDENCE_PATH);

const { cards, errors } = buildPublicCatalog(registry, difyInventory, evidenceFile);

if (errors.length > 0) {
  console.error('Public trust catalog validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const generatedConfig = renderGeneratedConfig(cards);
const generatedDoc = renderGeneratedDoc(cards);

if (command === 'validate') {
  console.log(
    `Public trust catalog validation passed (${cards.mcp.length} MCP card(s), ${cards.agents.length} agent card(s)).`
  );
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(GENERATED_CONFIG_PATH, generatedConfig, 'utf8');
  writeFileSync(GENERATED_DOC_PATH, generatedDoc, 'utf8');
  console.log(`Wrote ${relativeToRoot(GENERATED_CONFIG_PATH)}`);
  console.log(`Wrote ${relativeToRoot(GENERATED_DOC_PATH)}`);
  process.exit(0);
}

const drift: string[] = [];
if (!isFileContentEqual(GENERATED_CONFIG_PATH, generatedConfig)) {
  drift.push(relativeToRoot(GENERATED_CONFIG_PATH));
}
if (!isFileContentEqual(GENERATED_DOC_PATH, generatedDoc)) {
  drift.push(relativeToRoot(GENERATED_DOC_PATH));
}

if (drift.length > 0) {
  console.error('Public trust catalog artifacts are out of date:');
  for (const file of drift) {
    console.error(`- ${file}`);
  }
  console.error('Run: pnpm trust:catalog:generate');
  process.exit(1);
}

console.log('Public trust catalog check passed.');

function buildPublicCatalog(
  registry: Registry,
  difyInventory: DifyInventory,
  evidenceFile: EvidenceFile
): { cards: { mcp: PublicTrustCard[]; agents: PublicTrustCard[] }; errors: string[] } {
  const errors: string[] = [];

  if (registry.version !== 1) errors.push(`MCP registry version must be 1.`);
  if (difyInventory.version !== 1) errors.push(`Dify inventory version must be 1.`);
  if (evidenceFile.version !== 1) errors.push(`Evidence file version must be 1.`);

  const evidenceById = indexEvidence(evidenceFile.entries ?? [], errors);
  validateEvidenceSamples(evidenceById, errors);

  const mcp = buildMcpCards(registry, evidenceById, errors);
  const agents = buildAgentCards(difyInventory, evidenceById, errors);

  validateNoPrivateAgentExposure(difyInventory, errors);
  validateNoSensitivePublicPayload([...mcp, ...agents], evidenceById, errors);

  return {
    cards: {
      mcp: mcp.sort((a, b) => a.name.localeCompare(b.name)),
      agents: agents.sort((a, b) => a.name.localeCompare(b.name)),
    },
    errors,
  };
}

function indexEvidence(entries: EvidenceEntry[], errors: string[]): Map<string, EvidenceEntry> {
  const byId = new Map<string, EvidenceEntry>();

  for (const entry of entries) {
    if (!entry.id) {
      errors.push('Evidence entry missing id.');
      continue;
    }
    if (byId.has(entry.id)) {
      errors.push(`Duplicate evidence entry id: ${entry.id}`);
      continue;
    }
    if (!entry.subject_slug || !entry.subject_kind) {
      errors.push(`Evidence ${entry.id}: subject_kind and subject_slug are required.`);
    }
    if (!entry.summary || !entry.risk_summary) {
      errors.push(`Evidence ${entry.id}: summary and risk_summary are required.`);
    }
    if (!Array.isArray(entry.evals) || entry.evals.length === 0) {
      errors.push(`Evidence ${entry.id}: at least one eval rollup is required.`);
    }
    byId.set(entry.id, entry);
  }

  return byId;
}

function validateEvidenceSamples(evidenceById: Map<string, EvidenceEntry>, errors: string[]): void {
  for (const entry of evidenceById.values()) {
    for (const sample of entry.redacted_samples ?? []) {
      if (!sample.title || !sample.path) {
        errors.push(`Evidence ${entry.id}: redacted sample needs title and path.`);
        continue;
      }
      const fullPath = resolve(ROOT, sample.path);
      if (!existsSync(fullPath)) {
        errors.push(`Evidence ${entry.id}: redacted sample missing: ${sample.path}`);
      }
    }
  }
}

function buildMcpCards(
  registry: Registry,
  evidenceById: Map<string, EvidenceEntry>,
  errors: string[]
): PublicTrustCard[] {
  const cards: PublicTrustCard[] = [];

  for (const [serverId, server] of Object.entries(registry.servers ?? {})) {
    const access = server.public_access;
    if (!access || access.status === 'private') continue;

    if (!access.status || !access.access_model) {
      errors.push(`MCP ${serverId}: public_access requires explicit status and access_model.`);
      continue;
    }
    if (server.transport !== 'http' || !server.url) {
      errors.push(`MCP ${serverId}: public_access is only allowed on HTTP MCP servers.`);
      continue;
    }
    if (access.access_model !== 'read_only') {
      errors.push(`MCP ${serverId}: V1 public catalog only allows read_only access_model.`);
    }

    const evidence = resolveEvidence(
      `MCP ${serverId}`,
      access.trust_card.evidence_ref,
      'mcp',
      server.catalog?.slug ?? serverId,
      evidenceById,
      errors
    );
    if (!evidence) continue;

    const slug = server.catalog?.slug?.trim() || serverId;
    const name = server.catalog?.name?.trim() || titleCase(serverId);
    const description =
      access.trust_card.summary || server.catalog?.description || server.description || `${name} MCP`;
    const authModel = resolveMcpAuthModel(server);

    cards.push({
      kind: 'mcp',
      slug,
      name,
      description,
      status: access.status,
      accessModel: access.access_model,
      url: server.url,
      transport: (server.catalog?.transports ?? [server.transport]).join(', '),
      authModel,
      toolCount: normalizeToolCount(server.estimated_tool_count),
      riskSummary: evidence.risk_summary,
      policyPack: access.trust_card.policy_pack,
      evalSuite: access.trust_card.eval_suite,
      evalStatus: summarizeEvalStatus(evidence),
      requiredChecks: collectRequiredChecks(evidence),
      lastVerifiedDate: access.trust_card.last_verified_date ?? evidence.reviewed_at,
      evidenceRef: access.trust_card.evidence_ref,
      evidenceSummary: evidence.summary,
      observability: access.observability ?? {},
      runtimeObservability: evidence.runtime_observability,
      externalListings: normalizeExternalListings(access.external_listings),
      samples: evidence.redacted_samples ?? [],
      limitations: access.trust_card.limitations,
      escalation: access.trust_card.escalation ?? 'security@createsomething.io',
      installSnippets: buildMcpInstallSnippets(slug, server.url, authModel),
      sourceRefs: ['config/mcp-hub/registry.json', 'config/public-trust/evidence.json'],
    });
  }

  return cards;
}

function buildAgentCards(
  inventory: DifyInventory,
  evidenceById: Map<string, EvidenceEntry>,
  errors: string[]
): PublicTrustCard[] {
  const cards: PublicTrustCard[] = [];

  for (const [agentId, agent] of Object.entries(inventory.agents ?? {})) {
    const access = agent.public_access;

    if (agent.audience === 'public' && !access?.status) {
      errors.push(`Agent ${agentId}: public audience requires explicit public_access.status.`);
      continue;
    }
    if (!access || access.status === 'private') continue;

    if (agent.audience !== 'public') {
      errors.push(`Agent ${agentId}: non-public agents cannot have public access status ${access.status}.`);
      continue;
    }
    if (access.access_model !== 'read_only') {
      errors.push(`Agent ${agentId}: V1 public agents must use read_only access_model.`);
    }
    if (agent.write_policy !== 'none') {
      errors.push(`Agent ${agentId}: public guide agents must declare write_policy none.`);
    }
    if (access.status === 'public' && agent.status !== 'published') {
      errors.push(`Agent ${agentId}: public status requires published Dify status.`);
    }
    if (access.status === 'public' && !access.url) {
      errors.push(`Agent ${agentId}: public status requires public_access.url.`);
    }

    const evidence = resolveEvidence(
      `Agent ${agentId}`,
      access.trust_card.evidence_ref,
      'agent',
      agentId,
      evidenceById,
      errors
    );
    if (!evidence) continue;

    const enabledToolCount = validatePublicAgentTools(agentId, agent, inventory, errors);
    const runtimeObservability = agent.observability ?? {};

    cards.push({
      kind: 'agent',
      slug: agentId,
      name: agent.display_name,
      description: access.trust_card.summary,
      status: access.status,
      accessModel: access.access_model,
      url: access.url ?? '',
      transport: 'Dify agent over HTTP MCP cards',
      authModel: access.status === 'waitlist' ? 'waitlist' : 'public Dify access',
      toolCount: enabledToolCount,
      riskSummary: evidence.risk_summary,
      policyPack: access.trust_card.policy_pack,
      evalSuite: access.trust_card.eval_suite,
      evalStatus: summarizeEvalStatus(evidence),
      requiredChecks: collectRequiredChecks(evidence),
      lastVerifiedDate: access.trust_card.last_verified_date ?? evidence.reviewed_at,
      evidenceRef: access.trust_card.evidence_ref,
      evidenceSummary: evidence.summary,
      observability: runtimeObservability,
      runtimeObservability: evidence.runtime_observability,
      externalListings: normalizeExternalListings(access.external_listings),
      samples: evidence.redacted_samples ?? [],
      limitations: access.trust_card.limitations,
      escalation: access.trust_card.escalation ?? 'security@createsomething.io',
      installSnippets: [],
      sourceRefs: [
        'config/dify/inventory.json',
        'config/dify-agents/create-something-guide-agent.json',
        'config/public-trust/evidence.json',
      ],
    });
  }

  return cards;
}

function validatePublicAgentTools(
  agentId: string,
  agent: DifyAgent,
  inventory: DifyInventory,
  errors: string[]
): number {
  const allowedServers = new Set(agent.allowed_mcp_servers ?? []);
  let enabledCount = 0;

  for (const serverId of allowedServers) {
    const server = inventory.mcp_servers[serverId];
    if (!server) {
      errors.push(`Agent ${agentId}: allowed MCP server ${serverId} is missing from Dify inventory.`);
      continue;
    }
    if (server.auth.type !== 'none') {
      errors.push(`Agent ${agentId}: public agents may only use no-auth public MCP server cards.`);
    }
  }

  for (const ref of agent.enabled_tools ?? []) {
    const parsed = parseToolRef(ref);
    if (!parsed) {
      errors.push(`Agent ${agentId}: enabled tool ref must be server_id.tool_name, got ${ref}.`);
      continue;
    }
    if (!allowedServers.has(parsed.serverId)) {
      errors.push(`Agent ${agentId}: enabled tool ${ref} is outside allowed_mcp_servers.`);
      continue;
    }

    const server = inventory.mcp_servers[parsed.serverId];
    const tool = server?.tools.find((candidate) => candidate.name === parsed.toolName);
    if (!tool) {
      errors.push(`Agent ${agentId}: enabled tool ${ref} is not in Dify MCP server inventory.`);
      continue;
    }
    if (!tool.enabled) {
      errors.push(`Agent ${agentId}: enabled tool ${ref} points at a disabled tool.`);
    }
    if (tool.risk !== 'read') {
      errors.push(`Agent ${agentId}: public tool ${ref} must be read risk, got ${tool.risk}.`);
    }
    enabledCount += 1;
  }

  return enabledCount;
}

function validateNoPrivateAgentExposure(inventory: DifyInventory, errors: string[]): void {
  for (const [agentId, agent] of Object.entries(inventory.agents ?? {})) {
    const status = agent.public_access?.status;
    if (!status || status === 'private') continue;
    if (agent.audience !== 'public') {
      errors.push(`Agent ${agentId}: ${agent.audience} agents are excluded from the public catalog.`);
    }
  }
}

function validateNoSensitivePublicPayload(
  cards: PublicTrustCard[],
  evidenceById: Map<string, EvidenceEntry>,
  errors: string[]
): void {
  const chunks: Array<{ label: string; text: string }> = [
    { label: 'generated public cards', text: JSON.stringify(cards, null, 2) },
  ];

  for (const card of cards) {
    const evidence = evidenceById.get(card.evidenceRef);
    if (evidence) {
      chunks.push({ label: `evidence ${evidence.id}`, text: JSON.stringify(evidence, null, 2) });
      for (const sample of evidence.redacted_samples ?? []) {
        const fullPath = resolve(ROOT, sample.path);
        if (existsSync(fullPath)) {
          chunks.push({ label: sample.path, text: readFileSync(fullPath, 'utf8') });
        }
      }
    }
  }

  const patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Infisical reference', pattern: /\binfisical\b/i },
    { name: 'secret manager path', pattern: /(^|[\s"'`])\/(?:dify|mcp-hub|secrets?)\/[A-Za-z0-9/_-]+/i },
    { name: 'bearer credential value', pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
    { name: 'OpenAI-style key', pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
    {
      name: 'credential assignment',
      pattern: /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/i,
    },
    {
      name: 'private client hub URL',
      pattern:
        /https:\/\/(?:blondish|morgan|viv|c3|aaron|abundance|shea|pablo|eric|natalia|mariana|vicki)[-.a-z0-9]*\.mcp\.createsomething\.agency/i,
    },
  ];

  for (const chunk of chunks) {
    for (const { name, pattern } of patterns) {
      if (pattern.test(chunk.text)) {
        errors.push(`Public payload contains ${name}: ${chunk.label}`);
      }
    }
  }
}

function resolveEvidence(
  context: string,
  evidenceRef: string,
  expectedKind: 'mcp' | 'agent',
  expectedSlug: string,
  evidenceById: Map<string, EvidenceEntry>,
  errors: string[]
): EvidenceEntry | undefined {
  if (!evidenceRef) {
    errors.push(`${context}: trust_card.evidence_ref is required.`);
    return undefined;
  }

  const evidence = evidenceById.get(evidenceRef);
  if (!evidence) {
    errors.push(`${context}: evidence_ref ${evidenceRef} not found in config/public-trust/evidence.json.`);
    return undefined;
  }
  if (evidence.subject_kind !== expectedKind) {
    errors.push(`${context}: evidence ${evidenceRef} is for ${evidence.subject_kind}, expected ${expectedKind}.`);
  }
  if (evidence.subject_slug !== expectedSlug) {
    errors.push(`${context}: evidence ${evidenceRef} subject_slug must be ${expectedSlug}.`);
  }
  return evidence;
}

function resolveMcpAuthModel(server: RegistryServer): string {
  if (server.catalog?.requiresAuth || server.bearer_token_env_var) {
    return server.catalog?.authType ? `${server.catalog.authType} auth` : 'bearer auth';
  }
  return 'none';
}

function buildMcpInstallSnippets(slug: string, url: string, authModel: string): PublicSnippet[] {
  if (authModel !== 'none') return [];

  const jsonSnippet = JSON.stringify({ mcpServers: { [slug]: { url } } }, null, 2);

  return [
    {
      host: 'Codex',
      language: 'toml',
      value: `[mcp_servers."${slug}"]\nurl = "${url}"`,
    },
    {
      host: 'Claude Desktop / Code',
      language: 'json',
      value: jsonSnippet,
    },
    {
      host: 'Claude Code CLI',
      language: 'shell',
      value: `claude mcp add --transport http ${slug} ${url}`,
    },
    {
      host: 'Cursor',
      language: 'json',
      value: jsonSnippet,
    },
  ];
}

function normalizeExternalListings(listings: ExternalListings | undefined): Required<ExternalListings> {
  return {
    glama: listings?.glama ?? '',
    hugging_face: listings?.hugging_face ?? '',
    docker: listings?.docker ?? '',
    github: listings?.github ?? '',
    official_registry: listings?.official_registry ?? '',
  };
}

function summarizeEvalStatus(evidence: EvidenceEntry): EvidenceStatus {
  const statuses = new Set(evidence.evals.map((entry) => entry.status));
  if (statuses.has('fail')) return 'fail';
  if (statuses.has('pending')) return 'pending';
  return 'pass';
}

function collectRequiredChecks(evidence: EvidenceEntry): string[] {
  return Array.from(new Set(evidence.evals.flatMap((entry) => entry.required_checks))).sort();
}

function normalizeToolCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function parseToolRef(ref: string): { serverId: string; toolName: string } | undefined {
  const index = ref.indexOf('.');
  if (index <= 0 || index === ref.length - 1) return undefined;
  return {
    serverId: ref.slice(0, index),
    toolName: ref.slice(index + 1),
  };
}

function renderGeneratedConfig(cards: { mcp: PublicTrustCard[]; agents: PublicTrustCard[] }): string {
  return [
    '/**',
    ' * AUTO-GENERATED FILE. DO NOT EDIT.',
    ' * Sources: config/mcp-hub/registry.json, config/dify/inventory.json, config/public-trust/evidence.json',
    ' * Regenerate with: pnpm trust:catalog:generate',
    ' */',
    '',
    `export const PUBLIC_TRUST_CATALOG = ${JSON.stringify(cards, null, 2)} as const;`,
    '',
  ].join('\n');
}

function renderGeneratedDoc(cards: { mcp: PublicTrustCard[]; agents: PublicTrustCard[] }): string {
  const lines: string[] = [
    '# Public Agent & MCP Trust Catalog (Generated)',
    '',
    '> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/public-trust/evidence.json`.',
    '> Regenerate with `pnpm trust:catalog:generate`.',
    '',
    'This catalog is the owned source of truth for public CREATE SOMETHING MCP and agent trust cards. External listings should mirror these cards and link back to `createsomething.io`.',
    '',
    '## Summary',
    '',
    `- Public MCP cards: ${cards.mcp.length}`,
    `- Public agent cards: ${cards.agents.length}`,
    '- Public access posture: read-only first',
    '- Raw Braintrust traces, raw Langfuse traces, private client hubs, broad Composio surfaces, and credential references are excluded.',
    '',
    '## MCP Cards',
    '',
    '| MCP | Status | Access | Auth | Tools | Eval Status | Evidence |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
  ];

  for (const card of cards.mcp) {
    lines.push(
      `| ${code(card.slug)} | ${code(card.status)} | ${code(card.accessModel)} | ${code(card.authModel)} | ${card.toolCount} | ${code(card.evalStatus)} | ${code(card.evidenceRef)} |`
    );
  }

  lines.push('', '## Agent Cards', '');
  lines.push('| Agent | Status | Access | Runtime/Auth | Tools | Eval Status | Evidence |');
  lines.push('| --- | --- | --- | --- | ---: | --- | --- |');
  for (const card of cards.agents) {
    lines.push(
      `| ${code(card.slug)} | ${code(card.status)} | ${code(card.accessModel)} | ${escapeTable(card.authModel)} | ${card.toolCount} | ${code(card.evalStatus)} | ${code(card.evidenceRef)} |`
    );
  }

  lines.push('', '## Evidence Details', '');
  for (const card of [...cards.mcp, ...cards.agents]) {
    lines.push(`### ${card.name}`, '');
    lines.push(`- Kind: ${code(card.kind)}`);
    lines.push(`- URL: ${card.url ? code(card.url) : 'not published'}`);
    lines.push(`- Policy pack: ${code(card.policyPack)}`);
    lines.push(`- Eval suite: ${code(card.evalSuite)}`);
    lines.push(`- Required checks: ${card.requiredChecks.map(code).join(', ')}`);
    lines.push(`- Last catalog review: ${code(card.lastVerifiedDate)}`);
    lines.push(`- Risk summary: ${escapeMarkdown(card.riskSummary)}`);
    lines.push(`- Evidence summary: ${escapeMarkdown(card.evidenceSummary)}`);
    if (card.runtimeObservability) {
      lines.push(
        `- Runtime observability: ${code(card.runtimeObservability.provider)} / ${code(card.runtimeObservability.status)}`
      );
    }
    if (card.samples.length > 0) {
      lines.push('- Redacted samples:');
      for (const sample of card.samples) {
        lines.push(`  - ${escapeMarkdown(sample.title)}: ${code(sample.path)}`);
      }
    }
    lines.push('- Limitations:');
    for (const limitation of card.limitations) {
      lines.push(`  - ${escapeMarkdown(limitation)}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isFileContentEqual(path: string, expected: string): boolean {
  return existsSync(path) && readFileSync(path, 'utf8') === expected;
}

function code(value: string): string {
  return `\`${value.replace(/`/g, '')}\``;
}

function escapeMarkdown(value: string): string {
  return value.replace(/\n/g, ' ').trim();
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function relativeToRoot(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}
