import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const REQUIRED_TOOLS = ['query_health', 'query_errors', 'query_activity', 'query_trends'] as const;

type RequiredToolName = (typeof REQUIRED_TOOLS)[number];

type ToolCall = (name: string, args: Record<string, unknown>) => Promise<unknown>;

type HealthRow = {
  server?: string;
  status?: string;
  invocations?: number;
  errors?: number;
};

type ErrorPattern = {
  error?: string;
  occurrences?: number;
  servers?: string[];
  tools?: string[];
};

type TrendPoint = { period?: string; runs?: number };

type ToolCoverage = {
  required_tools: string[];
  called_tools: string[];
  successful_tools: string[];
  missing_required_tools: string[];
  missing_required_tool_success: string[];
  all_required_tools_called: boolean;
  all_required_tools_successful: boolean;
};

export type DeterministicFleetWatchdogResult = {
  success: true;
  scenario: 'fleet-watchdog';
  contract_bundle: {
    agent_contract: string;
    mcp_contract: string;
    outcome_contract: string;
    golden_tasks: string;
  };
  blocked_tools: string[];
  required_tools: string[];
  required_tool_coverage: ToolCoverage;
  required_tool_coverage_called_only: {
    required_tools: string[];
    called_tools: string[];
    missing_required_tools: string[];
    all_required_tools_called: boolean;
  };
  failed_required_tool_calls: Array<{
    tool: string;
    status: string;
    output_excerpt?: string;
  }>;
  requested_servers: string[];
  model: string;
  prompt: string;
  connected_servers: string[];
  failed_servers: Array<{ server: string; error: string }>;
  degraded: boolean;
  degraded_reason?: string;
  tool_calls: Array<{ type: string; name: string; callId: string }>;
  final_output: string;
};

export type DeterministicFleetWatchdogInput = {
  callTool?: ToolCall;
  telemetryMcpUrl?: string;
  timeoutMs?: number;
  now?: Date;
};

const DEFAULT_TELEMETRY_MCP_URL = 'https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp';
const DEFAULT_TIMEOUT_MS = 20_000;

const TOOL_ARGS: Record<RequiredToolName, Record<string, unknown>> = {
  query_health: { hours: 24 },
  query_errors: { hours: 24, limit: 50 },
  query_activity: { limit: 100 },
  query_trends: { periods: 3 }
};

function parseToolPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return value;
  const text = content.find(
    (item): item is { type: 'text'; text: string } =>
      Boolean(item && typeof item === 'object' && (item as { type?: unknown }).type === 'text') &&
      typeof (item as { text?: unknown }).text === 'string'
  )?.text;
  if (!text) return value;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toolFailureMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if ((value as { isError?: unknown }).isError === true) {
    const parsed = parseToolPayload(value);
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
  }
  const parsed = parseToolPayload(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const error = (parsed as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error.trim();
  }
  return null;
}

function healthRows(value: unknown): HealthRow[] {
  const parsed = parseToolPayload(value);
  if (Array.isArray(parsed)) return parsed as HealthRow[];
  return parsed && typeof parsed === 'object' ? [parsed as HealthRow] : [];
}

