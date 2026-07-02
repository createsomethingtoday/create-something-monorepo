import type { MCPServer } from '@openai/agents';

type AgentsSdk = typeof import('@openai/agents');
type MCPServerStreamableHttpCtor = typeof import('@openai/agents').MCPServerStreamableHttp;

let agentsSdkPromise: Promise<AgentsSdk> | null = null;

async function loadAgentsSdk(): Promise<AgentsSdk> {
  if (agentsSdkPromise) return agentsSdkPromise;

  // Force debug package browser branch under nodejs_compat before SDK module init.
  const runtimeProcess = (globalThis as { process?: { browser?: boolean; type?: string } }).process;
  if (runtimeProcess) {
    runtimeProcess.browser = true;
    runtimeProcess.type = runtimeProcess.type ?? 'renderer';
  }

  agentsSdkPromise = import('@openai/agents');
  return agentsSdkPromise;
}

type ServerKey = 'telemetry' | 'gmail' | 'notion';
type ScenarioKey = 'dedup' | 'inbox-triage' | 'fleet-watchdog';

type ContractBundle = {
  agent_contract: string;
  mcp_contract: string;
  outcome_contract: string;
  golden_tasks: string;
};

type ToolCallSummary = {
  type: string;
  name?: string;
  callId?: string;
};

type ToolCallOutputSummary = {
  type: string;
  rawType?: string;
  callId?: string;
  status?: string;
  output?: string;
};

type RequiredToolCoverage = {
  required_tools: string[];
  called_tools: string[];
  successful_tools: string[];
  missing_required_tools: string[];
  missing_required_tool_success: string[];
  all_required_tools_called: boolean;
  all_required_tools_successful: boolean;
};

type RequiredToolCoverageCalledOnly = {
  required_tools: string[];
  called_tools: string[];
  missing_required_tools: string[];
  all_required_tools_called: boolean;
};

type FailedRequiredToolCall = {
  tool: string;
  callId?: string;
  status?: string;
  output_excerpt?: string;
};

type ScenarioPreset = {
  defaults: {
    query: string;
    servers: ServerKey[];
    model: string;
    maxTurns: number;
    agentName: string;
    agentInstructions: string;
    blockedToolNames: string[];
    requiredToolNames: string[];
  };
  contractBundle: ContractBundle;
};

type ServerEndpointConfig = Record<ServerKey, string>;

export type HalfDozenScenarioRunInput = {
  scenario: ScenarioKey;
  openaiApiKey: string;
  telemetryMcpUrl?: string;
  gmailMcpUrl?: string;
  notionMcpUrl?: string;
  query?: string;
  model?: string;
  maxTurns?: number;
  timeoutMs?: number;
  tracingDisabled?: boolean;
};

export type HalfDozenScenarioRunResult = {
  success: true;
  scenario: ScenarioKey;
  contract_bundle: ContractBundle;
  blocked_tools: string[];
  required_tools: string[];
  required_tool_coverage: RequiredToolCoverage | null;
  required_tool_coverage_called_only: RequiredToolCoverageCalledOnly | null;
  failed_required_tool_calls: FailedRequiredToolCall[];
  requested_servers: string[];
  model: string;
  prompt: string;
  connected_servers: string[];
  failed_servers: Array<{ server: string; error: string }>;
  degraded: boolean;
  degraded_reason?: string;
  tool_calls: ToolCallSummary[];
  final_output: unknown;
};

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MAX_TURNS = 10;
const DEFAULT_TIMEOUT_MS = 20_000;

const SERVER_ENDPOINTS: ServerEndpointConfig = {
  telemetry: 'https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp',
  gmail: 'https://gmail.mcp.workway.co/mcp',
  notion: 'https://createsomething-notion.mcp.workway.co/mcp',
};

const MULTI_SERVER_GENERIC_BLOCKLIST = ['search', 'fetch', 'submit_feedback'];

