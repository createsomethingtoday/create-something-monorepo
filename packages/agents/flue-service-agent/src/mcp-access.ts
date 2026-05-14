import * as v from 'valibot';

export const MCP_ACCESS_REVIEW_RUNTIME = {
  runtime: 'flue',
  role: 'service_agent',
  agentName: 'mcp-access-review',
  endpointPattern: '/agents/mcp-access-review/:id',
  hubRuntime: 'create-something-hub',
  proxyToolPattern: '<server>__<tool>',
} as const;

export const DEFAULT_REQUIRED_HUB_TOOLS = [
  'hub_list_services',
  'hub_search_proxy_tools',
  'hub_describe_proxy_tool',
  'hub_execute_proxy_tool',
] as const;

const accessCheckSchema = v.object({
  id: v.string(),
  result: v.picklist(['pass', 'review', 'block']),
  notes: v.string(),
});

export const mcpAccessPayloadSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  request: v.optional(v.string()),
  requiredServers: v.optional(v.array(v.string())),
  requiredHubTools: v.optional(v.array(v.string())),
  contract: v.object({
    agentContractPath: v.string(),
    agentContractText: v.optional(v.string()),
  }),
  hubRegistry: v.object({
    registryPath: v.string(),
    registryJson: v.optional(v.unknown()),
  }),
});

export type McpAccessPayload = v.InferOutput<typeof mcpAccessPayloadSchema>;

type RegistryServer = {
  transport?: string;
  catalog_exposure_mode?: string;
  estimated_tool_count?: number;
  tags?: string[];
};

type HubRegistry = {
  servers?: Record<string, RegistryServer>;
};

export interface NormalizedMcpAccessPayload extends McpAccessPayload {
  request: string;
  requiredServers: string[];
  requiredHubTools: string[];
  contract: McpAccessPayload['contract'] & {
    agentContractText: string;
  };
  hubRegistry: McpAccessPayload['hubRegistry'] & {
    registryJson: HubRegistry;
  };
}

export const mcpAccessReportSchema = v.object({
  taskId: v.string(),
  clientName: v.string(),
  workflowName: v.string(),
  runtime: v.literal('flue'),
  route: v.literal('mcp_access_review'),
  readiness: v.picklist(['ready', 'review_required', 'blocked']),
  score: v.number(),
  summary: v.string(),
  checks: v.array(accessCheckSchema),
  missingEvidence: v.array(v.string()),
  allowedServers: v.array(v.string()),
  requiredHubTools: v.array(v.string()),
  recommendedNextActions: v.array(v.string()),
  evidence: v.object({
    contractRef: v.string(),
    registryRef: v.string(),
    endpointPattern: v.literal('/agents/mcp-access-review/:id'),
    accessPolicy: v.object({
      discoveryMode: v.literal('brokered'),
      hubRuntime: v.literal('create-something-hub'),
      proxyToolPattern: v.literal('<server>__<tool>'),
      directServerAccessAllowed: v.literal(false),
    }),
  }),
});

export type McpAccessReport = v.InferOutput<typeof mcpAccessReportSchema>;

export function parseMcpAccessPayload(payload: unknown): NormalizedMcpAccessPayload {
  const parsed = v.parse(mcpAccessPayloadSchema, payload);

  return {
    ...parsed,
    request: parsed.request ?? 'Evaluate brokered MCP access for this Flue service-agent workflow.',
    requiredServers: parsed.requiredServers ?? [],
    requiredHubTools: parsed.requiredHubTools ?? [...DEFAULT_REQUIRED_HUB_TOOLS],
    contract: {
      ...parsed.contract,
      agentContractText: parsed.contract.agentContractText ?? '',
    },
    hubRegistry: {
      ...parsed.hubRegistry,
      registryJson: normalizeHubRegistry(parsed.hubRegistry.registryJson),
    },
  };
}

function normalizeHubRegistry(value: unknown): HubRegistry {
  if (typeof value === 'object' && value !== null && 'servers' in value) {
    return value as HubRegistry;
  }
  return { servers: {} };
}