function objectPayload(value: unknown): Record<string, unknown> {
  const parsed = parseToolPayload(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function errorPatterns(value: unknown): ErrorPattern[] {
  const errors = objectPayload(value).errors;
  return Array.isArray(errors) ? (errors as ErrorPattern[]) : [];
}

function monthIndex(period: string | undefined): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return year * 12 + month - 1;
}

function usageRegressions(
  value: unknown,
  now: Date,
  eligibleServers: ReadonlySet<string>
): string[] {
  const trends = objectPayload(value).trends;
  if (!trends || typeof trends !== 'object' || Array.isArray(trends)) return [];
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const regressions: string[] = [];
  for (const [server, rawPoints] of Object.entries(trends)) {
    if (!eligibleServers.has(server)) continue;
    if (!Array.isArray(rawPoints) || rawPoints.length < 2) continue;
    const points = rawPoints as TrendPoint[];
    const current = Number(points[0]?.runs ?? 0);
    const previous = Number(points[1]?.runs ?? 0);
    if (points[0]?.period === currentPeriod) continue;
    const currentMonth = monthIndex(points[0]?.period);
    const previousMonth = monthIndex(points[1]?.period);
    if (currentMonth === null || previousMonth === null || currentMonth - previousMonth !== 1)
      continue;
    if (previous <= 0 || current >= previous) continue;
    const decline = Math.round(((previous - current) / previous) * 1000) / 10;
    regressions.push(`${server} usage down ${decline}% (${previous} to ${current} runs)`);
  }
  return regressions;
}

function buildCoverage(called: string[], successful: string[]): ToolCoverage {
  const missingRequiredTools = REQUIRED_TOOLS.filter((tool) => !called.includes(tool));
  const missingRequiredToolSuccess = REQUIRED_TOOLS.filter((tool) => !successful.includes(tool));
  return {
    required_tools: [...REQUIRED_TOOLS],
    called_tools: called,
    successful_tools: successful,
    missing_required_tools: missingRequiredTools,
    missing_required_tool_success: missingRequiredToolSuccess,
    all_required_tools_called: missingRequiredTools.length === 0,
    all_required_tools_successful: missingRequiredToolSuccess.length === 0
  };
}

export async function runDeterministicFleetWatchdog(
  input: DeterministicFleetWatchdogInput
): Promise<DeterministicFleetWatchdogResult> {
  if (!input.callTool) {
    const client = new Client(
      { name: 'halfdozen-deterministic-fleet-watchdog', version: '1.0.0' },
      { capabilities: {} }
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(input.telemetryMcpUrl ?? DEFAULT_TELEMETRY_MCP_URL)
    );
    await client.connect(transport);
    try {
      return await runDeterministicFleetWatchdog({
        ...input,
        callTool: (name, args) =>
          client.callTool({ name, arguments: args }, undefined, {
            timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS
          })
      });
    } finally {
      await client.close();
    }
  }

  const outputs = new Map<string, unknown>();
  const called: string[] = [];
  const successful: string[] = [];
  const failedRequiredCalls: DeterministicFleetWatchdogResult['failed_required_tool_calls'] = [];

  for (const tool of REQUIRED_TOOLS) {
    called.push(tool);
    try {
      const output = await input.callTool(tool, TOOL_ARGS[tool]);
      const failureMessage = toolFailureMessage(output);
      if (failureMessage) throw new Error(failureMessage);
      outputs.set(tool, output);
      successful.push(tool);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedRequiredCalls.push({
        tool,
        status: 'failed',
        output_excerpt: message.slice(0, 500)
      });
    }
  }

  const health = healthRows(outputs.get('query_health'));
  const errorsByPattern = errorPatterns(outputs.get('query_errors'));
  const healthServers = new Set(
    health.map((row) => row.server).filter((server): server is string => Boolean(server))
  );
  const regressions = usageRegressions(
    outputs.get('query_trends'),
    input.now ?? new Date(),
    healthServers
  );
  const invocations = health.reduce((sum, row) => sum + Number(row.invocations ?? 0), 0);
  const errors = health.reduce((sum, row) => sum + Number(row.errors ?? 0), 0);
  const degradedRows = health.filter((row) => !['healthy'].includes(String(row.status ?? '')));
  const healthMissing = health.length === 0;
  const coverage = buildCoverage(called, successful);
  const degraded =
    healthMissing || degradedRows.length > 0 || !coverage.all_required_tools_successful;
  const failureSummary = failedRequiredCalls
    .map((failure) => `${failure.tool} failed: ${failure.output_excerpt}`)
    .join(' ');
  const degradedServices = degradedRows
    .map((row) => `${row.server ?? 'unknown'} (${row.status ?? 'unknown'})`)
    .join(', ');
  const recurringErrors = errorsByPattern
    .map(
      (pattern) =>
        `${pattern.error ?? 'unknown error'} (${Number(pattern.occurrences ?? 0)} occurrences)`
    )
    .join(', ');
  const topError = errorsByPattern[0];
  const firstRemediation = topError
    ? `inspect ${topError.tools?.[0] ?? 'the failing tool'} on ${topError.servers?.[0] ?? 'the affected server'} for ${topError.error ?? 'the recurring error'}`
    : degradedRows.some((row) => row.status === 'no-data')
      ? `verify telemetry emission for ${degradedRows.find((row) => row.status === 'no-data')?.server ?? 'the no-data server'}`
      : healthMissing
        ? 'verify telemetry query_health data'
        : failedRequiredCalls.length > 0
          ? `restore ${failedRequiredCalls[0]?.tool ?? 'the failed telemetry query'}`
          : 'no operator action';

  return {
    success: true,
    scenario: 'fleet-watchdog',
    contract_bundle: {
      agent_contract: 'templates/agent_contract_halfdozen_fleet_watchdog.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_fleet_watchdog.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_fleet_watchdog.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_fleet_watchdog.yaml'
    },
    blocked_tools: [
      'cleanup',
      'notion_bulk_archive',
      'delete_automation',
      'search',
      'fetch',
      'submit_feedback'
    ],
    required_tools: [...REQUIRED_TOOLS],
    required_tool_coverage: coverage,
    required_tool_coverage_called_only: {
      required_tools: [...REQUIRED_TOOLS],
      called_tools: called,
      missing_required_tools: coverage.missing_required_tools,
      all_required_tools_called: coverage.all_required_tools_called
    },
    failed_required_tool_calls: failedRequiredCalls,
    requested_servers: ['telemetry'],
    model: 'deterministic',
    prompt: 'Scheduled deterministic 24-hour Fleet Watchdog review.',
    connected_servers: ['telemetry'],
    failed_servers: [],
    degraded,
    degraded_reason: degraded
      ? [
          `${degradedRows.length} telemetry server record(s) are degraded, unhealthy, or missing data.`,
          healthMissing ? 'query_health returned no server records.' : '',
          degradedServices ? `Affected: ${degradedServices}.` : '',
          failureSummary
        ]
          .filter(Boolean)
          .join(' ')
      : undefined,
    tool_calls: called.map((name) => ({ type: 'mcp_call', name, callId: name })),
    final_output: [
      `Fleet Watchdog: ${degraded ? 'DEGRADED' : 'HEALTHY'}`,
      `${invocations} invocations, ${errors} errors across ${health.length} server record(s).`,
      `Required telemetry coverage: ${coverage.all_required_tools_successful ? 'complete' : 'incomplete'}.`,
      recurringErrors ? `Recurring errors: ${recurringErrors}.` : 'Recurring errors: none.',
      regressions.length > 0
        ? `Period-over-period regressions: ${regressions.join(', ')}.`
        : 'Period-over-period regressions: none.',
      `First remediation: ${firstRemediation}.`,
      failureSummary
    ]
      .filter(Boolean)
      .join(' ')
  };
}
