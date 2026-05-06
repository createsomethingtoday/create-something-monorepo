#!/usr/bin/env tsx

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type CatalogExposureMode = 'direct' | 'brokered' | 'exception_direct';
type ServerLifecycle = 'active' | 'dormant' | 'local';
type RegistryServer = {
  transport: 'http' | 'stdio';
  url?: string;
  description?: string;
  tags?: string[];
  lifecycle?: ServerLifecycle;
  catalog_exposure_mode?: CatalogExposureMode;
  estimated_tool_count?: number;
  catalog?: {
    include?: boolean;
    name?: string;
    slug?: string;
    category?: string;
  };
};

type McpHubRegistry = {
  version: number;
  servers: Record<string, RegistryServer>;
};

type DifyMcpServer = {
  display_name: string;
  source_mcp_registry_server?: string;
  url: string;
  tools: Array<{
    name: string;
    enabled: boolean;
    risk: string;
  }>;
};

type DifyAgent = {
  display_name: string;
  status: 'planned' | 'draft' | 'imported' | 'published' | 'retired';
  allowed_mcp_servers: string[];
  enabled_tools: string[];
  eval_suite: string;
  evals?: {
    local_command?: string;
    published_command?: string;
    required_checks?: string[];
  };
  smoke_cases?: Array<{ id: string }>;
};

