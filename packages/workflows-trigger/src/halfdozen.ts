import {
  Agent,
  type MCPServer,
  MCPServerStreamableHttp,
  RunContext,
  Runner,
  connectMcpServers,
  getAllMcpTools,
} from "@openai/agents";

export type ServerKey = "telemetry" | "youtube" | "gmail" | "zoom" | "notion";
export type ScenarioKey = "dedup" | "inbox-triage" | "fleet-watchdog";

export type ContractBundle = {
  agent_contract: string;
  mcp_contract: string;
  outcome_contract: string;
  golden_tasks: string;
};

export type ScenarioPreset = {
  description: string;
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

export type HalfDozenRunRequest = {
  query?: string;
  servers?: ServerKey[];
  model?: string;
  maxTurns?: number;
  scenario?: ScenarioKey;
  timeoutMs?: number;
  connectOnly?: boolean;
  correlationId?: string;
  traceProjectName?: string;
  traceTags?: string[];
};

export type HalfDozenResolvedOptions = {
  query: string;
  servers: ServerKey[];
  model: string;
  maxTurns: number;
  scenario?: ScenarioKey;
  agentName: string;
  agentInstructions: string;
  contractBundle?: ContractBundle;
  blockedToolNames: string[];
  requiredToolNames: string[];
  timeoutMs: number;
  connectOnly: boolean;
  correlationId?: string;
  traceProjectName?: string;
  traceTags?: string[];
};

export type ToolCallSummary = {
  type: string;
  name?: string;
  callId?: string;
};

export type ToolCallOutputSummary = {
  type: string;
  rawType?: string;
  callId?: string;
  status?: string;
  output?: string;
};

export type HalfDozenRunSuccess =
  | {
      success: true;
      mode: "connect-only";
      scenario: ScenarioKey | null;
      contract_bundle: ContractBundle | null;
      blocked_tools: string[];
      required_tools: string[];
      connected_servers: string[];
      failed_servers: Array<{ server: string; error: string }>;
      discovered_tools_count: number;
      discovered_tools: string[];
      correlation_id: string | null;
    }
  | {
      success: true;
      scenario: ScenarioKey | null;
      contract_bundle: ContractBundle | null;
      blocked_tools: string[];
      required_tools: string[];
      required_tool_coverage: {
        required_tools: string[];
        called_tools: string[];
        successful_tools: string[];
        missing_required_tools: string[];
        missing_required_tool_success: string[];
        all_required_tools_called: boolean;
        all_required_tools_successful: boolean;
      } | null;
      required_tool_coverage_called_only: {
        required_tools: string[];
        called_tools: string[];
        missing_required_tools: string[];
        all_required_tools_called: boolean;
      } | null;
      failed_required_tool_calls: Array<{
        tool: string;
        callId?: string;
        status?: string;
        output_excerpt?: string;
      }>;
      model: string;
      prompt: string;
      connected_servers: string[];
      failed_servers: Array<{ server: string; error: string }>;
      tool_calls: ToolCallSummary[];
      final_output: unknown;
      correlation_id: string | null;
    };

export type HalfDozenRunFailure = {
  success: false;
  error: string;
  hint?: string;
  correlation_id?: string | null;
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

const SERVER_ENDPOINTS: Record<ServerKey, { url: string; description: string }> =
  {
    telemetry: {
      url: "https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp",
      description: "Fleet health, usage, errors, trends",
    },
    youtube: {
      url: "https://youtube.mcp.workway.co/mcp",
      description: "YouTube transcript + Notion sync tools",
    },
    gmail: {
      url: "https://gmail.mcp.workway.co/mcp",
      description: "Gmail search/sync/automation tools",
    },
    zoom: {
      url: "https://zoom.mcp.workway.co/mcp",
      description: "Zoom clips sync + search tools",
    },
    notion: {
      url: "https://createsomething-notion.mcp.workway.co/mcp",
      description: "Half Dozen Notion CRUD tools",
    },
  };

export const DEFAULT_MODEL = "gpt-4.1-mini";
export const DEFAULT_MAX_TURNS = 8;
export const DEFAULT_TIMEOUT_MS = 20_000;
export const DEFAULT_SERVERS: ServerKey[] = ["telemetry"];

export const DEFAULT_QUERY =
  "Review the Half Dozen MCP fleet health for the last 24 hours. Identify any degraded or unhealthy servers and summarize top error patterns.";

export const MULTI_SERVER_GENERIC_BLOCKLIST = [
  "search",
  "fetch",
  "submit_feedback",
];

export const DEFAULT_AGENT_NAME = "Half Dozen MCP Ops Agent";
export const DEFAULT_AGENT_INSTRUCTIONS =
  "You are an operations agent for Half Dozen. Use MCP tools for factual claims. Keep output concise and evidence-based.";

async function registerBraintrustTracing(
  projectName: string,
  tags: string[],
): Promise<boolean> {
  const module = await import("@create-something/observability/openai-agents");

  return module.registerOpenAIAgentsBraintrustTracing({
    projectName,
    tags,
  });
}

const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioPreset> = {
  dedup: {
    description:
      "Duplicate detection, canonicalization, and safe merge planning.",
    defaults: {
      query:
        "Find likely duplicate contacts in the target Notion source, propose canonical records with confidence scores, and provide a merge plan. Do not execute destructive archive actions without explicit human approval.",
      servers: ["notion", "gmail"],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: "Half Dozen Dedup Agent",
      agentInstructions:
        "You are a deduplication and canonicalization agent for Half Dozen. Use schema-first workflows, include evidence for every merge recommendation, and avoid destructive writes unless explicitly approved.",
      blockedToolNames: [
        "notion_create_database",
        "notion_update_database",
        "delete_automation",
        "search",
        "fetch",
        "submit_feedback",
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: "templates/agent_contract_halfdozen_dedup.yaml",
      mcp_contract: "templates/mcp_contract_halfdozen_dedup.yaml",
      outcome_contract: "templates/outcome_contract_halfdozen_dedup.md",
      golden_tasks: "templates/golden_tasks_halfdozen_dedup.yaml",
    },
  },
  "inbox-triage": {
    description:
      "Inbox triage, sync, contact resolution, and policy-based escalation.",
    defaults: {
      query:
        "Triage unread client-relevant Gmail threads from the last 24 hours, summarize which threads should sync to Notion interactions, and identify any threads that require escalation instead of autonomous writes.",
      servers: ["gmail"],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: "Half Dozen Inbox Triage Agent",
      agentInstructions:
        "You are an inbox triage agent for Half Dozen. Prioritize policy-compliant thread handling, contact-linking safety, and concise evidence-based recommendations for escalation.",
      blockedToolNames: [
        "delete_automation",
        "notion_bulk_archive",
        "notion_update_database",
        "search",
        "fetch",
        "submit_feedback",
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract:
        "templates/agent_contract_halfdozen_inbox_triage.yaml",
      mcp_contract: "templates/mcp_contract_halfdozen_inbox_triage.yaml",
      outcome_contract:
        "templates/outcome_contract_halfdozen_inbox_triage.md",
      golden_tasks: "templates/golden_tasks_halfdozen_inbox_triage.yaml",
    },
  },
  "fleet-watchdog": {
    description:
      "Hourly reliability checks, anomaly detection, and incident-ready diagnostics.",
    defaults: {
      query:
        "Run a 24-hour fleet watchdog review using query_health, query_errors, query_activity, and query_trends before finalizing. Report degraded or unhealthy services, top recurring error clusters with counts, period-over-period regressions, and first remediation step per issue. If any required tool fails or returns no data, state that explicitly.",
      servers: ["telemetry"],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: "Half Dozen Fleet Watchdog Agent",
      agentInstructions:
        "You are a reliability watchdog for the Half Dozen MCP fleet. Before final output, call query_health, query_errors, query_activity, and query_trends. Tie every incident claim to tool evidence with concrete values, and provide concise remediation guidance without performing writes.",
      blockedToolNames: [
        "cleanup",
        "notion_bulk_archive",
        "delete_automation",
        "search",
        "fetch",
        "submit_feedback",
      ],
      requiredToolNames: [
        "query_health",
        "query_errors",
        "query_activity",
        "query_trends",
      ],
    },
    contractBundle: {
      agent_contract:
        "templates/agent_contract_halfdozen_fleet_watchdog.yaml",
      mcp_contract:
        "templates/mcp_contract_halfdozen_fleet_watchdog.yaml",
      outcome_contract:
        "templates/outcome_contract_halfdozen_fleet_watchdog.md",
      golden_tasks: "templates/golden_tasks_halfdozen_fleet_watchdog.yaml",
    },
  },
};

export function parseHalfDozenServerList(input: string): ServerKey[] {
  const requested = input
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const parsed: ServerKey[] = [];
  for (const item of requested) {
    if (!(item in SERVER_ENDPOINTS)) {
      const valid = Object.keys(SERVER_ENDPOINTS).join(", ");
      throw new Error(`Unknown server key "${item}". Valid values: ${valid}`);
    }
    parsed.push(item as ServerKey);
  }

  if (parsed.length === 0) {
    throw new Error("No valid servers specified.");
  }

  return parsed;
}

export function parseHalfDozenScenario(input: string): ScenarioKey {
  const normalized = input.trim().toLowerCase();
  if (!(normalized in SCENARIO_PRESETS)) {
    const valid = Object.keys(SCENARIO_PRESETS).join(", ");
    throw new Error(`Unknown scenario "${input}". Valid values: ${valid}`);
  }
  return normalized as ScenarioKey;
}

export function listHalfDozenServers(): Array<{
  key: string;
  url: string;
  description: string;
}> {
  return Object.entries(SERVER_ENDPOINTS).map(([key, value]) => ({
    key,
    url: value.url,
    description: value.description,
  }));
}

export function listHalfDozenScenarios(): Array<{
  key: string;
  description: string;
  default_servers: ServerKey[];
  default_model: string;
  default_max_turns: number;
  default_blocked_tools: string[];
  default_required_tools: string[];
  contract_bundle: ContractBundle;
}> {
  return Object.entries(SCENARIO_PRESETS).map(([key, preset]) => ({
    key,
    description: preset.description,
    default_servers: [...preset.defaults.servers],
    default_model: preset.defaults.model,
    default_max_turns: preset.defaults.maxTurns,
    default_blocked_tools: [...preset.defaults.blockedToolNames],
    default_required_tools: [...preset.defaults.requiredToolNames],
    contract_bundle: preset.contractBundle,
  }));
}

export function resolveHalfDozenRunOptions(
  request: HalfDozenRunRequest,
): HalfDozenResolvedOptions {
  let query = DEFAULT_QUERY;
  let servers = [...DEFAULT_SERVERS];
  let model = DEFAULT_MODEL;
  let maxTurns = DEFAULT_MAX_TURNS;
  let agentName = DEFAULT_AGENT_NAME;
  let agentInstructions = DEFAULT_AGENT_INSTRUCTIONS;
  let contractBundle: ContractBundle | undefined;
  let blockedToolNames = [...MULTI_SERVER_GENERIC_BLOCKLIST];
  let requiredToolNames: string[] = [];

  if (request.scenario) {
    const preset = SCENARIO_PRESETS[request.scenario];
    query = preset.defaults.query;
    servers = [...preset.defaults.servers];
    model = preset.defaults.model;
    maxTurns = preset.defaults.maxTurns;
    agentName = preset.defaults.agentName;
    agentInstructions = preset.defaults.agentInstructions;
    contractBundle = preset.contractBundle;
    blockedToolNames = [...preset.defaults.blockedToolNames];
    requiredToolNames = [...preset.defaults.requiredToolNames];
  }

  if (request.query !== undefined) {
    query = request.query;
  }
  if (request.servers !== undefined) {
    servers = request.servers;
  }
  if (request.model !== undefined) {
    model = request.model;
  }
  if (request.maxTurns !== undefined) {
    maxTurns = request.maxTurns;
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario: request.scenario,
    agentName,
    agentInstructions,
    contractBundle,
    blockedToolNames,
    requiredToolNames,
    timeoutMs: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    connectOnly: request.connectOnly ?? false,
    correlationId: request.correlationId,
    traceProjectName: request.traceProjectName,
    traceTags: request.traceTags,
  };
}

function createMcpServers(
  keys: ServerKey[],
  timeoutMs: number,
  blockedToolNames: string[],
): MCPServer[] {
  const useGenericMultiServerFilter = keys.length > 1;
  const blocked = new Set<string>(blockedToolNames);
  if (useGenericMultiServerFilter) {
    for (const tool of MULTI_SERVER_GENERIC_BLOCKLIST) {
      blocked.add(tool);
    }
  }
  const blockedList = [...blocked];
  const toolFilter =
    blockedList.length > 0 ? { blockedToolNames: blockedList } : undefined;

  return keys.map((key) => {
    const endpoint = SERVER_ENDPOINTS[key];
    return new MCPServerStreamableHttp({
      name: key,
      url: endpoint.url,
      cacheToolsList: true,
      timeout: timeoutMs,
      toolFilter,
    });
  });
}

function summarizeToolCalls(items: unknown[]): ToolCallSummary[] {
  return items
    .filter(
      (
        item,
      ): item is {
        type: string;
        rawItem?: { type?: string; name?: string; callId?: string };
      } => {
        return Boolean(
          item &&
            typeof item === "object" &&
            (item as { type?: unknown }).type === "tool_call_item",
        );
      },
    )
    .map((item) => ({
      type: item.rawItem?.type ?? "unknown",
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
        rawItem?: {
          type?: string;
          callId?: string;
          id?: string;
          status?: string;
          output?: unknown;
        };
        output?: unknown;
      } => {
        return Boolean(
          item &&
            typeof item === "object" &&
            (item as { type?: unknown }).type === "tool_call_output_item",
        );
      },
    )
    .map((item) => {
      const rawOutput = item.rawItem?.output;
      const topLevelOutput = item.output;
      const output =
        typeof rawOutput === "string"
          ? rawOutput
          : typeof topLevelOutput === "string"
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

function isSuccessfulToolOutput(
  output: ToolCallOutputSummary | undefined,
): boolean {
  if (!output) return false;

  const status = output.status?.toLowerCase();
  if (status === "completed") {
    return !hasErrorSignal(output.output);
  }
  if (status === "incomplete" || status === "failed") {
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
    if (
      call.callId &&
      isSuccessfulToolOutput(outputByCallId.get(call.callId))
    ) {
      successfulSet.add(call.name);
    }
  }

  const calledTools = [...calledSet].sort();
  const successfulTools = [...successfulSet].sort();
  const missingCalled = requiredToolNames.filter((name) => !calledSet.has(name));
  const missingSuccessful = requiredToolNames.filter(
    (name) => !successfulSet.has(name),
  );

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

function summarizeFailedRequiredCalls(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): Array<{
  tool: string;
  callId?: string;
  status?: string;
  output_excerpt?: string;
}> {
  if (requiredToolNames.length === 0) {
    return [];
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const failures: Array<{
    tool: string;
    callId?: string;
    status?: string;
    output_excerpt?: string;
  }> = [];
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

function summarizeRequiredToolCoverageLegacy(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
): {
  required_tools: string[];
  called_tools: string[];
  missing_required_tools: string[];
  all_required_tools_called: boolean;
} | null {
  if (requiredToolNames.length === 0) {
    return null;
  }

  const calledSet = new Set<string>(
    toolCalls
      .map((call) => call.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0),
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

export async function runHalfDozenScenario(
  request: HalfDozenRunRequest,
): Promise<HalfDozenRunSuccess> {
  const options = resolveHalfDozenRunOptions(request);

  if (!options.connectOnly && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const rawServers = createMcpServers(
    options.servers,
    options.timeoutMs,
    options.blockedToolNames,
  );
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
      throw new Error(
        `No MCP servers connected. Failures: ${JSON.stringify(failures, null, 2)}`,
      );
    }

    if (options.connectOnly) {
      const probeAgent = new Agent({
        name: options.agentName,
        instructions: options.agentInstructions,
        mcpServers: mcpServers.active,
      });
      const tools = await getAllMcpTools({
        mcpServers: mcpServers.active,
        runContext: new RunContext({}),
        agent: probeAgent,
      });
      const toolNames = tools.map((tool) => tool.name);
      const connected = mcpServers.active.map((server) => server.name);
      const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
        server: server.name,
        error: error.message,
      }));

      return {
        success: true,
        mode: "connect-only",
        scenario: options.scenario ?? null,
        contract_bundle: options.contractBundle ?? null,
        blocked_tools: options.blockedToolNames,
        required_tools: options.requiredToolNames,
        connected_servers: connected,
        failed_servers: failed,
        discovered_tools_count: toolNames.length,
        discovered_tools: toolNames,
        correlation_id: options.correlationId ?? null,
      };
    }

    const agent = new Agent({
      name: options.agentName,
      instructions: options.agentInstructions,
      model: options.model,
      mcpServers: mcpServers.active,
    });

    const braintrustTracingEnabled = await registerBraintrustTracing(
      options.traceProjectName ??
        process.env.BRAINTRUST_PROJECT_NAME ??
        "Create Something",
      [
        "halfdozen",
        options.scenario ?? "custom",
        ...(options.traceTags ?? []),
      ],
    );

    const runner = new Runner({ tracingDisabled: !braintrustTracingEnabled });
    const result = await runner.run(agent, options.query, {
      maxTurns: options.maxTurns,
    });

    const connected = mcpServers.active.map((server) => server.name);
    const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
      server: server.name,
      error: error.message,
    }));

    const toolCalls = summarizeToolCalls(result.newItems as unknown[]);
    const toolCallOutputs = summarizeToolCallOutputs(
      result.newItems as unknown[],
    );

    return {
      success: true,
      scenario: options.scenario ?? null,
      contract_bundle: options.contractBundle ?? null,
      blocked_tools: options.blockedToolNames,
      required_tools: options.requiredToolNames,
      required_tool_coverage: summarizeRequiredToolCoverage(
        options.requiredToolNames,
        toolCalls,
        toolCallOutputs,
      ),
      required_tool_coverage_called_only:
        summarizeRequiredToolCoverageLegacy(
          options.requiredToolNames,
          toolCalls,
        ),
      failed_required_tool_calls: summarizeFailedRequiredCalls(
        options.requiredToolNames,
        toolCalls,
        toolCallOutputs,
      ),
      model: options.model,
      prompt: options.query,
      connected_servers: connected,
      failed_servers: failed,
      tool_calls: toolCalls,
      final_output: result.finalOutput,
      correlation_id: options.correlationId ?? null,
    };
  } finally {
    await mcpServers.close();
  }
}

export function formatHalfDozenErrorResult(
  error: unknown,
  correlationId?: string,
): HalfDozenRunFailure {
  const message = error instanceof Error ? error.message : String(error);
  const hint = message.includes("not from a valid issuer")
    ? "OPENAI_API_KEY appears invalid for OpenAI APIs. Set a current key from https://platform.openai.com/api-keys and retry."
    : undefined;

  return {
    success: false,
    error: message,
    hint,
    correlation_id: correlationId ?? null,
  };
}
