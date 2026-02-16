import {
  Agent,
  type MCPServer,
  MCPServerStreamableHttp,
  Runner,
  connectMcpServers,
} from '@openai/agents';

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

export type FleetWatchdogRunInput = {
  openaiApiKey: string;
  telemetryMcpUrl?: string;
  query?: string;
  model?: string;
  maxTurns?: number;
  timeoutMs?: number;
};

export type FleetWatchdogRunResult = {
  success: true;
  scenario: 'fleet-watchdog';
  contract_bundle: ContractBundle;
  blocked_tools: string[];
  required_tools: string[];
  required_tool_coverage: RequiredToolCoverage | null;
  required_tool_coverage_called_only: RequiredToolCoverageCalledOnly | null;
  failed_required_tool_calls: FailedRequiredToolCall[];
  model: string;
  prompt: string;
  connected_servers: string[];
  failed_servers: Array<{ server: string; error: string }>;
  tool_calls: ToolCallSummary[];
  final_output: unknown;
};

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MAX_TURNS = 10;
const DEFAULT_TIMEOUT_MS = 20_000;

const TELEMETRY_SERVER_NAME = 'telemetry';
const DEFAULT_TELEMETRY_MCP_URL = 'https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp';

const AGENT_NAME = 'Half Dozen Fleet Watchdog Agent';
const AGENT_INSTRUCTIONS =
  'You are a reliability watchdog for the Half Dozen MCP fleet. Before final output, call query_health, query_errors, query_activity, and query_trends. Tie every incident claim to tool evidence with concrete values, and provide concise remediation guidance without performing writes.';

const DEFAULT_QUERY =
  'Run a 24-hour fleet watchdog review using query_health, query_errors, query_activity, and query_trends before finalizing. Report degraded or unhealthy services, top recurring error clusters with counts, period-over-period regressions, and first remediation step per issue. If any required tool fails or returns no data, state that explicitly.';

const BLOCKED_TOOL_NAMES = ['cleanup', 'notion_bulk_archive', 'delete_automation', 'search', 'fetch', 'submit_feedback'];
const REQUIRED_TOOL_NAMES = ['query_health', 'query_errors', 'query_activity', 'query_trends'];

const CONTRACT_BUNDLE: ContractBundle = {
  agent_contract: 'templates/agent_contract_halfdozen_fleet_watchdog.yaml',
  mcp_contract: 'templates/mcp_contract_halfdozen_fleet_watchdog.yaml',
  outcome_contract: 'templates/outcome_contract_halfdozen_fleet_watchdog.md',
  golden_tasks: 'templates/golden_tasks_halfdozen_fleet_watchdog.yaml',
};

function createMcpServers(timeoutMs: number, telemetryMcpUrl: string): MCPServer[] {
  return [
    new MCPServerStreamableHttp({
      name: TELEMETRY_SERVER_NAME,
      url: telemetryMcpUrl,
      cacheToolsList: true,
      timeout: timeoutMs,
      toolFilter: { blockedToolNames: BLOCKED_TOOL_NAMES },
    }),
  ];
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

export async function runHalfDozenFleetWatchdog(input: FleetWatchdogRunInput): Promise<FleetWatchdogRunResult> {
  const telemetryMcpUrl = input.telemetryMcpUrl ?? DEFAULT_TELEMETRY_MCP_URL;
  const model = input.model ?? DEFAULT_MODEL;
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS;
  const query = input.query ?? DEFAULT_QUERY;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // @openai/agents reads OPENAI_API_KEY; set it explicitly in Worker runtime.
  process.env.OPENAI_API_KEY = input.openaiApiKey;

  const rawServers = createMcpServers(timeoutMs, telemetryMcpUrl);
  const mcpServers = await connectMcpServers(rawServers, {
    strict: false,
    dropFailed: true,
    connectInParallel: true,
  });

  try {
    if (mcpServers.active.length === 0) {
      const failures = [...mcpServers.errors.entries()].map(([server, error]) => ({
        server: server.name,
        error: error.message,
      }));
      throw new Error(`No MCP servers connected. Failures: ${JSON.stringify(failures, null, 2)}`);
    }

    const agent = new Agent({
      name: AGENT_NAME,
      instructions: AGENT_INSTRUCTIONS,
      model,
      mcpServers: mcpServers.active,
    });

    const runner = new Runner({ tracingDisabled: true });
    const result = await runner.run(agent, query, { maxTurns });

    const connected = mcpServers.active.map((server) => server.name);
    const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
      server: server.name,
      error: error.message,
    }));

    const toolCalls = summarizeToolCalls(result.newItems as unknown[]);
    const toolCallOutputs = summarizeToolCallOutputs(result.newItems as unknown[]);
    const requiredToolCoverage = summarizeRequiredToolCoverage(REQUIRED_TOOL_NAMES, toolCalls, toolCallOutputs);
    const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(REQUIRED_TOOL_NAMES, toolCalls);
    const failedRequiredCalls = summarizeFailedRequiredCalls(REQUIRED_TOOL_NAMES, toolCalls, toolCallOutputs);

    return {
      success: true,
      scenario: 'fleet-watchdog',
      contract_bundle: CONTRACT_BUNDLE,
      blocked_tools: BLOCKED_TOOL_NAMES,
      required_tools: REQUIRED_TOOL_NAMES,
      required_tool_coverage: requiredToolCoverage,
      required_tool_coverage_called_only: requiredToolCoverageLegacy,
      failed_required_tool_calls: failedRequiredCalls,
      model,
      prompt: query,
      connected_servers: connected,
      failed_servers: failed,
      tool_calls: toolCalls,
      final_output: result.finalOutput,
    };
  } finally {
    await mcpServers.close();
  }
}