function containsNeedle(text: string, needle: string): boolean {
  return text.includes(needle);
}

function containsQuotedOrBareValue(text: string, key: string, value: string): boolean {
  const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*["']?${value}["']?`);
  return pattern.test(text);
}

function pushCheck(
  checks: McpAccessReport['checks'],
  missingEvidence: string[],
  check: McpAccessReport['checks'][number],
  missing?: string,
): void {
  checks.push(check);
  if (check.result === 'block' && missing) {
    missingEvidence.push(missing);
  }
}

function extractAllowedServers(contractText: string): string[] {
  const marker = 'allowed_servers:';
  const start = contractText.indexOf(marker);
  if (start === -1) return [];

  const lines = contractText.slice(start + marker.length).split('\n');
  const servers: string[] = [];
  for (const line of lines) {
    if (/^\S/.test(line) && line.trim() !== '') break;
    const match = line.match(/^\s*-\s*["']?([^"'\n#]+)["']?/);
    if (match) {
      const server = match[1]?.trim();
      if (server && !server.startsWith('<')) {
        servers.push(server);
      }
    }
  }
  return servers;
}

function isBroadDirectExposure(server: RegistryServer | undefined): boolean {
  if (!server) return false;
  const exposure = server.catalog_exposure_mode ?? 'direct';
  const estimatedToolCount = server.estimated_tool_count ?? 0;
  return exposure === 'direct' && estimatedToolCount > 50;
}

export function createMcpAccessReport(input: NormalizedMcpAccessPayload): McpAccessReport {
  const checks: McpAccessReport['checks'] = [];
  const missingEvidence: string[] = [];
  const contractText = input.contract.agentContractText;
  const registryServers = input.hubRegistry.registryJson.servers ?? {};
  const contractAllowedServers = extractAllowedServers(contractText);
  const requiredServers =
    input.requiredServers.length > 0 ? input.requiredServers : contractAllowedServers;
  const missingRequiredServers = requiredServers.filter(
    (server) => !contractAllowedServers.includes(server),
  );
  const missingRegistryServers = requiredServers.filter((server) => !registryServers[server]);
  const broadDirectServers = requiredServers.filter((server) => isBroadDirectExposure(registryServers[server]));

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'agent-contract-loaded',
      result: contractText.trim() ? 'pass' : 'block',
      notes: contractText.trim()
        ? `Loaded ${input.contract.agentContractPath}.`
        : `Missing contract text for ${input.contract.agentContractPath}.`,
    },
    input.contract.agentContractPath,
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'mcp-access-section-present',
      result: containsNeedle(contractText, 'mcp_access:') ? 'pass' : 'block',
      notes: 'agent_contract.yaml must include runtime_integrations.mcp_access.',
    },
    'runtime_integrations.mcp_access',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'brokered-discovery-mode',
      result: containsQuotedOrBareValue(contractText, 'discovery_mode', 'brokered') ? 'pass' : 'block',
      notes: 'Flue service agents must use brokered MCP discovery through the CREATE SOMETHING hub.',
    },
    'runtime_integrations.mcp_access.discovery_mode',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'direct-server-access-disabled',
      result:
        containsQuotedOrBareValue(contractText, 'direct_server_access_allowed', 'false') ||
        containsQuotedOrBareValue(contractText, 'direct_server_access', 'false')
          ? 'pass'
          : 'review',
      notes: 'Contract should make direct downstream MCP server access explicitly unavailable to Flue agents.',
    },
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'allowed-servers-declared',
      result: contractAllowedServers.length > 0 ? 'pass' : 'block',
      notes:
        contractAllowedServers.length > 0
          ? `Declared allowed servers: ${contractAllowedServers.join(', ')}.`
          : 'No concrete allowed MCP servers were declared.',
    },
    'runtime_integrations.mcp_access.allowed_servers',
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'required-servers-allowlisted',
      result: missingRequiredServers.length === 0 ? 'pass' : 'block',
      notes:
        missingRequiredServers.length === 0
          ? 'All required MCP servers are allowlisted in the contract.'
          : `Required servers missing from contract allowlist: ${missingRequiredServers.join(', ')}.`,
    },
    missingRequiredServers.join(', '),
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'registry-servers-resolved',
      result: missingRegistryServers.length === 0 ? 'pass' : 'block',
      notes:
        missingRegistryServers.length === 0
          ? `All required servers resolve in ${input.hubRegistry.registryPath}.`
          : `Required servers missing from hub registry: ${missingRegistryServers.join(', ')}.`,
    },
    missingRegistryServers.join(', '),
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'broad-direct-catalogs-blocked',
      result: broadDirectServers.length === 0 ? 'pass' : 'review',
      notes:
        broadDirectServers.length === 0
          ? 'No required server exposes a broad direct catalog.'
          : `Broad direct catalogs require broker review: ${broadDirectServers.join(', ')}.`,
    },
  );

  pushCheck(
    checks,
    missingEvidence,
    {
      id: 'hub-discovery-tools-declared',
      result: input.requiredHubTools.every((tool) => containsNeedle(contractText, tool)) ? 'pass' : 'review',
      notes: `Expected hub tools: ${input.requiredHubTools.join(', ')}.`,
    },
  );

  const blockCount = checks.filter((check) => check.result === 'block').length;
  const reviewCount = checks.filter((check) => check.result === 'review').length;
  const score = Math.round(((checks.length - blockCount - reviewCount * 0.5) / checks.length) * 100) / 100;
  const readiness = blockCount > 0 ? 'blocked' : reviewCount > 0 ? 'review_required' : 'ready';

  return v.parse(mcpAccessReportSchema, {
    taskId: input.taskId,
    clientName: input.clientName,
    workflowName: input.workflowName,
    runtime: 'flue',
    route: 'mcp_access_review',
    readiness,
    score,
    summary:
      readiness === 'ready'
        ? `${input.workflowName} is ready to use brokered MCP access through create-something-hub.`
        : `${input.workflowName} needs MCP access evidence review before Flue promotion.`,
    checks,
    missingEvidence: missingEvidence.filter(Boolean),
    allowedServers: contractAllowedServers,
    requiredHubTools: input.requiredHubTools,
    recommendedNextActions:
      readiness === 'ready'
        ? [
            'Keep downstream MCP secrets in the hub runtime, not Flue payloads or prompts.',
            'Use hub_search_proxy_tools before selecting executable proxy tools.',
            'Attach this MCP access report to Linear with the Flue smoke output.',
          ]
        : [
            'Resolve blocked MCP access checks in agent_contract.yaml.',
            'Confirm every allowed server resolves in config/mcp-hub/registry.json.',
            'Keep the Flue workflow in readiness review until the brokered access report is ready.',
          ],
    evidence: {
      contractRef: input.contract.agentContractPath,
      registryRef: input.hubRegistry.registryPath,
      endpointPattern: MCP_ACCESS_REVIEW_RUNTIME.endpointPattern,
      accessPolicy: {
        discoveryMode: 'brokered',
        hubRuntime: 'create-something-hub',
        proxyToolPattern: '<server>__<tool>',
        directServerAccessAllowed: false,
      },
    },
  });
}

export function createMcpAccessPrompt(input: NormalizedMcpAccessPayload): string {
  const deterministicReport = createMcpAccessReport(input);

  return [
    'Evaluate brokered MCP access for this CREATE SOMETHING Flue service-agent workflow.',
    '',
    'Request:',
    input.request,
    '',
    'Baseline MCP access report:',
    JSON.stringify(deterministicReport, null, 2),
    '',
    'Contract and registry references:',
    JSON.stringify(
      {
        agentContractPath: input.contract.agentContractPath,
        registryPath: input.hubRegistry.registryPath,
        requiredServers: input.requiredServers,
        requiredHubTools: input.requiredHubTools,
      },
      null,
      2,
    ),
    '',
    'Return the final report using the provided schema. Do not include secrets, bearer tokens, API keys, or raw downstream credentials.',
  ].join('\n');
}

export function validateMcpAccessReport(result: unknown): McpAccessReport {
  return v.parse(mcpAccessReportSchema, result);
}