const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioPreset> = {
  dedup: {
    defaults: {
      query:
        'Find likely duplicate contacts in the target Notion source, propose canonical records with confidence scores, and provide a merge plan. Do not execute destructive archive actions without explicit human approval.',
      servers: ['notion', 'gmail'],
      model: DEFAULT_MODEL,
      maxTurns: DEFAULT_MAX_TURNS,
      agentName: 'Half Dozen Dedup Agent',
      agentInstructions:
        'You are a deduplication and canonicalization agent for Half Dozen. Use schema-first workflows, include evidence for every merge recommendation, and avoid destructive writes unless explicitly approved.',
      blockedToolNames: [
        'notion_create_database',
        'notion_update_database',
        'delete_automation',
        'search',
        'fetch',
        'submit_feedback',
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_dedup.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_dedup.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_dedup.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_dedup.yaml',
    },
  },
  'inbox-triage': {
    defaults: {
      query:
        'Triage unread client-relevant Gmail threads from the last 24 hours, summarize which threads should sync to Notion interactions, and identify any threads that require escalation instead of autonomous writes.',
      servers: ['gmail'],
      model: DEFAULT_MODEL,
      maxTurns: DEFAULT_MAX_TURNS,
      agentName: 'Half Dozen Inbox Triage Agent',
      agentInstructions:
        'You are an inbox triage agent for Half Dozen. Prioritize policy-compliant thread handling, contact-linking safety, and concise evidence-based recommendations for escalation.',
      blockedToolNames: [
        'delete_automation',
        'notion_bulk_archive',
        'notion_update_database',
        'search',
        'fetch',
        'submit_feedback',
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_inbox_triage.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_inbox_triage.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_inbox_triage.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_inbox_triage.yaml',
    },
  },
  'fleet-watchdog': {
    defaults: {
      query:
        'Run a 24-hour fleet watchdog review using query_health, query_errors, query_activity, and query_trends before finalizing. Report degraded or unhealthy services, top recurring error clusters with counts, period-over-period regressions, and first remediation step per issue. If any required tool fails or returns no data, state that explicitly.',
      servers: ['telemetry'],
      model: DEFAULT_MODEL,
      maxTurns: DEFAULT_MAX_TURNS,
      agentName: 'Half Dozen Fleet Watchdog Agent',
      agentInstructions:
        'You are a reliability watchdog for the Half Dozen MCP fleet. Before final output, call query_health, query_errors, query_activity, and query_trends. Tie every incident claim to tool evidence with concrete values, and provide concise remediation guidance without performing writes.',
      blockedToolNames: ['cleanup', 'notion_bulk_archive', 'delete_automation', 'search', 'fetch', 'submit_feedback'],
      requiredToolNames: ['query_health', 'query_errors', 'query_activity', 'query_trends'],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_fleet_watchdog.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_fleet_watchdog.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_fleet_watchdog.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_fleet_watchdog.yaml',
    },
  },
};

function resolveServerEndpoints(input: HalfDozenScenarioRunInput): ServerEndpointConfig {
  return {
    telemetry: input.telemetryMcpUrl ?? SERVER_ENDPOINTS.telemetry,
    gmail: input.gmailMcpUrl ?? SERVER_ENDPOINTS.gmail,
    notion: input.notionMcpUrl ?? SERVER_ENDPOINTS.notion,
  };
}

function createMcpServers(
  serverKeys: ServerKey[],
  timeoutMs: number,
  endpointConfig: ServerEndpointConfig,
  blockedToolNames: string[],
  MCPServerStreamableHttp: MCPServerStreamableHttpCtor,
): MCPServer[] {
  const blocked = new Set<string>(blockedToolNames);
  if (serverKeys.length > 1) {
    for (const name of MULTI_SERVER_GENERIC_BLOCKLIST) {
      blocked.add(name);
    }
  }

  const blockedList = [...blocked];
  const toolFilter = blockedList.length > 0 ? { blockedToolNames: blockedList } : undefined;
  return serverKeys.map((serverKey) => {
    return new MCPServerStreamableHttp({
      name: serverKey,
      url: endpointConfig[serverKey],
      cacheToolsList: true,
      timeout: timeoutMs,
      toolFilter,
    });
  });
}

function summarizeToolCalls(items: unknown[]): ToolCallSummary[] {
  return items
    .filter((item): item is { type: string; rawItem?: { type?: string; name?: string; callId?: string } } => {
      return Boolean(item && typeof item === 'object' && (item as { type?: unknown }).type === 'tool_call_item');
    })
    .map((item) => ({
      type: item.rawItem?.type ?? 'unknown',
      name: item.rawItem?.name,
      callId: item.rawItem?.callId,
    }));
}

function summarizeToolCallOutputs(items: unknown[]): ToolCallOutputSummary[] {
  return items
    .filter(
      (
        item,
      ): item is {
        type: string;
        rawItem?: { type?: string; callId?: string; id?: string; status?: string; output?: unknown };
        output?: unknown;
      } => {
        return Boolean(item && typeof item === 'object' && (item as { type?: unknown }).type === 'tool_call_output_item');
      },
    )
    .map((item) => {
      const rawOutput = item.rawItem?.output;
      const topLevelOutput = item.output;
      const output =
        typeof rawOutput === 'string'
          ? rawOutput
          : typeof topLevelOutput === 'string'
            ? topLevelOutput
            : undefined;
      return {
        type: item.type,
        rawType: item.rawItem?.type,
        callId: item.rawItem?.callId ?? item.rawItem?.id,
        status: item.rawItem?.status,
        output,
      };
    });
}

function hasErrorSignal(output?: string): boolean {
  if (!output) return false;
  return (
    /"error"\s*:/i.test(output) ||
    /^\s*error[:\s]/i.test(output) ||
    /\b(MCP error|D1_ERROR|SQLITE_ERROR|SQLITE_MISUSE)\b/i.test(output) ||
    /\bbinding\b/i.test(output)
  );
}

function isSuccessfulToolOutput(output: ToolCallOutputSummary | undefined): boolean {
  if (!output) return false;

  const status = output.status?.toLowerCase();
  if (status === 'completed') {
    return !hasErrorSignal(output.output);
  }
  if (status === 'incomplete' || status === 'failed') {
    return false;
  }

  return !hasErrorSignal(output.output);
}

function summarizeRequiredToolCoverage(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): RequiredToolCoverage | null {
  if (requiredToolNames.length === 0) {
    return null;
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const calledSet = new Set<string>();
  const successfulSet = new Set<string>();
  for (const call of toolCalls) {
    if (!call.name) {
      continue;
    }
    calledSet.add(call.name);
    if (call.callId && isSuccessfulToolOutput(outputByCallId.get(call.callId))) {
      successfulSet.add(call.name);
    }
  }

  const calledTools = [...calledSet].sort();
  const successfulTools = [...successfulSet].sort();
  const missingCalled = requiredToolNames.filter((name) => !calledSet.has(name));
  const missingSuccessful = requiredToolNames.filter((name) => !successfulSet.has(name));

  return {
    required_tools: requiredToolNames,
    called_tools: calledTools,
    successful_tools: successfulTools,
    missing_required_tools: missingCalled,
    missing_required_tool_success: missingSuccessful,
    all_required_tools_called: missingCalled.length === 0,
    all_required_tools_successful: missingSuccessful.length === 0,
  };
}

function summarizeRequiredToolCoverageLegacy(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
): RequiredToolCoverageCalledOnly | null {
  if (requiredToolNames.length === 0) {
    return null;
  }

  const calledSet = new Set<string>(
    toolCalls
      .map((call) => call.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  );
  const calledTools = [...calledSet].sort();
  const missing = requiredToolNames.filter((name) => !calledSet.has(name));

  return {
    required_tools: requiredToolNames,
    called_tools: calledTools,
    missing_required_tools: missing,
    all_required_tools_called: missing.length === 0,
  };
}

function summarizeFailedRequiredCalls(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): FailedRequiredToolCall[] {
  if (requiredToolNames.length === 0) {
    return [];
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const failures: FailedRequiredToolCall[] = [];
  for (const call of toolCalls) {
    if (!call.name || !requiredToolNames.includes(call.name)) {
      continue;
    }
    const output = call.callId ? outputByCallId.get(call.callId) : undefined;
    if (!isSuccessfulToolOutput(output)) {
      failures.push({
        tool: call.name,
        callId: call.callId,
        status: output?.status,
        output_excerpt: output?.output?.slice(0, 200),
      });
    }
  }

  return failures;
}

export async function runHalfDozenScenario(input: HalfDozenScenarioRunInput): Promise<HalfDozenScenarioRunResult> {
  const agentsSdk = await loadAgentsSdk();
  const scenarioPreset = SCENARIO_PRESETS[input.scenario];
  const endpointConfig = resolveServerEndpoints(input);

  const requestedServers = [...scenarioPreset.defaults.servers];
  const model = input.model ?? scenarioPreset.defaults.model;
  const maxTurns = input.maxTurns ?? scenarioPreset.defaults.maxTurns;
  const query = input.query ?? scenarioPreset.defaults.query;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Set API key for the OpenAI Agents SDK without relying on Node `process.env`.
  agentsSdk.setDefaultOpenAIKey(input.openaiApiKey);

  const rawServers = createMcpServers(
    scenarioPreset.defaults.servers,
    timeoutMs,
    endpointConfig,
    scenarioPreset.defaults.blockedToolNames,
    agentsSdk.MCPServerStreamableHttp,
  );
  const mcpServers = await agentsSdk.connectMcpServers(rawServers, {
    strict: false,
    dropFailed: true,
    connectInParallel: true,
    connectTimeoutMs: timeoutMs,
    closeTimeoutMs: timeoutMs,
  });

  try {
    const connected = mcpServers.active.map((server) => server.name);
    const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
      server: server.name,
      error: error.message,
    }));

    const connectivityDegradedReason =
      failed.length > 0
        ? `Connected ${connected.length}/${requestedServers.length} MCP servers; unavailable: ${failed.map((item) => item.server).join(', ')}.`
        : undefined;

    if (mcpServers.active.length === 0) {
      const requiredToolCoverage = summarizeRequiredToolCoverage(
        scenarioPreset.defaults.requiredToolNames,
        [],
        [],
      );
      const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(
        scenarioPreset.defaults.requiredToolNames,
        [],
      );
      return {
        success: true,
        scenario: input.scenario,
        contract_bundle: scenarioPreset.contractBundle,
        blocked_tools: scenarioPreset.defaults.blockedToolNames,
        required_tools: scenarioPreset.defaults.requiredToolNames,
        required_tool_coverage: requiredToolCoverage,
        required_tool_coverage_called_only: requiredToolCoverageLegacy,
        failed_required_tool_calls: [],
        requested_servers: requestedServers,
        model,
        prompt: query,
        connected_servers: connected,
        failed_servers: failed,
        degraded: true,
        degraded_reason: connectivityDegradedReason ?? 'No MCP servers connected.',
        tool_calls: [],
        final_output:
          'No MCP servers were reachable for this scenario. Returning a degraded connectivity report so operations can continue while MCP endpoints are restored.',
      };
    }

    const agent = new agentsSdk.Agent({
      name: scenarioPreset.defaults.agentName,
      instructions: scenarioPreset.defaults.agentInstructions,
      model,
      mcpServers: mcpServers.active,
    });

    const runner = new agentsSdk.Runner({ tracingDisabled: input.tracingDisabled ?? true });
    let result: { newItems: unknown[]; finalOutput: unknown };
    try {
      const runResult = await runner.run(agent, query, { maxTurns });
      result = {
        newItems: runResult.newItems as unknown[],
        finalOutput: runResult.finalOutput,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const requiredToolCoverage = summarizeRequiredToolCoverage(
        scenarioPreset.defaults.requiredToolNames,
        [],
        [],
      );
      const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(
        scenarioPreset.defaults.requiredToolNames,
        [],
      );
      return {
        success: true,
        scenario: input.scenario,
        contract_bundle: scenarioPreset.contractBundle,
        blocked_tools: scenarioPreset.defaults.blockedToolNames,
        required_tools: scenarioPreset.defaults.requiredToolNames,
        required_tool_coverage: requiredToolCoverage,
        required_tool_coverage_called_only: requiredToolCoverageLegacy,
        failed_required_tool_calls: [],
        requested_servers: requestedServers,
        model,
        prompt: query,
        connected_servers: connected,
        failed_servers: failed,
        degraded: true,
        degraded_reason: `Agent run aborted after connectivity checks: ${message}`,
        tool_calls: [],
        final_output:
          'The scenario entered degraded mode because agent execution failed after MCP connectivity checks. Review failed_servers and degraded_reason for remediation.',
      };
    }

    const toolCalls = summarizeToolCalls(result.newItems);
    const toolCallOutputs = summarizeToolCallOutputs(result.newItems);
    const requiredToolCoverage = summarizeRequiredToolCoverage(
      scenarioPreset.defaults.requiredToolNames,
      toolCalls,
      toolCallOutputs,
    );
    const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(
      scenarioPreset.defaults.requiredToolNames,
      toolCalls,
    );
    const failedRequiredCalls = summarizeFailedRequiredCalls(
      scenarioPreset.defaults.requiredToolNames,
      toolCalls,
      toolCallOutputs,
    );

    return {
      success: true,
      scenario: input.scenario,
      contract_bundle: scenarioPreset.contractBundle,
      blocked_tools: scenarioPreset.defaults.blockedToolNames,
      required_tools: scenarioPreset.defaults.requiredToolNames,
      required_tool_coverage: requiredToolCoverage,
      required_tool_coverage_called_only: requiredToolCoverageLegacy,
      failed_required_tool_calls: failedRequiredCalls,
      requested_servers: requestedServers,
      model,
      prompt: query,
      connected_servers: connected,
      failed_servers: failed,
      degraded: failed.length > 0,
      degraded_reason: connectivityDegradedReason,
      tool_calls: toolCalls,
      final_output: result.finalOutput,
    };
  } finally {
    await mcpServers.close();
  }
}

export type FleetWatchdogRunInput = Omit<HalfDozenScenarioRunInput, 'scenario'>;
export type FleetWatchdogRunResult = HalfDozenScenarioRunResult & { scenario: 'fleet-watchdog' };
export async function runHalfDozenFleetWatchdog(input: FleetWatchdogRunInput): Promise<FleetWatchdogRunResult> {
  return runHalfDozenScenario({ ...input, scenario: 'fleet-watchdog' }) as Promise<FleetWatchdogRunResult>;
}

export type InboxTriageRunInput = Omit<HalfDozenScenarioRunInput, 'scenario'>;
export type InboxTriageRunResult = HalfDozenScenarioRunResult & { scenario: 'inbox-triage' };
export async function runHalfDozenInboxTriage(input: InboxTriageRunInput): Promise<InboxTriageRunResult> {
  return runHalfDozenScenario({ ...input, scenario: 'inbox-triage' }) as Promise<InboxTriageRunResult>;
}

export type DedupRunInput = Omit<HalfDozenScenarioRunInput, 'scenario'>;
export type DedupRunResult = HalfDozenScenarioRunResult & { scenario: 'dedup' };
export async function runHalfDozenDedup(input: DedupRunInput): Promise<DedupRunResult> {
  return runHalfDozenScenario({ ...input, scenario: 'dedup' }) as Promise<DedupRunResult>;
}
