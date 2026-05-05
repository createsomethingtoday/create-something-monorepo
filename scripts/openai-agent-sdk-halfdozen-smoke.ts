#!/usr/bin/env tsx

import {
  Agent,
  type MCPServer,
  MCPServerStreamableHttp,
  RunContext,
  Runner,
  connectMcpServers,
  getAllMcpTools,
} from '@openai/agents';

type ServerKey = 'telemetry' | 'youtube' | 'gmail' | 'zoom' | 'notion';
type ScenarioKey = 'dedup' | 'inbox-triage' | 'fleet-watchdog';

type ContractBundle = {
  agent_contract: string;
  mcp_contract: string;
  outcome_contract: string;
  golden_tasks: string;
};

type ScenarioPreset = {
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

type ParsedCliArgs = {
  query?: string;
  servers?: ServerKey[];
  model?: string;
  maxTurns?: number;
  scenario?: ScenarioKey;
  timeoutMs: number;
  listServers: boolean;
  listScenarios: boolean;
  connectOnly: boolean;
};

type CliOptions = {
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
};

const SERVER_ENDPOINTS: Record<ServerKey, { url: string; description: string }> = {
  telemetry: {
    url: 'https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp',
    description: 'Fleet health, usage, errors, trends',
  },
  youtube: {
    url: 'https://youtube.mcp.workway.co/mcp',
    description: 'YouTube transcript + Notion sync tools',
  },
  gmail: {
    url: 'https://gmail.mcp.workway.co/mcp',
    description: 'Gmail search/sync/automation tools',
  },
  zoom: {
    url: 'https://zoom.mcp.workway.co/mcp',
    description: 'Zoom clips sync + search tools',
  },
  notion: {
    url: 'https://createsomething-notion.mcp.workway.co/mcp',
    description: 'Half Dozen Notion CRUD tools',
  },
};

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MAX_TURNS = 8;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SERVERS: ServerKey[] = ['telemetry'];

const DEFAULT_QUERY =
  'Review the Half Dozen MCP fleet health for the last 24 hours. Identify any degraded or unhealthy servers and summarize top error patterns.';

const MULTI_SERVER_GENERIC_BLOCKLIST = ['search', 'fetch', 'submit_feedback'];

const DEFAULT_AGENT_NAME = 'Half Dozen MCP Ops Agent';
const DEFAULT_AGENT_INSTRUCTIONS =
  'You are an operations agent for Half Dozen. Use MCP tools for factual claims. Keep output concise and evidence-based.';

const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioPreset> = {
  dedup: {
    description: 'Duplicate detection, canonicalization, and safe merge planning.',
    defaults: {
      query:
        'Find likely duplicate contacts in the target Notion source, propose canonical records with confidence scores, and provide a merge plan. Do not execute destructive archive actions without explicit human approval.',
      servers: ['notion', 'gmail'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
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
    description: 'Inbox triage, sync, contact resolution, and policy-based escalation.',
    defaults: {
      query:
        'Triage unread client-relevant Gmail threads from the last 24 hours, summarize which threads should sync to Notion interactions, and identify any threads that require escalation instead of autonomous writes.',
      servers: ['gmail'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
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
    description: 'Hourly reliability checks, anomaly detection, and incident-ready diagnostics.',
    defaults: {
      query:
        'Run a 24-hour fleet watchdog review using query_health, query_errors, query_activity, and query_trends before finalizing. Report degraded or unhealthy services, top recurring error clusters with counts, period-over-period regressions, and first remediation step per issue. If any required tool fails or returns no data, state that explicitly.',
      servers: ['telemetry'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
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

function printUsage(): void {
  console.log(`Usage:
  pnpm exec tsx scripts/openai-agent-sdk-halfdozen-smoke.ts [options]

Options:
  --scenario "<name>"    Scenario preset (dedup,inbox-triage,fleet-watchdog)
  --query "<text>"       Prompt to run through the agent
  --servers "<list>"     Comma-separated server keys (telemetry,youtube,gmail,zoom,notion)
  --model "<name>"       Model name (default: ${DEFAULT_MODEL})
  --max-turns <number>   Max agent turns (default: ${DEFAULT_MAX_TURNS})
  --timeout-ms <number>  MCP request timeout in ms (default: ${DEFAULT_TIMEOUT_MS})
  --connect-only         Validate MCP connectivity + tool discovery only (no OpenAI call)
  --list-servers         Print available server keys and exit
  --list-scenarios       Print available scenarios and linked contract bundles
  --help                 Show this help
`);
}

function parseServerList(input: string): ServerKey[] {
  const requested = input
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const parsed: ServerKey[] = [];
  for (const item of requested) {
    if (!(item in SERVER_ENDPOINTS)) {
      const valid = Object.keys(SERVER_ENDPOINTS).join(', ');
      throw new Error(`Unknown server key "${item}". Valid values: ${valid}`);
    }
    parsed.push(item as ServerKey);
  }

  if (parsed.length === 0) {
    throw new Error('No valid servers specified.');
  }

  return parsed;
}

function parseScenario(input: string): ScenarioKey {
  const normalized = input.trim().toLowerCase();
  if (!(normalized in SCENARIO_PRESETS)) {
    const valid = Object.keys(SCENARIO_PRESETS).join(', ');
    throw new Error(`Unknown scenario "${input}". Valid values: ${valid}`);
  }
  return normalized as ScenarioKey;
}

function parseArgs(argv: string[]): ParsedCliArgs {
  let query: string | undefined;
  let servers: ServerKey[] | undefined;
  let model: string | undefined;
  let maxTurns: number | undefined;
  let scenario: ScenarioKey | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let listServers = false;
  let listScenarios = false;
  let connectOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--list-servers') {
      listServers = true;
      continue;
    }

    if (arg === '--list-scenarios') {
      listScenarios = true;
      continue;
    }

    if (arg === '--connect-only') {
      connectOnly = true;
      continue;
    }

    if (arg === '--scenario') {
      const raw = argv[i + 1] ?? '';
      scenario = parseScenario(raw);
      i += 1;
      continue;
    }

    if (arg === '--query') {
      query = argv[i + 1] ?? query;
      i += 1;
      continue;
    }

    if (arg === '--servers') {
      const raw = argv[i + 1] ?? '';
      servers = parseServerList(raw);
      i += 1;
      continue;
    }

    if (arg === '--model') {
      model = argv[i + 1] ?? model;
      i += 1;
      continue;
    }

    if (arg === '--max-turns') {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --max-turns value: ${argv[i + 1] ?? ''}`);
      }
      maxTurns = parsed;
      i += 1;
      continue;
    }

    if (arg === '--timeout-ms') {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1000) {
        throw new Error(`Invalid --timeout-ms value: ${argv[i + 1] ?? ''}`);
      }
      timeoutMs = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario,
    timeoutMs,
    listServers,
    listScenarios,
    connectOnly,
  };
}

function resolveOptions(args: ParsedCliArgs): CliOptions {
  let query = DEFAULT_QUERY;
  let servers = [...DEFAULT_SERVERS];
  let model = DEFAULT_MODEL;
  let maxTurns = DEFAULT_MAX_TURNS;
  let agentName = DEFAULT_AGENT_NAME;
  let agentInstructions = DEFAULT_AGENT_INSTRUCTIONS;
  let contractBundle: ContractBundle | undefined;
  let blockedToolNames = [...MULTI_SERVER_GENERIC_BLOCKLIST];
  let requiredToolNames: string[] = [];

  if (args.scenario) {
    const preset = SCENARIO_PRESETS[args.scenario];
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

  if (args.query !== undefined) {
    query = args.query;
  }
  if (args.servers !== undefined) {
    servers = args.servers;
  }
  if (args.model !== undefined) {
    model = args.model;
  }
  if (args.maxTurns !== undefined) {
    maxTurns = args.maxTurns;
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario: args.scenario,
    agentName,
    agentInstructions,
    contractBundle,
    blockedToolNames,
    requiredToolNames,
    timeoutMs: args.timeoutMs,
    connectOnly: args.connectOnly,
  };
}

function createMcpServers(keys: ServerKey[], timeoutMs: number, blockedToolNames: string[]): MCPServer[] {
  const useGenericMultiServerFilter = keys.length > 1;
  const blocked = new Set<string>(blockedToolNames);
  if (useGenericMultiServerFilter) {
    for (const tool of MULTI_SERVER_GENERIC_BLOCKLIST) {
      blocked.add(tool);
    }
  }
  const blockedList = [...blocked];
  const toolFilter = blockedList.length > 0 ? { blockedToolNames: blockedList } : undefined;

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

function getServerInfo(): Array<{ key: string; url: string; description: string }> {
  return Object.entries(SERVER_ENDPOINTS).map(([key, value]) => ({
    key,
    url: value.url,
    description: value.description,
  }));
}

function getScenarioInfo(): Array<{
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
      ): item is { type: string; rawItem?: { type?: string; callId?: string; id?: string; status?: string; output?: unknown }; output?: unknown } => {
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

  // Some output item variants may not expose a status; infer from payload.
  return !hasErrorSignal(output.output);
}

function summarizeRequiredToolCoverage(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): {
  required_tools: string[];
  called_tools: string[];
  successful_tools: string[];
  missing_required_tools: string[];
  missing_required_tool_success: string[];
  all_required_tools_called: boolean;
  all_required_tools_successful: boolean;
} | null {
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

function summarizeFailedRequiredCalls(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): Array<{ tool: string; callId?: string; status?: string; output_excerpt?: string }> {
  if (requiredToolNames.length === 0) {
    return [];
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const failures: Array<{ tool: string; callId?: string; status?: string; output_excerpt?: string }> = [];
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

function summarizeRequiredToolCoverageLegacy(requiredToolNames: string[], toolCalls: ToolCallSummary[]): {
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

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.listServers || parsedArgs.listScenarios) {
    const output: Record<string, unknown> = {};
    if (parsedArgs.listServers) {
      output.servers = getServerInfo();
    }
    if (parsedArgs.listScenarios) {
      output.scenarios = getScenarioInfo();
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const options = resolveOptions(parsedArgs);

  if (!options.connectOnly && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  const rawServers = createMcpServers(options.servers, options.timeoutMs, options.blockedToolNames);
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

      console.log(
        JSON.stringify(
          {
            success: true,
            mode: 'connect-only',
            scenario: options.scenario ?? null,
            contract_bundle: options.contractBundle ?? null,
            blocked_tools: options.blockedToolNames,
            required_tools: options.requiredToolNames,
            connected_servers: connected,
            failed_servers: failed,
            discovered_tools_count: toolNames.length,
            discovered_tools: toolNames,
          },
          null,
          2,
        ),
      );
      return;
    }

    const agent = new Agent({
      name: options.agentName,
      instructions: options.agentInstructions,
      model: options.model,
      mcpServers: mcpServers.active,
    });

    const { registerOpenAIAgentsBraintrustTracing } = await import(
      '@create-something/observability/openai-agents'
    );
    const braintrustTracingEnabled = registerOpenAIAgentsBraintrustTracing({
      projectName: process.env.BRAINTRUST_PROJECT_NAME ?? 'Create Something',
      tags: ['halfdozen', 'smoke']
    });

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
    const toolCallOutputs = summarizeToolCallOutputs(result.newItems as unknown[]);
    const requiredToolCoverage = summarizeRequiredToolCoverage(options.requiredToolNames, toolCalls, toolCallOutputs);
    const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(options.requiredToolNames, toolCalls);
    const failedRequiredCalls = summarizeFailedRequiredCalls(options.requiredToolNames, toolCalls, toolCallOutputs);

    console.log(
      JSON.stringify(
        {
          success: true,
          scenario: options.scenario ?? null,
          contract_bundle: options.contractBundle ?? null,
          blocked_tools: options.blockedToolNames,
          required_tools: options.requiredToolNames,
          required_tool_coverage: requiredToolCoverage,
          required_tool_coverage_called_only: requiredToolCoverageLegacy,
          failed_required_tool_calls: failedRequiredCalls,
          model: options.model,
          prompt: options.query,
          connected_servers: connected,
          failed_servers: failed,
          tool_calls: toolCalls,
          final_output: result.finalOutput,
        },
        null,
        2,
      ),
    );
  } finally {
    await mcpServers.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const hint =
    message.includes('not from a valid issuer')
      ? 'OPENAI_API_KEY appears invalid for OpenAI APIs. Set a current key from https://platform.openai.com/api-keys and retry.'
      : undefined;

  console.error(
    JSON.stringify(
      {
        success: false,
        error: message,
        hint,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