type DifyInventory = {
  status: 'partial' | 'complete';
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type CoverageStatus =
  | 'ready'
  | 'agent-needs-gates'
  | 'agent-draft'
  | 'intake-ready'
  | 'server-only'
  | 'missing-dify-server';

type DifyMcpIntake = {
  status: 'pending-dify-studio-registration';
  registry_server?: {
    id?: string;
  };
  dify_mcp_server?: {
    server_id?: string;
  };
};

type CandidateCoverage = {
  registryServerId: string;
  registryUrl: string;
  description: string;
  exposureMode: string;
  estimatedToolCount: number | undefined;
  difyServerIds: string[];
  intakeArtifactPaths: string[];
  agentIds: string[];
  publishedAgentIds: string[];
  status: CoverageStatus;
  nextAction: string;
};

type ExclusionReason = 'brokered' | 'dormant' | 'local' | 'non-http';

const ROOT = process.cwd();
const MCP_REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const DIFY_INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const DIFY_INTAKE_DIR = resolve(ROOT, 'config/dify-mcp-intake');
const GENERATED_DOC_PATH = resolve(ROOT, 'docs/DIFY_MCP_COVERAGE.generated.md');

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['check', 'generate', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/dify-coverage.ts [check|generate|validate]');
  process.exit(2);
}

for (const path of [MCP_REGISTRY_PATH, DIFY_INVENTORY_PATH]) {
  if (!existsSync(path)) {
    console.error(`Required file missing: ${relativeToRoot(path)}`);
    process.exit(1);
  }
}

const registry = readJson<McpHubRegistry>(MCP_REGISTRY_PATH);
const inventory = readJson<DifyInventory>(DIFY_INVENTORY_PATH);
const intakeArtifactsByRegistry = readIntakeArtifactsByRegistry(DIFY_INTAKE_DIR);
const report = buildCoverageReport(registry, inventory, intakeArtifactsByRegistry);
const generatedDoc = renderCoverageDoc(report);

if (command === 'validate') {
  console.log('Dify MCP coverage validation passed.');
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(GENERATED_DOC_PATH, generatedDoc, 'utf8');
  console.log(`Wrote ${relativeToRoot(GENERATED_DOC_PATH)}`);
  process.exit(0);
}

if (!isFileContentEqual(GENERATED_DOC_PATH, generatedDoc)) {
  console.error('Dify MCP coverage artifact is out of date:');
  console.error(`- ${relativeToRoot(GENERATED_DOC_PATH)}`);
  console.error('Run: pnpm dify:coverage:generate');
  process.exit(1);
}

console.log('Dify MCP coverage check passed.');

function buildCoverageReport(
  registry: McpHubRegistry,
  inventory: DifyInventory,
  intakeArtifactsByRegistry: Map<string, string[]>
) {
  const registryEntries = Object.entries(registry.servers ?? {});
  const candidates: CandidateCoverage[] = [];
  const exclusions = new Map<ExclusionReason, number>([
    ['brokered', 0],
    ['dormant', 0],
    ['local', 0],
    ['non-http', 0]
  ]);

  for (const [serverId, server] of registryEntries) {
    const exclusion = getExclusionReason(server);
    if (exclusion) {
      exclusions.set(exclusion, (exclusions.get(exclusion) ?? 0) + 1);
      continue;
    }

    candidates.push(buildCandidateCoverage(serverId, server, inventory, intakeArtifactsByRegistry));
  }

  const statusCounts = new Map<CoverageStatus, number>([
    ['ready', 0],
    ['agent-needs-gates', 0],
    ['agent-draft', 0],
    ['intake-ready', 0],
    ['server-only', 0],
    ['missing-dify-server', 0]
  ]);

  for (const candidate of candidates) {
    statusCounts.set(candidate.status, (statusCounts.get(candidate.status) ?? 0) + 1);
  }

  return {
    registryServerCount: registryEntries.length,
    difyInventoryStatus: inventory.status,
    difyServerCount: Object.keys(inventory.mcp_servers ?? {}).length,
    difyAgentCount: Object.keys(inventory.agents ?? {}).length,
    intakeArtifactCount: [...intakeArtifactsByRegistry.values()].reduce(
      (total, paths) => total + paths.length,
      0
    ),
    candidateCount: candidates.length,
    exclusions,
    statusCounts,
    candidates: candidates.sort(compareCoverage)
  };
}

function getExclusionReason(server: RegistryServer): ExclusionReason | undefined {
  if (server.transport !== 'http') return 'non-http';
  if (server.lifecycle === 'dormant') return 'dormant';
  if (server.lifecycle === 'local') return 'local';
  if (server.catalog_exposure_mode === 'brokered') return 'brokered';
  return undefined;
}

function buildCandidateCoverage(
  registryServerId: string,
  registryServer: RegistryServer,
  inventory: DifyInventory,
  intakeArtifactsByRegistry: Map<string, string[]>
): CandidateCoverage {
  const difyServerIds = Object.entries(inventory.mcp_servers ?? {})
    .filter(([, server]) => {
      return (
        server.source_mcp_registry_server === registryServerId ||
        (Boolean(registryServer.url) && server.url === registryServer.url)
      );
    })
    .map(([serverId]) => serverId)
    .sort();
  const agentIds = Object.entries(inventory.agents ?? {})
    .filter(([, agent]) =>
      agent.allowed_mcp_servers.some((serverId) => difyServerIds.includes(serverId))
    )
    .map(([agentId]) => agentId)
    .sort();
  const publishedAgentIds = agentIds.filter(
    (agentId) => inventory.agents[agentId]?.status === 'published'
  );
  const intakeArtifactPaths = intakeArtifactsByRegistry.get(registryServerId) ?? [];
  const status = inferCoverageStatus(
    difyServerIds,
    intakeArtifactPaths,
    agentIds,
    publishedAgentIds,
    inventory
  );

  return {
    registryServerId,
    registryUrl: registryServer.url ?? '',
    description: registryServer.description ?? '',
    exposureMode: registryServer.catalog_exposure_mode ?? 'unset',
    estimatedToolCount: registryServer.estimated_tool_count,
    difyServerIds,
    intakeArtifactPaths,
    agentIds,
    publishedAgentIds,
    status,
    nextAction: nextActionForStatus(status, registryServerId)
  };
}

function inferCoverageStatus(
  difyServerIds: string[],
  intakeArtifactPaths: string[],
  agentIds: string[],
  publishedAgentIds: string[],
  inventory: DifyInventory
): CoverageStatus {
  if (difyServerIds.length === 0) {
    return intakeArtifactPaths.length > 0 ? 'intake-ready' : 'missing-dify-server';
  }
  if (agentIds.length === 0) return 'server-only';
  if (publishedAgentIds.length === 0) return 'agent-draft';

  const hasReadyPublishedAgent = publishedAgentIds.some((agentId) => {
    const agent = inventory.agents[agentId];
    return (
      Boolean(agent?.evals?.local_command) &&
      Boolean(agent?.evals?.published_command) &&
      Array.isArray(agent?.smoke_cases) &&
      agent.smoke_cases.length > 0
    );
  });

  return hasReadyPublishedAgent ? 'ready' : 'agent-needs-gates';
}

function nextActionForStatus(status: CoverageStatus, registryServerId: string): string {
  switch (status) {
    case 'ready':
      return 'Keep smoke/eval evidence current.';
    case 'agent-needs-gates':
      return 'Add inventory smoke cases and Braintrust eval commands.';
    case 'agent-draft':
      return 'Import/publish the Dify app and wire Service API secrets.';
    case 'intake-ready':
      return 'Register the Dify MCP server card from the intake artifact, discover tools, then codify inventory.';
    case 'server-only':
      return 'Scaffold a Dify agent against the server card.';
    case 'missing-dify-server':
      return `Run pnpm dify:mcp:intake -- --registry-server-id ${registryServerId} --write.`;
  }
}

function compareCoverage(a: CandidateCoverage, b: CandidateCoverage): number {
  const statusRank: Record<CoverageStatus, number> = {
    'missing-dify-server': 0,
    'intake-ready': 1,
    'server-only': 2,
    'agent-draft': 3,
    'agent-needs-gates': 4,
    ready: 5
  };

  return (
    statusRank[a.status] - statusRank[b.status] ||
    a.registryServerId.localeCompare(b.registryServerId)
  );
}

function renderCoverageDoc(report: ReturnType<typeof buildCoverageReport>): string {
  const lines: string[] = [
    '# Dify MCP Coverage (Generated)',
    '',
    '> Auto-generated from `config/mcp-hub/registry.json`, `config/dify/inventory.json`, and `config/dify-mcp-intake/*.json`.',
    '> Regenerate with `pnpm dify:coverage:generate`.',
    '',
    'This report tracks MCPs that are reasonable Dify-direct candidates: active HTTP servers that are not explicitly brokered through the Hub or Composio.',
    'Brokered, local, dormant, and non-HTTP servers are summarized but excluded from direct Dify agent coverage.',
    '',
    '## Summary',
    '',
    `- MCP registry servers: ${report.registryServerCount}`,
    `- Dify-direct candidates: ${report.candidateCount}`,
    `- Dify inventory status: ${code(report.difyInventoryStatus)}`,
    `- Dify MCP server cards in inventory: ${report.difyServerCount}`,
    `- Dify agents in inventory: ${report.difyAgentCount}`,
    `- Dify MCP intake artifacts: ${report.intakeArtifactCount}`,
    '',
    '## Candidate Status',
    '',
    '| Status | Count | Meaning |',
    '| --- | ---: | --- |'
  ];

  for (const status of [
    'ready',
    'agent-needs-gates',
    'agent-draft',
    'intake-ready',
    'server-only',
    'missing-dify-server'
  ] satisfies CoverageStatus[]) {
    lines.push(
      `| ${code(status)} | ${report.statusCounts.get(status) ?? 0} | ${statusMeaning(status)} |`
    );
  }

  lines.push('', '## Excluded From Direct Dify Coverage', '');
  lines.push('| Reason | Count |');
  lines.push('| --- | ---: |');
  for (const reason of ['brokered', 'dormant', 'local', 'non-http'] satisfies ExclusionReason[]) {
    lines.push(`| ${code(reason)} | ${report.exclusions.get(reason) ?? 0} |`);
  }

  lines.push('', '## Dify-Direct Candidate Matrix', '');
  lines.push(
    '| MCP Registry Server | Status | Dify Server Card | Intake Artifact | Dify Agents | Published Agents | Est. Tools | Exposure | Next Action |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- |');

  for (const candidate of report.candidates) {
    lines.push(
      `| ${code(candidate.registryServerId)} | ${code(candidate.status)} | ${formatList(candidate.difyServerIds)} | ${formatList(candidate.intakeArtifactPaths)} | ${formatList(candidate.agentIds)} | ${formatList(candidate.publishedAgentIds)} | ${candidate.estimatedToolCount ?? '-'} | ${code(candidate.exposureMode)} | ${candidate.nextAction} |`
    );
  }

  lines.push('', '## Intake-Ready Candidate URLs', '');
  lines.push('| MCP Registry Server | Intake Artifact | URL | Description |');
  lines.push('| --- | --- | --- | --- |');

  const intakeReadyCandidates = report.candidates.filter(
    (candidate) => candidate.status === 'intake-ready'
  );

  for (const candidate of intakeReadyCandidates) {
    lines.push(
      `| ${code(candidate.registryServerId)} | ${formatList(candidate.intakeArtifactPaths)} | ${code(candidate.registryUrl)} | ${escapeTable(candidate.description) || '-'} |`
    );
  }

  if (intakeReadyCandidates.length === 0) {
    lines.push('| - | - | - | - |');
  }

  lines.push('', '## Unmapped Candidate URLs', '');
  lines.push('| MCP Registry Server | URL | Description |');
  lines.push('| --- | --- | --- |');

  const unmappedCandidates = report.candidates.filter(
    (candidate) => candidate.status === 'missing-dify-server'
  );

  for (const candidate of unmappedCandidates) {
    lines.push(
      `| ${code(candidate.registryServerId)} | ${code(candidate.registryUrl)} | ${escapeTable(candidate.description) || '-'} |`
    );
  }

  if (unmappedCandidates.length === 0) {
    lines.push('| - | - | - |');
  }

  return `${lines.join('\n')}\n`;
}

function statusMeaning(status: CoverageStatus): string {
  switch (status) {
    case 'ready':
      return 'Mapped to a Dify server and published agent with smoke/eval gates.';
    case 'agent-needs-gates':
      return 'Published agent exists but smoke/eval evidence is incomplete.';
    case 'agent-draft':
      return 'Agent exists but is not published yet.';
    case 'intake-ready':
      return 'Repo has a Dify Studio intake artifact, but the server card and discovered tools are not codified yet.';
    case 'server-only':
      return 'Dify MCP server exists but no Dify agent uses it yet.';
    case 'missing-dify-server':
      return 'No Dify MCP server card is codified for this registry server.';
  }
}

function readIntakeArtifactsByRegistry(dir: string): Map<string, string[]> {
  const byRegistry = new Map<string, string[]>();

  if (!existsSync(dir)) return byRegistry;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

    const artifactPath = resolve(dir, entry.name);
    const artifact = readJson<DifyMcpIntake>(artifactPath);
    const registryServerId = artifact.registry_server?.id;

    if (!registryServerId) {
      throw new Error(
        `Dify MCP intake artifact ${relativeToRoot(artifactPath)} is missing registry_server.id.`
      );
    }

    if (artifact.status !== 'pending-dify-studio-registration') continue;

    const paths = byRegistry.get(registryServerId) ?? [];
    paths.push(relativeToRoot(artifactPath));
    paths.sort();
    byRegistry.set(registryServerId, paths);
  }

  return byRegistry;
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

function formatList(values: string[]): string {
  return values.length > 0 ? values.map(code).join(', ') : '-';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function relativeToRoot(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}
