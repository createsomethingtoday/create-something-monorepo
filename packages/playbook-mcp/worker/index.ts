/**
 * Playbook MCP — Cloudflare Worker
 *
 * Lightweight host workflow playbooks as a remote MCP server.
 * Ships alongside client MCPs for onboarding.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP (Claude Code, Codex)
 *   /sse  — SSE fallback (Cursor, Claude Desktop)
 *   /     — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';

import { flush as flushLangfuse } from '@create-something/observability/langfuse';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';
import { HOST_PLAYBOOKS } from '../src/playbooks.js';
import { MCP_CATALOG } from '../src/catalog.js';
import registryJson from '../../../config/mcp-hub/registry.json';
import fleetJson from '../../../config/mcp-hub/fleet.json';
import {
  runHalfDozenDedup,
  runHalfDozenFleetWatchdog,
  runHalfDozenInboxTriage
} from './halfdozenFleetWatchdog.js';
import type { HalfDozenScenarioRunResult } from './halfdozenFleetWatchdog.js';
import { runDeterministicFleetWatchdog } from './deterministicFleetWatchdog.js';
import { runScheduledDeterministicFleetWatchdog } from './scheduledFleetWatchdog.js';
import { inferredProxyToolCount, liveHubTotalServerCount } from './registrySweepTelemetry.js';
import { handleLangfuseAlertWebhook, type LangfuseMonitorAlert } from './langfuseAlertWebhook.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  ALERT_STATE_KV?: KVNamespace;
  MCP_ACCOUNT_ID?: string;
  OPENAI_API_KEY?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_ORG_NAME?: string;
  LANGFUSE_APP_URL?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_ENABLED?: string;
  LANGFUSE_ALERT_WEBHOOK_SECRET?: string;
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
  HALFDOZEN_TELEMETRY_MCP_URL?: string;
  HALFDOZEN_GMAIL_MCP_URL?: string;
  HALFDOZEN_NOTION_MCP_URL?: string;
  HALFDOZEN_SLACK_SIGNING_SECRET?: string;
  HALFDOZEN_SLACK_TEAM_ID?: string;
  INK_BRIDGE_ORIGIN?: string;
  INK_SOURCE_TOKEN?: string;
  INK_BRIDGE_TOKEN?: string;
  HALFDOZEN_FLEET_WATCHDOG_CRON_ENABLED?: string;
  HALFDOZEN_FLEET_WATCHDOG_CRON_UTC_HOURS?: string;
  RESEND_API_KEY?: string;
  HALFDOZEN_AGENT_NOTIFY_EMAIL_FROM?: string;
  HALFDOZEN_AGENT_NOTIFY_EMAIL_TO?: string;
  HALFDOZEN_AGENT_NOTIFY_EMAIL_REPLY_TO?: string;
  HALFDOZEN_AGENT_NOTIFY_EMAIL_MODE?: string;
  MCP_REGISTRY_SWEEP_HUB_HEALTH_URL?: string;
  MCP_REGISTRY_SWEEP_TIMEOUT_MS?: string;
  MCP_REGISTRY_SWEEP_CRON_ENABLED?: string;
  MCP_REGISTRY_SWEEP_CRON_UTC_HOURS?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

const HALFDOZEN_FLEET_WATCHDOG_ROUTE = '/clients/halfdozen/agents/fleet-watchdog/run';
const HALFDOZEN_INBOX_TRIAGE_ROUTE = '/clients/halfdozen/agents/inbox-triage/run';
const HALFDOZEN_DEDUP_ROUTE = '/clients/halfdozen/agents/dedup/run';
const HALFDOZEN_NOTIFY_TEST_ROUTE = '/clients/halfdozen/agents/notifications/test';
const HALFDOZEN_SLACK_COMMAND_ROUTE = '/clients/halfdozen/slack/commands';
const HALFDOZEN_FLEET_WATCHDOG_CRON_ROUTE = 'cron:clients/halfdozen/agents/fleet-watchdog';
const MCP_REGISTRY_SWEEP_ROUTE = '/create-something/agents/mcp-registry-sweep/run';
const LANGFUSE_ALERT_WEBHOOK_ROUTE = '/webhooks/langfuse/alerts';
const SLACK_TIMESTAMP_TOLERANCE_SECONDS = 300;
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';
const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails';
const DEFAULT_NOTIFY_EMAIL_FROM = 'CREATE SOMETHING Ops <notifications@createsomething.io>';
const DEFAULT_NOTIFY_EMAIL_TO = ['micah@createsomething.io'] as const;
const DEFAULT_MCP_REGISTRY_SWEEP_HUB_HEALTH_URL =
  'https://cs-mcp-hub-remote.createsomething.workers.dev/health';
const DEFAULT_MCP_REGISTRY_SWEEP_TIMEOUT_MS = 60_000;
const LANGFUSE_ALERT_STATE_TTL_SECONDS = 30 * 24 * 60 * 60;

const HALFDOZEN_PROTECTED_ROUTES = [
  HALFDOZEN_FLEET_WATCHDOG_ROUTE,
  HALFDOZEN_INBOX_TRIAGE_ROUTE,
  HALFDOZEN_DEDUP_ROUTE
] as const;

const HALFDOZEN_TOKEN_PROTECTED_ROUTES = [
  ...HALFDOZEN_PROTECTED_ROUTES,
  HALFDOZEN_NOTIFY_TEST_ROUTE
] as const;
const DEFAULT_INK_BRIDGE_ORIGIN = 'https://ink.createsomething.agency';
const DEFAULT_FLEET_WATCHDOG_CRON_UTC_HOURS = '4,13,18,23';
const DEFAULT_MCP_REGISTRY_SWEEP_CRON_UTC_HOURS = '4,13,18,23';
const MCP_HUB_REGISTRY = registryJson as McpHubRegistry;
const MCP_FLEET_REGISTRY = fleetJson as McpFleetRegistry;

const AGENT_HEALTH_SURFACES: AgentHealthSurface[] = [
  {
    id: 'agent.create-something.mcp-registry-sweep',
    name: 'CREATE SOMETHING MCP Registry Sweep',
    route: MCP_REGISTRY_SWEEP_ROUTE,
    schedule: 'scheduled'
  },
  {
    id: 'agent.halfdozen.fleet-watchdog',
    name: 'Half Dozen Fleet Watchdog Agent',
    route: HALFDOZEN_FLEET_WATCHDOG_ROUTE,
    schedule: 'scheduled'
  },
  {
    id: 'agent.halfdozen.inbox-triage',
    name: 'Half Dozen Inbox Triage Agent',
    route: HALFDOZEN_INBOX_TRIAGE_ROUTE,
    schedule: 'manual'
  },
  {
    id: 'agent.halfdozen.dedup',
    name: 'Half Dozen Dedup Agent',
    route: HALFDOZEN_DEDUP_ROUTE,
    schedule: 'manual'
  }
];

type McpHubRegistryServer = {
  transport?: string;
  url?: string;
  description?: string;
  tags?: string[];
  bearer_token_env_var?: string;
  catalog?: {
    include?: boolean;
    category?: string;
    requiresAuth?: boolean;
    authType?: string;
    slug?: string;
    name?: string;
  };
};

type McpHubRegistry = {
  servers?: Record<string, McpHubRegistryServer>;
  bundles?: Record<string, string[]>;
  defaults?: {
    enabledBundles?: string[];
    enabledServers?: string[];
    disabledServers?: string[];
  };
};

type McpFleetDeployment = {
  type?: string;
  status?: string;
  client?: string;
  tenant?: string;
  auth?: {
    bearer_token_env_var?: string;
  };
};

type McpFleetRegistry = {
  deployments?: Record<string, McpFleetDeployment>;
};

type McpRegistryConnectedServer = {
  name: string;
  tool_count: number | null;
};

type McpRegistryFailedServer = {
  server: string;
  error: string;
};

type McpRegistryInventory = {
  server_count: number;
  catalog_count: number;
  bundle_count: number;
  composio_toolkit_count: number;
  direct_server_count: number;
  http_server_count: number;
  stdio_server_count: number;
  auth_required_count: number;
  dormant_count: number;
  policy_os_only_count: number;
  create_something_count: number;
  workway_count: number;
  webflow_count: number;
  local_dev_count: number;
  remote_http_missing_url: string[];
  bundle_missing_servers: Array<{ bundle: string; server: string }>;
  default_enabled_bundles: string[];
  default_enabled_servers: string[];
};

type McpFleetInventory = {
  deployment_count: number;
  deployed_count: number;
  policy_os_hub_count: number;
  notion_mcp_count: number;
  auth_configured_count: number;
};

type AgentHealthSurface = {
  id: string;
  name: string;
  route: string;
  schedule: 'scheduled' | 'manual';
};

type AgentInventory = {
  registered_health_surface_count: number;
  scheduled_health_surface_count: number;
  manual_health_surface_count: number;
  surfaces: AgentHealthSurface[];
};

type LiveHubInventory = {
  enabled_server_count: number;
  connected_server_count: number;
  failed_server_count: number;
  proxy_tool_count: number | null;
  enabled_registered_count: number;
  enabled_unregistered_servers: string[];
  connected_unregistered_servers: string[];
  enabled_not_connected_servers: string[];
  failed_registered_servers: string[];
};

type McpRegistrySweepResult = {
  success: true;
  scenario: 'mcp-registry-sweep';
  checked_at: string;
  hub_health_url: string;
  status: 'healthy' | 'degraded' | 'failed';
  degraded: boolean;
  summary: string;
  detail: string;
  action: string;
  enabled_servers: string[];
  connected_servers: McpRegistryConnectedServer[];
  failed_servers: McpRegistryFailedServer[];
  proxy_tool_count: number | null;
  review_scope: string;
  registry_inventory: McpRegistryInventory;
  fleet_inventory: McpFleetInventory;
  agent_inventory: AgentInventory;
  live_hub: LiveHubInventory;
  warnings: string[];
  duration_ms: number;
};

const AgentRouteBodySchema = z.object({
  query: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  max_turns: z.number().int().min(1).max(30).optional(),
  timeout_ms: z.number().int().min(1_000).max(120_000).optional()
});

type AgentRouteBody = z.infer<typeof AgentRouteBodySchema>;

const NotificationTestBodySchema = z.object({
  message: z.string().min(1).max(500).optional()
});

type NotificationTestBody = z.infer<typeof NotificationTestBodySchema>;

type HalfDozenRouteRunInput = {
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

type ScenarioKey = 'fleet-watchdog' | 'inbox-triage' | 'dedup';

type NotificationEvent =
  | {
      kind: 'result';
      result: HalfDozenScenarioRunResult;
      route: string;
      runId: string;
      durationMs?: number;
    }
  | {
      kind: 'error';
      scenario: ScenarioKey;
      route: string;
      runId: string;
      errorMessage: string;
      durationMs?: number;
    };

type NotificationEmailResult = {
  sent: boolean;
  skippedReason?: string;
  providerId?: string;
};

type SlackPayload = {
  text: string;
  blocks?: Array<Record<string, unknown>>;
};

type SlackResponsePayload = SlackPayload & {
  response_type?: 'ephemeral' | 'in_channel';
  replace_original?: boolean;
};

type SlackCommandFields = {
  command?: string;
  text?: string;
  response_url?: string;
  team_id?: string;
  channel_id?: string;
  channel_name?: string;
  user_id?: string;
  user_name?: string;
};

type SlackAction = {
  action_id?: string;
  value?: string;
};

type SlackInteractionPayload = {
  type?: string;
  team?: { id?: string };
  channel?: { id?: string; name?: string };
  user?: { id?: string; username?: string; name?: string };
  response_url?: string;
  actions?: SlackAction[];
};

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function slackJsonResponse(data: SlackResponsePayload, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function scenarioLabel(scenario: ScenarioKey): string {
  if (scenario === 'fleet-watchdog') return 'Fleet Watchdog';
  if (scenario === 'inbox-triage') return 'Inbox Triage';
  return 'Dedup';
}

function scenarioRoute(scenario: ScenarioKey): string {
  if (scenario === 'fleet-watchdog') return HALFDOZEN_FLEET_WATCHDOG_ROUTE;
  if (scenario === 'inbox-triage') return HALFDOZEN_INBOX_TRIAGE_ROUTE;
  return HALFDOZEN_DEDUP_ROUTE;
}

function parseScenarioKey(value: string): ScenarioKey | null {
  const normalized = value.trim().toLowerCase();
  if (['fleet-watchdog', 'watchdog', 'fleet'].includes(normalized)) return 'fleet-watchdog';
  if (['inbox-triage', 'inbox', 'triage'].includes(normalized)) return 'inbox-triage';
  if (['dedup', 'de-dup', 'duplicate', 'duplicates'].includes(normalized)) return 'dedup';
  return null;
}

function parseSlackCommand(text: string): {
  scenario?: ScenarioKey;
  query?: string;
  showHelp: boolean;
} {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { showHelp: true };
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.toLowerCase();
  if (!first) return { showHelp: true };
  if (first === 'help' || first === '--help' || first === '-h') {
    return { showHelp: true };
  }

  const scenario = parseScenarioKey(first);
  if (!scenario) {
    return { showHelp: true };
  }

  const query = trimmed.slice(first.length).trim();
  return {
    scenario,
    query: query.length > 0 ? query : undefined,
    showHelp: false
  };
}

const textEncoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);

  // Include length mismatch in the accumulator so different-length values
  // still take the same loop path and fail without early return timing hints.
  let mismatch = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLength; i += 1) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    mismatch |= aByte ^ bByte;
  }
  return mismatch === 0;
}

function truncateText(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function parseCsvHourSet(value: string | undefined, fallback: string): Set<number> {
  const raw = value?.trim() || fallback;
  const hours = new Set<number>();
  for (const part of raw.split(',')) {
    const hour = Number(part.trim());
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      hours.add(hour);
    }
  }
  return hours;
}

function isFlagEnabled(value: string | undefined, fallback = true): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  return !['0', 'false', 'off', 'no'].includes(normalized);
}

function shouldRunFleetWatchdogCron(env: Env, scheduledTimeMs: number): boolean {
  if (!isFlagEnabled(env.HALFDOZEN_FLEET_WATCHDOG_CRON_ENABLED, true)) return false;
  const hours = parseCsvHourSet(
    env.HALFDOZEN_FLEET_WATCHDOG_CRON_UTC_HOURS,
    DEFAULT_FLEET_WATCHDOG_CRON_UTC_HOURS
  );
  return hours.has(new Date(scheduledTimeMs).getUTCHours());
}

function shouldRunMcpRegistrySweepCron(env: Env, scheduledTimeMs: number): boolean {
  if (!isFlagEnabled(env.MCP_REGISTRY_SWEEP_CRON_ENABLED, true)) return false;
  const hours = parseCsvHourSet(
    env.MCP_REGISTRY_SWEEP_CRON_UTC_HOURS,
    DEFAULT_MCP_REGISTRY_SWEEP_CRON_UTC_HOURS
  );
  return hours.has(new Date(scheduledTimeMs).getUTCHours());
}

function inkBridgeUrl(env: Env, path: string): string {
  const origin = env.INK_BRIDGE_ORIGIN?.trim() || DEFAULT_INK_BRIDGE_ORIGIN;
  return `${origin.replace(/\/+$/, '')}${path}`;
}

function inkBridgeToken(env: Env): string | undefined {
  return env.INK_SOURCE_TOKEN?.trim() || env.INK_BRIDGE_TOKEN?.trim() || undefined;
}

async function safeFlushLangfuse(context: string): Promise<void> {
  try {
    await flushLangfuse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[observability] Langfuse flush failed during ${context}: ${message}`);
  }
}

function getCoverageStatus(result: HalfDozenScenarioRunResult): string {
  const coverage = result.required_tool_coverage;
  if (!coverage) return 'n/a';
  if (coverage.all_required_tools_successful) return 'ok';
  return 'failed';
}

function hasRequiredCoverageFailure(result: HalfDozenScenarioRunResult): boolean {
  const coverage = result.required_tool_coverage;
  if (!coverage) return false;
  return !coverage.all_required_tools_called || !coverage.all_required_tools_successful;
}

function shouldEscalate(result: HalfDozenScenarioRunResult): boolean {
  return (
    result.degraded ||
    hasRequiredCoverageFailure(result) ||
    result.failed_required_tool_calls.length > 0
  );
}

function buildScenarioInkSnapshot(
  result: HalfDozenScenarioRunResult,
  route: string,
  runId: string
): Record<string, unknown> {
  const escalate = shouldEscalate(result);
  const label = scenarioLabel(result.scenario);
  const coverage = getCoverageStatus(result);
  const failedServers = result.failed_servers.map((item) => item.server);
  const finalOutput = String(result.final_output ?? '').trim();
  const statusLine = [
    `Coverage ${coverage}`,
    `connected ${result.connected_servers.length}/${result.requested_servers.length}`,
    failedServers.length > 0 ? `failed ${failedServers.join(', ')}` : 'failed none'
  ].join('; ');
  const detail = result.degraded_reason
    ? `${result.degraded_reason} ${finalOutput}`
    : `${statusLine}. ${finalOutput}`;

  return {
    id: `agent.halfdozen.${result.scenario}`,
    source: 'playbook-agent-route',
    component: `Half Dozen ${label} Agent`,
    status: escalate ? 'degraded' : 'healthy',
    summary: escalate ? `${label} needs operator attention` : `${label} clear`,
    detail: truncateText(detail, 240),
    severity: escalate ? 85 : 0,
    observed_at: Date.now(),
    payload: {
      kind: 'playbook_agent_report',
      scenario: result.scenario,
      route,
      run_id: runId,
      degraded: result.degraded,
      degraded_reason: result.degraded_reason ?? '',
      coverage,
      connected_servers: result.connected_servers,
      failed_servers: result.failed_servers,
      required_tool_coverage: result.required_tool_coverage,
      failed_required_tool_calls: result.failed_required_tool_calls,
      final_output_preview: truncateText(finalOutput, 1200),
      action: escalate ? 'Review Playbook agent report' : 'No operator action'
    }
  };
}

function buildScenarioErrorInkSnapshot(
  scenario: ScenarioKey,
  route: string,
  runId: string,
  errorMessage: string
): Record<string, unknown> {
  const label = scenarioLabel(scenario);
  return {
    id: `agent.halfdozen.${scenario}`,
    source: 'playbook-agent-route',
    component: `Half Dozen ${label} Agent`,
    status: 'failed',
    summary: `${label} failed`,
    detail: truncateText(errorMessage, 240),
    severity: 90,
    observed_at: Date.now(),
    payload: {
      kind: 'playbook_agent_report_error',
      scenario,
      route,
      run_id: runId,
      error: truncateText(errorMessage, 1200),
      action: 'Review Playbook agent route'
    }
  };
}

function buildSlackQuickActionElements(): Array<Record<string, unknown>> {
  return [
    {
      type: 'button',
      action_id: 'run_fleet_watchdog',
      text: { type: 'plain_text', text: 'Fleet Watchdog' },
      value: 'fleet-watchdog'
    },
    {
      type: 'button',
      action_id: 'run_inbox_triage',
      text: { type: 'plain_text', text: 'Inbox Triage' },
      value: 'inbox-triage'
    },
    {
      type: 'button',
      action_id: 'run_dedup',
      text: { type: 'plain_text', text: 'Dedup' },
      value: 'dedup'
    }
  ];
}

function buildSlackHelpResponse(command: string): SlackResponsePayload {
  return {
    response_type: 'ephemeral',
    text: 'Use the command with a scenario key: watchdog, inbox, or dedup.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*Half Dozen agent controls*\n' +
            `Run one of the following:\n` +
            `• \`${command} watchdog\`\n` +
            `• \`${command} inbox\`\n` +
            `• \`${command} dedup\`\n` +
            `Optional custom query:\n` +
            `• \`${command} watchdog investigate no-data servers only\``
        }
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements()
      }
    ]
  };
}

function buildSlackAcceptedResponse(
  scenario: ScenarioKey,
  runId: string,
  query?: string
): SlackResponsePayload {
  const queryLine = query ? `\nQuery override: ${truncateText(query, 180)}` : '';
  return {
    response_type: 'ephemeral',
    text: `Running ${scenarioLabel(scenario)} (${runId}).`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Starting *${scenarioLabel(scenario)}*.\nRun ID: \`${runId}\`${queryLine}`
        }
      }
    ]
  };
}

function buildSlackCompletedResponse(
  result: HalfDozenScenarioRunResult,
  runId: string,
  route: string
): SlackResponsePayload {
  const summary = truncateText(String(result.final_output ?? ''), 1400);
  const status = shouldEscalate(result) ? 'ALERT' : 'OK';
  const failedServers =
    result.failed_servers.length > 0
      ? result.failed_servers.map((item) => item.server).join(', ')
      : 'none';
  return {
    response_type: 'in_channel',
    text: `${status}: ${scenarioLabel(result.scenario)} run ${runId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${status}* ${scenarioLabel(result.scenario)}\nRun ID: \`${runId}\`\nRoute: \`${route}\``
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Degraded*\n${result.degraded ? 'yes' : 'no'}` },
          { type: 'mrkdwn', text: `*Coverage*\n${getCoverageStatus(result)}` },
          {
            type: 'mrkdwn',
            text: `*Connected Servers*\n${result.connected_servers.join(', ') || 'none'}`
          },
          { type: 'mrkdwn', text: `*Failed Servers*\n${failedServers}` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${summary || 'No final output.'}`
        }
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements()
      }
    ]
  };
}

function buildSlackRunFailedResponse(
  scenario: ScenarioKey,
  runId: string,
  errorMessage: string
): SlackResponsePayload {
  return {
    response_type: 'in_channel',
    text: `ALERT: ${scenarioLabel(scenario)} run failed ${runId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*ALERT* ${scenarioLabel(scenario)}\nRun ID: \`${runId}\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error*\n${truncateText(errorMessage, 1400)}`
        }
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements()
      }
    ]
  };
}

async function postSlackResponse(
  responseUrl: string,
  payload: SlackResponsePayload
): Promise<void> {
  const response = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack response_url failed (${response.status}): ${body}`);
  }
}

function getNotifyEmailMode(env: Env): 'off' | 'alerts' | 'all' {
  const configured = env.HALFDOZEN_AGENT_NOTIFY_EMAIL_MODE?.trim().toLowerCase();
  if (configured === 'off' || configured === 'false' || configured === '0') return 'off';
  if (configured === 'all') return 'all';
  return 'alerts';
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [...DEFAULT_NOTIFY_EMAIL_TO];
  const parsed = value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_NOTIFY_EMAIL_TO];
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildNotificationEmail(event: NotificationEvent): {
  subject: string;
  html: string;
  text: string;
} {
  const isError = event.kind === 'error';
  const scenario = isError ? event.scenario : event.result.scenario;
  const status = isError || shouldEscalate(event.result) ? 'ALERT' : 'OK';
  const title = `${status}: ${scenarioLabel(scenario)} ${event.runId}`;
  const fields = isError
    ? [
        ['Status', status],
        ['Route', event.route],
        ['Run ID', event.runId],
        ['Duration', event.durationMs === undefined ? 'unknown' : `${event.durationMs}ms`],
        ['Error', event.errorMessage]
      ]
    : [
        ['Status', status],
        ['Route', event.route],
        ['Run ID', event.runId],
        ['Degraded', event.result.degraded ? 'yes' : 'no'],
        ['Coverage', getCoverageStatus(event.result)],
        ['Connected Servers', event.result.connected_servers.join(', ') || 'none'],
        [
          'Failed Servers',
          event.result.failed_servers.map((item) => item.server).join(', ') || 'none'
        ],
        ['Duration', event.durationMs === undefined ? 'unknown' : `${event.durationMs}ms`]
      ];

  const summary = isError
    ? event.errorMessage
    : String(event.result.final_output ?? 'No final output.');
  const text = `${title}\n\n${fields.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${summary}`;
  const fieldRows = fields
    .map(([key, value]) => {
      return `<tr><td style="padding:6px 0;color:#737373">${htmlEscape(key)}</td><td style="padding:6px 0;color:#e5e5e5;text-align:right">${htmlEscape(value)}</td></tr>`;
    })
    .join('');

  return {
    subject: title,
    text,
    html: `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f5f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
          <tr><td style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#737373;padding-bottom:20px">CREATE SOMETHING Ops</td></tr>
          <tr>
            <td style="border:1px solid #262626;background:#0a0a0a;padding:28px;border-radius:10px">
              <div style="font-size:13px;color:${status === 'OK' ? '#22c55e' : '#f59e0b'}">${status}</div>
              <h1 style="font-size:22px;line-height:1.3;margin:10px 0 20px;color:#fff">${htmlEscape(scenarioLabel(scenario))}</h1>
              <table width="100%" cellpadding="0" cellspacing="0">${fieldRows}</table>
              <div style="border-top:1px solid #262626;margin:22px 0"></div>
              <div style="font-size:14px;line-height:1.65;color:#d4d4d4;white-space:pre-wrap">${htmlEscape(truncateText(summary, 1800))}</div>
            </td>
          </tr>
          <tr><td style="font-size:11px;color:#525252;padding-top:18px">Sent by Playbook MCP at ${new Date().toISOString()}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  };
}

async function sendNotificationEmail(
  env: Env,
  event: NotificationEvent
): Promise<NotificationEmailResult> {
  const mode = getNotifyEmailMode(env);
  if (mode === 'off') return { sent: false, skippedReason: 'email_notifications_off' };
  if (mode === 'alerts' && event.kind === 'result' && !shouldEscalate(event.result)) {
    return { sent: false, skippedReason: 'healthy_result_in_alerts_mode' };
  }
  if (!env.RESEND_API_KEY) {
    console.warn('Half Dozen email notify skipped: RESEND_API_KEY is not set.');
    return { sent: false, skippedReason: 'missing_resend_api_key' };
  }

  const email = buildNotificationEmail(event);
  const body: Record<string, unknown> = {
    from: env.HALFDOZEN_AGENT_NOTIFY_EMAIL_FROM?.trim() || DEFAULT_NOTIFY_EMAIL_FROM,
    to: parseEmailList(env.HALFDOZEN_AGENT_NOTIFY_EMAIL_TO),
    subject: email.subject,
    html: email.html,
    text: email.text,
    tags: [
      { name: 'surface', value: 'playbook-mcp' },
      { name: 'scenario', value: event.kind === 'error' ? event.scenario : event.result.scenario }
    ]
  };
  const replyTo = env.HALFDOZEN_AGENT_NOTIFY_EMAIL_REPLY_TO?.trim();
  if (replyTo) {
    body.replyTo = replyTo;
  }

  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `playbook-mcp:${event.runId}:${event.kind}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${responseText.slice(0, 500)}`);
  }

  const responseText = await response.text();
  let providerId: string | undefined;
  try {
    const parsed = JSON.parse(responseText) as { id?: unknown };
    providerId = typeof parsed.id === 'string' ? parsed.id : undefined;
  } catch {
    providerId = undefined;
  }

  return { sent: true, providerId };
}

async function sendLangfuseAlertEmail(env: Env, alert: LangfuseMonitorAlert): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const title = `${alert.payload.severity}: ${alert.payload.message.title}`;
  const permalink = alert.payload.permalink ?? 'not provided';
  const fields = [
    ['Project ID', alert.payload.projectId],
    ['Monitor ID', alert.payload.monitorId],
    ['Window', alert.payload.window ?? 'unknown'],
    ['Alert time', alert.payload.timestamp],
    ['Langfuse', permalink]
  ];
  const text = `${title}\n\n${fields.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${alert.payload.message.body}`;
  const fieldRows = fields
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 0;color:#737373">${htmlEscape(key)}</td><td style="padding:6px 0;color:#e5e5e5;text-align:right">${htmlEscape(value)}</td></tr>`
    )
    .join('');

  const body: Record<string, unknown> = {
    from: env.HALFDOZEN_AGENT_NOTIFY_EMAIL_FROM?.trim() || DEFAULT_NOTIFY_EMAIL_FROM,
    to: parseEmailList(env.HALFDOZEN_AGENT_NOTIFY_EMAIL_TO),
    subject: title,
    text,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f5f5"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%"><tr><td style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#737373;padding-bottom:20px">CREATE SOMETHING Ops</td></tr><tr><td style="border:1px solid #262626;background:#0a0a0a;padding:28px;border-radius:10px"><div style="font-size:13px;color:#f59e0b">${htmlEscape(alert.payload.severity)}</div><h1 style="font-size:22px;line-height:1.3;margin:10px 0 20px;color:#fff">${htmlEscape(alert.payload.message.title)}</h1><table width="100%" cellpadding="0" cellspacing="0">${fieldRows}</table><div style="border-top:1px solid #262626;margin:22px 0"></div><div style="font-size:14px;line-height:1.65;color:#d4d4d4;white-space:pre-wrap">${htmlEscape(truncateText(alert.payload.message.body, 1800))}</div></td></tr></table></td></tr></table></body></html>`,
    tags: [
      { name: 'surface', value: 'playbook-mcp' },
      { name: 'scenario', value: 'langfuse-alert' }
    ]
  };
  const replyTo = env.HALFDOZEN_AGENT_NOTIFY_EMAIL_REPLY_TO?.trim();
  if (replyTo) body.replyTo = replyTo;

  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `playbook-mcp:langfuse-alert:${alert.id}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Resend Langfuse alert email failed (${response.status}): ${responseText.slice(0, 500)}`
    );
  }
}

function queueEmailNotification(ctx: ExecutionContext, env: Env, event: NotificationEvent): void {
  ctx.waitUntil(
    sendNotificationEmail(env, event).catch((error) => {
      console.error('Half Dozen email notify failed', error);
    })
  );
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
  );
}

function normalizeConnectedServers(value: unknown): McpRegistryConnectedServer[] {
  return recordArray(value)
    .map((item) => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      return {
        name,
        tool_count: numberOrNull(item.tool_count ?? item.toolCount)
      };
    })
    .filter((item): item is McpRegistryConnectedServer => item !== null);
}

function normalizeFailedServers(value: unknown): McpRegistryFailedServer[] {
  return recordArray(value)
    .map((item) => {
      const server =
        typeof item.server === 'string'
          ? item.server.trim()
          : typeof item.name === 'string'
            ? item.name.trim()
            : '';
      if (!server) return null;
      const error =
        typeof item.error === 'string' && item.error.trim() ? item.error.trim() : 'Unavailable';
      return { server, error: truncateText(error, 160) };
    })
    .filter((item): item is McpRegistryFailedServer => item !== null);
}

function mcpRegistrySweepTimeoutMs(env: Env): number {
  const parsed = Number(env.MCP_REGISTRY_SWEEP_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed >= 5_000 && parsed <= 120_000) {
    return Math.round(parsed);
  }
  return DEFAULT_MCP_REGISTRY_SWEEP_TIMEOUT_MS;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ status: number; body: unknown; durationMs: number }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json'
      },
      signal: controller.signal
    });
    const text = await response.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: truncateText(text, 1000) };
    }
    return { status: response.status, body, durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function healthBodyRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function registryServerEntries(): Array<[string, McpHubRegistryServer]> {
  return Object.entries(MCP_HUB_REGISTRY.servers ?? {});
}

function registryTags(server: McpHubRegistryServer): string[] {
  return Array.isArray(server.tags)
    ? server.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
}

function registryHasTag(server: McpHubRegistryServer, tag: string): boolean {
  return registryTags(server).includes(tag);
}

function registryServerRequiresAuth(server: McpHubRegistryServer): boolean {
  return Boolean(server.bearer_token_env_var || server.catalog?.requiresAuth);
}

function buildMcpRegistryInventory(): McpRegistryInventory {
  const servers = registryServerEntries();
  const serverMap = new Map(servers);
  const bundles = Object.entries(MCP_HUB_REGISTRY.bundles ?? {});
  const bundleMissingServers: Array<{ bundle: string; server: string }> = [];

  for (const [bundle, bundleServers] of bundles) {
    for (const server of Array.isArray(bundleServers) ? bundleServers : []) {
      if (!serverMap.has(server)) {
        bundleMissingServers.push({ bundle, server });
      }
    }
  }

  const composioToolkitCount = servers.filter(([id, server]) => {
    return id.startsWith('composio-toolkit-') || registryHasTag(server, 'composio');
  }).length;
  const httpServers = servers.filter(([, server]) => server.transport === 'http');
  const stdioServers = servers.filter(([, server]) => server.transport === 'stdio');

  return {
    server_count: servers.length,
    catalog_count: servers.filter(([, server]) => server.catalog?.include).length,
    bundle_count: bundles.length,
    composio_toolkit_count: composioToolkitCount,
    direct_server_count: servers.length - composioToolkitCount,
    http_server_count: httpServers.length,
    stdio_server_count: stdioServers.length,
    auth_required_count: servers.filter(([, server]) => registryServerRequiresAuth(server)).length,
    dormant_count: servers.filter(([, server]) => registryHasTag(server, 'dormant')).length,
    policy_os_only_count: servers.filter(([, server]) => registryHasTag(server, 'policy_os_only'))
      .length,
    create_something_count: servers.filter(([, server]) => registryHasTag(server, 'cs')).length,
    workway_count: servers.filter(([, server]) => registryHasTag(server, 'workway')).length,
    webflow_count: servers.filter(([, server]) => registryHasTag(server, 'webflow')).length,
    local_dev_count: servers.filter(
      ([, server]) =>
        server.transport === 'stdio' ||
        registryHasTag(server, 'local') ||
        registryHasTag(server, 'dev')
    ).length,
    remote_http_missing_url: httpServers
      .filter(([, server]) => typeof server.url !== 'string' || server.url.trim().length === 0)
      .map(([id]) => id),
    bundle_missing_servers: bundleMissingServers.slice(0, 20),
    default_enabled_bundles: stringArray(MCP_HUB_REGISTRY.defaults?.enabledBundles),
    default_enabled_servers: stringArray(MCP_HUB_REGISTRY.defaults?.enabledServers)
  };
}

function buildMcpFleetInventory(): McpFleetInventory {
  const deployments = Object.values(MCP_FLEET_REGISTRY.deployments ?? {});
  return {
    deployment_count: deployments.length,
    deployed_count: deployments.filter((deployment) => deployment.status === 'deployed').length,
    policy_os_hub_count: deployments.filter((deployment) => deployment.type === 'policy_os_hub')
      .length,
    notion_mcp_count: deployments.filter((deployment) => deployment.type === 'notion_mcp').length,
    auth_configured_count: deployments.filter((deployment) =>
      Boolean(deployment.auth?.bearer_token_env_var)
    ).length
  };
}

function buildAgentInventory(): AgentInventory {
  const scheduled = AGENT_HEALTH_SURFACES.filter((surface) => surface.schedule === 'scheduled');
  const manual = AGENT_HEALTH_SURFACES.filter((surface) => surface.schedule === 'manual');
  return {
    registered_health_surface_count: AGENT_HEALTH_SURFACES.length,
    scheduled_health_surface_count: scheduled.length,
    manual_health_surface_count: manual.length,
    surfaces: AGENT_HEALTH_SURFACES
  };
}

function buildLiveHubInventory(
  enabledServers: string[],
  connectedServers: McpRegistryConnectedServer[],
  failedServers: McpRegistryFailedServer[],
  proxyToolCount: number | null
): LiveHubInventory {
  const registryNames = new Set(registryServerEntries().map(([name]) => name));
  const connectedNames = new Set(connectedServers.map((server) => server.name));
  const failedNames = new Set(failedServers.map((server) => server.server));
  const registeredEnabled = enabledServers.filter((server) => registryNames.has(server));

  return {
    enabled_server_count: enabledServers.length,
    connected_server_count: connectedServers.length,
    failed_server_count: failedServers.length,
    proxy_tool_count: proxyToolCount,
    enabled_registered_count: registeredEnabled.length,
    enabled_unregistered_servers: enabledServers
      .filter((server) => !registryNames.has(server))
      .slice(0, 20),
    connected_unregistered_servers: connectedServers
      .map((server) => server.name)
      .filter((server) => !registryNames.has(server))
      .slice(0, 20),
    enabled_not_connected_servers: enabledServers
      .filter((server) => !connectedNames.has(server) && !failedNames.has(server))
      .slice(0, 20),
    failed_registered_servers: failedServers
      .map((server) => server.server)
      .filter((server) => registryNames.has(server))
      .slice(0, 20)
  };
}

function buildMcpRegistryWarnings(
  registryInventory: McpRegistryInventory,
  liveHub: LiveHubInventory,
  hubWarnings: string[]
): string[] {
  const warnings = hubWarnings.filter(
    (warning) => warning !== 'Unknown disabled server "[]" in hub state'
  );
  if (registryInventory.remote_http_missing_url.length > 0) {
    warnings.push(
      `Remote HTTP registry entries missing URL: ${registryInventory.remote_http_missing_url.join(', ')}`
    );
  }
  if (registryInventory.bundle_missing_servers.length > 0) {
    warnings.push(
      `${registryInventory.bundle_missing_servers.length} bundle references point to missing servers.`
    );
  }
  if (liveHub.enabled_unregistered_servers.length > 0) {
    warnings.push(
      `Live Hub enabled unregistered servers: ${liveHub.enabled_unregistered_servers.join(', ')}`
    );
  }
  if (liveHub.connected_unregistered_servers.length > 0) {
    warnings.push(
      `Live Hub connected unregistered servers: ${liveHub.connected_unregistered_servers.join(', ')}`
    );
  }
  if (liveHub.enabled_not_connected_servers.length > 0) {
    warnings.push(
      `Live Hub enabled servers not connected: ${liveHub.enabled_not_connected_servers.join(', ')}`
    );
  }
  return uniqueStrings(warnings).map((warning) => truncateText(warning, 220));
}

function emptyLiveHubInventory(): LiveHubInventory {
  return {
    enabled_server_count: 0,
    connected_server_count: 0,
    failed_server_count: 0,
    proxy_tool_count: null,
    enabled_registered_count: 0,
    enabled_unregistered_servers: [],
    connected_unregistered_servers: [],
    enabled_not_connected_servers: [],
    failed_registered_servers: []
  };
}

async function runMcpRegistrySweep(env: Env): Promise<McpRegistrySweepResult> {
  const hubHealthUrl =
    env.MCP_REGISTRY_SWEEP_HUB_HEALTH_URL?.trim() || DEFAULT_MCP_REGISTRY_SWEEP_HUB_HEALTH_URL;
  const timeoutMs = mcpRegistrySweepTimeoutMs(env);
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  const registryInventory = buildMcpRegistryInventory();
  const fleetInventory = buildMcpFleetInventory();
  const agentInventory = buildAgentInventory();
  const reviewScope =
    'Full static MCP registry inventory, fleet registry inventory, registered Playbook agent health surfaces, and live Hub enabled-server health.';

  try {
    const response = await fetchJsonWithTimeout(hubHealthUrl, timeoutMs);
    const body = healthBodyRecord(response.body);
    const enabledServers = stringArray(body.enabled_servers ?? body.enabledServerNames);
    const connectedServers = normalizeConnectedServers(
      body.connected_servers ?? body.connectedServers
    );
    const failedServers = normalizeFailedServers(body.failed_servers ?? body.failedServers);
    const warnings = stringArray(body.warnings);
    const proxyToolCount =
      numberOrNull(body.proxy_tool_count ?? body.proxyToolCount) ??
      inferredProxyToolCount(connectedServers);
    const liveHub = buildLiveHubInventory(
      enabledServers,
      connectedServers,
      failedServers,
      proxyToolCount
    );
    const registryWarnings = buildMcpRegistryWarnings(registryInventory, liveHub, warnings);
    const registryHasStructuralIssue =
      registryInventory.remote_http_missing_url.length > 0 ||
      registryInventory.bundle_missing_servers.length > 0 ||
      liveHub.enabled_unregistered_servers.length > 0 ||
      liveHub.connected_unregistered_servers.length > 0;
    const degraded =
      response.status !== 200 || failedServers.length > 0 || registryHasStructuralIssue;
    const failedList = failedServers
      .map((item) => item.server)
      .slice(0, 4)
      .join(', ');
    const totalServers = liveHubTotalServerCount(enabledServers, connectedServers, failedServers);
    const baseDetail = `Registry: ${registryInventory.server_count} MCPs (${registryInventory.composio_toolkit_count} Composio), ${fleetInventory.deployed_count} fleet, ${agentInventory.registered_health_surface_count} agents. Live: ${connectedServers.length}/${totalServers} connected; ${failedServers.length} failed; ${proxyToolCount ?? 0} tools.`;
    const detail = degraded && failedList ? `${baseDetail} Failed: ${failedList}.` : baseDetail;
    const status = response.status !== 200 ? 'failed' : degraded ? 'degraded' : 'healthy';

    return {
      success: true,
      scenario: 'mcp-registry-sweep',
      checked_at: checkedAt,
      hub_health_url: hubHealthUrl,
      status,
      degraded,
      summary: degraded ? 'MCP registry needs attention' : 'MCP registry clear',
      detail: truncateText(detail, 240),
      action:
        failedServers.length > 0
          ? 'Review failed Hub MCP servers'
          : registryHasStructuralIssue
            ? 'Review MCP registry configuration'
            : 'No operator action',
      enabled_servers: enabledServers,
      connected_servers: connectedServers,
      failed_servers: failedServers,
      proxy_tool_count: proxyToolCount,
      review_scope: reviewScope,
      registry_inventory: registryInventory,
      fleet_inventory: fleetInventory,
      agent_inventory: agentInventory,
      live_hub: liveHub,
      warnings: registryWarnings,
      duration_ms: response.durationMs
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedServers = [{ server: 'create-something-hub', error: truncateText(message, 160) }];
    const liveHub = emptyLiveHubInventory();
    return {
      success: true,
      scenario: 'mcp-registry-sweep',
      checked_at: checkedAt,
      hub_health_url: hubHealthUrl,
      status: 'failed',
      degraded: true,
      summary: 'MCP registry sweep failed',
      detail: truncateText(message || 'Hub health request failed.', 240),
      action: 'Review Hub MCP health endpoint',
      enabled_servers: [],
      connected_servers: [],
      failed_servers: failedServers,
      proxy_tool_count: null,
      review_scope: reviewScope,
      registry_inventory: registryInventory,
      fleet_inventory: fleetInventory,
      agent_inventory: agentInventory,
      live_hub: liveHub,
      warnings: buildMcpRegistryWarnings(registryInventory, liveHub, []),
      duration_ms: Date.now() - startedAt
    };
  }
}

function buildMcpRegistrySweepInkSnapshot(result: McpRegistrySweepResult): Record<string, unknown> {
  return {
    id: 'agent.create-something.mcp-registry-sweep',
    source: 'playbook-agent-route',
    component: 'CREATE SOMETHING MCP Registry Sweep',
    status: result.degraded ? result.status : 'healthy',
    summary: result.summary,
    detail: result.detail,
    severity: result.degraded ? 85 : 0,
    observed_at: Date.now(),
    payload: {
      kind: 'mcp_registry_sweep',
      hub_health_url: result.hub_health_url,
      checked_at: result.checked_at,
      review_scope: result.review_scope,
      registry_inventory: result.registry_inventory,
      fleet_inventory: result.fleet_inventory,
      agent_inventory: result.agent_inventory,
      live_hub: result.live_hub,
      enabled_servers: result.enabled_servers,
      connected_servers: result.connected_servers,
      failed_servers: result.failed_servers,
      proxy_tool_count: result.proxy_tool_count,
      warnings: result.warnings,
      duration_ms: result.duration_ms,
      action: result.action
    }
  };
}

async function postInkHealthSnapshot(env: Env, snapshot: Record<string, unknown>): Promise<void> {
  const token = inkBridgeToken(env);
  if (!token) {
    console.warn(
      'Ink health snapshot skipped: INK_SOURCE_TOKEN or INK_BRIDGE_TOKEN is not configured.'
    );
    return;
  }

  const response = await fetch(inkBridgeUrl(env, '/ink/health-snapshot'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(snapshot)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ink health snapshot failed (${response.status}): ${body}`);
  }

  const reviewResponse = await fetch(inkBridgeUrl(env, '/ink/health-review/run?collect=false'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!reviewResponse.ok) {
    const body = await reviewResponse.text();
    throw new Error(`Ink health review refresh failed (${reviewResponse.status}): ${body}`);
  }
}

async function verifySlackSignature(
  request: Request,
  rawBody: string,
  signingSecret?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!signingSecret) {
    return {
      ok: false,
      error: 'Server misconfigured: HALFDOZEN_SLACK_SIGNING_SECRET is not set.'
    };
  }

  const signature = request.headers.get('X-Slack-Signature');
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  if (!signature || !timestamp) {
    return {
      ok: false,
      error: 'Missing Slack signature headers.'
    };
  }

  const timestampSec = Number(timestamp);
  if (!Number.isFinite(timestampSec)) {
    return {
      ok: false,
      error: 'Invalid Slack timestamp header.'
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > SLACK_TIMESTAMP_TOLERANCE_SECONDS) {
    return {
      ok: false,
      error: 'Slack request timestamp is outside allowed tolerance window.'
    };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const baseString = `v0:${timestamp}:${rawBody}`;
  const digestBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString))
  );
  const digestHex = [...digestBytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  const expectedSignature = `v0=${digestHex}`;

  if (!timingSafeEqual(signature, expectedSignature)) {
    return {
      ok: false,
      error: 'Slack signature mismatch.'
    };
  }

  return { ok: true };
}

function queueSuccessNotifications(
  ctx: ExecutionContext,
  env: Env,
  result: HalfDozenScenarioRunResult,
  route: string,
  runId: string,
  durationMs?: number
): void {
  queueEmailNotification(ctx, env, { kind: 'result', result, route, runId, durationMs });
  const inkSnapshot = buildScenarioInkSnapshot(result, route, runId);

  ctx.waitUntil(
    (async () => {
      try {
        await postInkHealthSnapshot(env, inkSnapshot);
      } catch (error) {
        console.error('Half Dozen Ink snapshot failed', error);
      }
    })()
  );
}

function queueErrorNotification(
  ctx: ExecutionContext,
  env: Env,
  scenario: ScenarioKey,
  route: string,
  runId: string,
  errorMessage: string,
  durationMs?: number
): void {
  queueEmailNotification(ctx, env, {
    kind: 'error',
    scenario,
    route,
    runId,
    errorMessage,
    durationMs
  });
  const inkSnapshot = buildScenarioErrorInkSnapshot(scenario, route, runId, errorMessage);
  ctx.waitUntil(
    (async () => {
      try {
        await postInkHealthSnapshot(env, inkSnapshot);
      } catch (error) {
        console.error('Half Dozen Ink error snapshot failed', error);
      }
    })()
  );
}

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  const apiKey = request.headers.get('X-API-Key')?.trim();
  return apiKey && apiKey.length > 0 ? apiKey : null;
}

function validateRouteToken(request: Request, expectedToken?: string): Response | null {
  if (!expectedToken) {
    return jsonResponse(
      {
        success: false,
        error: 'Server misconfigured: HALFDOZEN_AGENT_ROUTE_TOKEN is not set.'
      },
      500
    );
  }

  const actualToken = getAuthToken(request);
  if (!actualToken || !timingSafeEqual(actualToken, expectedToken)) {
    return jsonResponse(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Valid Bearer token or X-API-Key header is required.'
      },
      401,
      { 'WWW-Authenticate': 'Bearer realm="playbook-halfdozen"' }
    );
  }

  return null;
}

function isHalfDozenScenarioRoute(
  pathname: string
): pathname is (typeof HALFDOZEN_PROTECTED_ROUTES)[number] {
  return (HALFDOZEN_PROTECTED_ROUTES as readonly string[]).includes(pathname);
}

async function parseAgentRouteBody(request: Request): Promise<AgentRouteBody> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  const raw = await request.text();
  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  return AgentRouteBodySchema.parse(parsed);
}

async function parseNotificationTestBody(request: Request): Promise<NotificationTestBody> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  const raw = await request.text();
  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  return NotificationTestBodySchema.parse(parsed);
}

function parseScenarioFromRoute(pathname: string): ScenarioKey {
  if (pathname === HALFDOZEN_FLEET_WATCHDOG_ROUTE) return 'fleet-watchdog';
  if (pathname === HALFDOZEN_INBOX_TRIAGE_ROUTE) return 'inbox-triage';
  return 'dedup';
}

async function runScenarioByKey(
  scenario: ScenarioKey,
  input: HalfDozenRouteRunInput
): Promise<HalfDozenScenarioRunResult> {
  if (scenario === 'fleet-watchdog') {
    return runHalfDozenFleetWatchdog(input);
  }
  if (scenario === 'inbox-triage') {
    return runHalfDozenInboxTriage(input);
  }
  return runHalfDozenDedup(input);
}

function buildHalfDozenRunInput(
  env: Env,
  body: AgentRouteBody | { query?: string }
): HalfDozenRouteRunInput {
  return {
    openaiApiKey: env.OPENAI_API_KEY as string,
    telemetryMcpUrl: env.HALFDOZEN_TELEMETRY_MCP_URL,
    gmailMcpUrl: env.HALFDOZEN_GMAIL_MCP_URL,
    notionMcpUrl: env.HALFDOZEN_NOTION_MCP_URL,
    query: body.query,
    model: 'model' in body ? body.model : undefined,
    maxTurns: 'max_turns' in body ? body.max_turns : undefined,
    timeoutMs: 'timeout_ms' in body ? body.timeout_ms : undefined
  };
}

function resolveTelemetryAccountId(env: Env): string {
  return env.MCP_ACCOUNT_ID?.trim() || 'operator';
}

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function recordFleetWatchdogRunEvidence(
  env: Env,
  args: {
    runId: string;
    route: string;
    cron?: string;
    success: boolean;
    durationMs: number;
    result?: HalfDozenScenarioRunResult;
    errorMessage?: string;
  }
): Promise<void> {
  if (!env.TELEMETRY_DB) return;

  const accountId = resolveTelemetryAccountId(env);
  const metadata = {
    run_id: args.runId,
    route: args.route,
    cron: args.cron,
    scenario: 'fleet-watchdog',
    source: 'scheduled_worker',
    degraded: args.result?.degraded ?? null,
    coverage: args.result ? getCoverageStatus(args.result) : null,
    connected_servers: args.result?.connected_servers ?? [],
    failed_servers: args.result?.failed_servers ?? [],
    required_tool_coverage: args.result?.required_tool_coverage ?? null
  };

  try {
    await env.TELEMETRY_DB.prepare(
      `INSERT INTO mcp_tool_invocations
         (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        'playbook',
        accountId,
        'scheduled_fleet_watchdog',
        args.success ? 1 : 0,
        args.durationMs,
        args.errorMessage ?? null,
        args.runId,
        args.runId,
        JSON.stringify(metadata)
      )
      .run();

    await env.TELEMETRY_DB.prepare(
      `INSERT INTO mcp_run_counts (server_name, account_id, period_start, runs_this_period, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'))
       ON CONFLICT(server_name, account_id, period_start)
       DO UPDATE SET
         runs_this_period = mcp_run_counts.runs_this_period + 1,
         updated_at = datetime('now')`
    )
      .bind('playbook', accountId, getCurrentPeriod())
      .run();
  } catch (error) {
    console.error('Half Dozen fleet watchdog evidence write failed', error);
  }
}

async function recordNotificationTestEvidence(
  env: Env,
  args: {
    runId: string;
    route: string;
    success: boolean;
    durationMs: number;
    providerId?: string;
    skippedReason?: string;
    errorMessage?: string;
  }
): Promise<void> {
  if (!env.TELEMETRY_DB) return;

  const metadata = {
    run_id: args.runId,
    route: args.route,
    source: 'manual_notification_verification',
    notification_provider: 'resend',
    notification_mode: getNotifyEmailMode(env),
    recipient_count: parseEmailList(env.HALFDOZEN_AGENT_NOTIFY_EMAIL_TO).length,
    provider_id: args.providerId ?? null,
    skipped_reason: args.skippedReason ?? null
  };

  try {
    await env.TELEMETRY_DB.prepare(
      `INSERT INTO mcp_tool_invocations
         (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        'playbook',
        resolveTelemetryAccountId(env),
        'resend_notification_test',
        args.success ? 1 : 0,
        args.durationMs,
        args.errorMessage ?? args.skippedReason ?? null,
        args.runId,
        args.runId,
        JSON.stringify(metadata)
      )
      .run();
  } catch (error) {
    console.error('Half Dozen notification test evidence write failed', error);
  }
}

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

function isLangfuseRouteTracingEnabled(env: Env): boolean {
  const enabled = env.LANGFUSE_ENABLED?.trim().toLowerCase();
  if (enabled === 'false' || enabled === '0' || enabled === 'off') return false;
  return Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
}

function parseSlackCommandFields(rawBody: string): SlackCommandFields {
  const params = new URLSearchParams(rawBody);
  return {
    command: params.get('command') ?? undefined,
    text: params.get('text') ?? undefined,
    response_url: params.get('response_url') ?? undefined,
    team_id: params.get('team_id') ?? undefined,
    channel_id: params.get('channel_id') ?? undefined,
    channel_name: params.get('channel_name') ?? undefined,
    user_id: params.get('user_id') ?? undefined,
    user_name: params.get('user_name') ?? undefined
  };
}

function parseSlackInteractionPayload(rawBody: string): SlackInteractionPayload {
  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload') ?? '{}';
  return JSON.parse(payloadRaw) as SlackInteractionPayload;
}

function validateSlackTeam(teamId: string | undefined, expectedTeamId?: string): Response | null {
  if (!expectedTeamId) return null;
  if (teamId === expectedTeamId) return null;

  return jsonResponse(
    {
      success: false,
      error: 'Unauthorized Slack workspace.'
    },
    401
  );
}

function parseScenarioFromSlackAction(action: SlackAction | undefined): ScenarioKey | null {
  if (!action) return null;
  if (action.value) {
    const scenario = parseScenarioKey(action.value);
    if (scenario) return scenario;
  }
  if (action.action_id) {
    const normalized = action.action_id.replace(/^run_/, '').replace(/_/g, '-');
    const scenario = parseScenarioKey(normalized);
    if (scenario) return scenario;
  }
  return null;
}

function queueSlackScenarioRun(
  ctx: ExecutionContext,
  env: Env,
  scenario: ScenarioKey,
  query: string | undefined,
  responseUrl: string,
  runId: string
): void {
  const route = scenarioRoute(scenario);
  const runInput = buildHalfDozenRunInput(env, { query });

  ctx.waitUntil(
    (async () => {
      const langfuseTracingEnabled = isLangfuseRouteTracingEnabled(env);

      try {
        const result = await runScenarioByKey(scenario, {
          ...runInput,
          tracingDisabled: !langfuseTracingEnabled
        });
        const payload = buildSlackCompletedResponse(result, runId, route);
        try {
          await postInkHealthSnapshot(env, buildScenarioInkSnapshot(result, route, runId));
        } catch (error) {
          console.error('Half Dozen Ink snapshot failed', error);
        }
        await postSlackResponse(responseUrl, payload);
        if (langfuseTracingEnabled) {
          await safeFlushLangfuse('slack scenario run');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
          await postInkHealthSnapshot(
            env,
            buildScenarioErrorInkSnapshot(scenario, route, runId, message)
          );
        } catch (inkError) {
          console.error('Half Dozen Ink error snapshot failed', inkError);
        }
        await postSlackResponse(responseUrl, buildSlackRunFailedResponse(scenario, runId, message));
        if (langfuseTracingEnabled) {
          await safeFlushLangfuse('slack scenario error');
        }
      }
    })()
  );
}

async function runScheduledFleetWatchdog(
  env: Env,
  ctx: ExecutionContext,
  scheduledTimeMs: number
): Promise<void> {
  if (!shouldRunFleetWatchdogCron(env, scheduledTimeMs)) return;

  const scenario: ScenarioKey = 'fleet-watchdog';
  const route = HALFDOZEN_FLEET_WATCHDOG_CRON_ROUTE;
  const runId = crypto.randomUUID();
  await runScheduledDeterministicFleetWatchdog({
    runId,
    route,
    scheduledTimeMs,
    run: () =>
      runDeterministicFleetWatchdog({
        telemetryMcpUrl: env.HALFDOZEN_TELEMETRY_MCP_URL
      }),
    record: (evidence) => recordFleetWatchdogRunEvidence(env, evidence),
    notifySuccess: (result, completedRunId, durationMs) =>
      queueSuccessNotifications(ctx, env, result, route, completedRunId, durationMs),
    notifyError: (message, failedRunId, durationMs) =>
      queueErrorNotification(ctx, env, scenario, route, failedRunId, message, durationMs)
  });
}

async function runScheduledMcpRegistrySweep(
  env: Env,
  ctx: ExecutionContext,
  scheduledTimeMs: number
): Promise<void> {
  if (!shouldRunMcpRegistrySweepCron(env, scheduledTimeMs)) return;

  try {
    const result = await runMcpRegistrySweep(env);
    ctx.waitUntil(postInkHealthSnapshot(env, buildMcpRegistrySweepInkSnapshot(result)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MCP registry sweep cron failed', message);
  }
}

// =============================================================================
// MCP Agent
// =============================================================================

export class PlaybookMCP extends McpAgent<Env> {
  server: any = new McpServer({
    name: 'playbook',
    version: '1.5.0'
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as any,
        'playbook',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
          publicKey: (this.env as any).LANGFUSE_PUBLIC_KEY,
          secretKey: (this.env as any).LANGFUSE_SECRET_KEY,
          projectName: resolveLangfuseProjectName(this.env),
          host: (this.env as any).LANGFUSE_HOST
        }
      );
    }

    registerResources(this.server);
    registerTools(this.server);
    registerPrompts(this.server);
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    await Promise.all([
      runScheduledFleetWatchdog(env, ctx, controller.scheduledTime),
      runScheduledMcpRegistrySweep(env, ctx, controller.scheduledTime)
    ]);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === LANGFUSE_ALERT_WEBHOOK_ROUTE) {
      return handleLangfuseAlertWebhook(request, {
        signingSecret: env.LANGFUSE_ALERT_WEBHOOK_SECRET?.split(','),
        notificationState: env.ALERT_STATE_KV
          ? {
              get: (key) => env.ALERT_STATE_KV!.get(key),
              put: (key, value) =>
                env.ALERT_STATE_KV!.put(key, value, {
                  expirationTtl: LANGFUSE_ALERT_STATE_TTL_SECONDS
                })
            }
          : undefined,
        deliver: (alert) => sendLangfuseAlertEmail(env, alert)
      });
    }

    if (url.pathname === HALFDOZEN_SLACK_COMMAND_ROUTE) {
      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.'
          },
          405,
          { Allow: 'POST' }
        );
      }

      const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('application/x-www-form-urlencoded')) {
        return jsonResponse(
          {
            success: false,
            error: 'Unsupported content type',
            message: 'Slack commands require application/x-www-form-urlencoded.'
          },
          415
        );
      }

      const rawBody = await request.text();
      const signatureCheck = await verifySlackSignature(
        request,
        rawBody,
        env.HALFDOZEN_SLACK_SIGNING_SECRET
      );
      if (!signatureCheck.ok) {
        return jsonResponse(
          {
            success: false,
            error: 'Unauthorized',
            message: signatureCheck.error
          },
          401
        );
      }

      if (!env.OPENAI_API_KEY) {
        return slackJsonResponse({
          response_type: 'ephemeral',
          text: 'Playbook MCP is misconfigured: OPENAI_API_KEY is not set.'
        });
      }

      const params = new URLSearchParams(rawBody);
      const runId = crypto.randomUUID();

      if (params.has('payload')) {
        let payload: SlackInteractionPayload;
        try {
          payload = parseSlackInteractionPayload(rawBody);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return jsonResponse(
            {
              success: false,
              error: 'Invalid Slack interaction payload',
              message
            },
            400
          );
        }

        const teamError = validateSlackTeam(payload.team?.id, env.HALFDOZEN_SLACK_TEAM_ID);
        if (teamError) return teamError;

        const responseUrl = payload.response_url;
        if (!responseUrl) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: 'Unable to run command: missing Slack response URL.'
          });
        }

        const scenario = parseScenarioFromSlackAction(payload.actions?.[0]);
        if (!scenario) {
          return slackJsonResponse(buildSlackHelpResponse('/halfdozen'));
        }

        queueSlackScenarioRun(ctx, env, scenario, undefined, responseUrl, runId);
        return slackJsonResponse(buildSlackAcceptedResponse(scenario, runId));
      }

      const fields = parseSlackCommandFields(rawBody);
      const teamError = validateSlackTeam(fields.team_id, env.HALFDOZEN_SLACK_TEAM_ID);
      if (teamError) return teamError;

      const command = fields.command ?? '/halfdozen';
      const parsed = parseSlackCommand(fields.text ?? '');
      if (parsed.showHelp || !parsed.scenario) {
        return slackJsonResponse(buildSlackHelpResponse(command));
      }

      if (!fields.response_url) {
        return slackJsonResponse({
          response_type: 'ephemeral',
          text: 'Unable to run command: missing Slack response URL.'
        });
      }

      queueSlackScenarioRun(ctx, env, parsed.scenario, parsed.query, fields.response_url, runId);
      return slackJsonResponse(buildSlackAcceptedResponse(parsed.scenario, runId, parsed.query));
    }

    if (url.pathname === HALFDOZEN_NOTIFY_TEST_ROUTE) {
      const runId = crypto.randomUUID();
      const startedAt = Date.now();

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            ...JSON_HEADERS,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.'
          },
          405,
          { Allow: 'POST, OPTIONS' }
        );
      }

      const authError = validateRouteToken(request, env.HALFDOZEN_AGENT_ROUTE_TOKEN);
      if (authError) return authError;

      let body: NotificationTestBody = {};
      try {
        body = await parseNotificationTestBody(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Invalid request body',
            message
          },
          400
        );
      }

      const mode = getNotifyEmailMode(env);
      if (mode === 'off' || !env.RESEND_API_KEY) {
        const skippedReason = mode === 'off' ? 'email_notifications_off' : 'missing_resend_api_key';
        const durationMs = Date.now() - startedAt;
        await recordNotificationTestEvidence(env, {
          runId,
          route: HALFDOZEN_NOTIFY_TEST_ROUTE,
          success: false,
          durationMs,
          skippedReason
        });
        return jsonResponse(
          {
            success: false,
            runId,
            error: 'Notification test could not run.',
            skippedReason,
            durableEvidence: Boolean(env.TELEMETRY_DB)
          },
          409
        );
      }

      const event: NotificationEvent = {
        kind: 'error',
        scenario: 'fleet-watchdog',
        route: HALFDOZEN_NOTIFY_TEST_ROUTE,
        runId,
        errorMessage:
          body.message ??
          'Manual Resend notification verification for the Playbook MCP Half Dozen fleet watchdog.'
      };

      try {
        const result = await sendNotificationEmail(env, event);
        const durationMs = Date.now() - startedAt;
        await recordNotificationTestEvidence(env, {
          runId,
          route: HALFDOZEN_NOTIFY_TEST_ROUTE,
          success: result.sent,
          durationMs,
          providerId: result.providerId,
          skippedReason: result.skippedReason
        });

        if (!result.sent) {
          return jsonResponse(
            {
              success: false,
              runId,
              skippedReason: result.skippedReason ?? 'notification_not_sent',
              durableEvidence: Boolean(env.TELEMETRY_DB)
            },
            409
          );
        }

        return jsonResponse({
          success: true,
          runId,
          provider: 'resend',
          providerId: result.providerId ?? null,
          notificationMode: mode,
          recipientCount: parseEmailList(env.HALFDOZEN_AGENT_NOTIFY_EMAIL_TO).length,
          durableEvidence: Boolean(env.TELEMETRY_DB)
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const durationMs = Date.now() - startedAt;
        await recordNotificationTestEvidence(env, {
          runId,
          route: HALFDOZEN_NOTIFY_TEST_ROUTE,
          success: false,
          durationMs,
          errorMessage: message
        });
        return jsonResponse(
          {
            success: false,
            runId,
            error: message,
            durableEvidence: Boolean(env.TELEMETRY_DB)
          },
          502
        );
      }
    }

    if (url.pathname === MCP_REGISTRY_SWEEP_ROUTE) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            ...JSON_HEADERS,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.'
          },
          405,
          { Allow: 'POST, OPTIONS' }
        );
      }

      const authError = validateRouteToken(request, env.HALFDOZEN_AGENT_ROUTE_TOKEN);
      if (authError) {
        return authError;
      }

      const result = await runMcpRegistrySweep(env);
      try {
        await postInkHealthSnapshot(env, buildMcpRegistrySweepInkSnapshot(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResponse({
          ...result,
          ink_posted: false,
          ink_error: message
        });
      }

      return jsonResponse({
        ...result,
        ink_posted: true
      });
    }

    if (isHalfDozenScenarioRoute(url.pathname)) {
      const runId = crypto.randomUUID();
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            ...JSON_HEADERS,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.'
          },
          405,
          { Allow: 'POST, OPTIONS' }
        );
      }

      const authError = validateRouteToken(request, env.HALFDOZEN_AGENT_ROUTE_TOKEN);
      if (authError) {
        return authError;
      }

      if (!env.OPENAI_API_KEY) {
        return jsonResponse(
          {
            success: false,
            error: 'Server misconfigured: OPENAI_API_KEY is not set.'
          },
          500
        );
      }

      let body: AgentRouteBody = {};
      try {
        body = await parseAgentRouteBody(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Invalid request body',
            message
          },
          400
        );
      }

      const baseInput = buildHalfDozenRunInput(env, body);
      const scenario = parseScenarioFromRoute(url.pathname);
      const langfuseTracingEnabled = isLangfuseRouteTracingEnabled(env);

      try {
        const result = await runScenarioByKey(scenario, {
          ...baseInput,
          tracingDisabled: !langfuseTracingEnabled
        });
        queueSuccessNotifications(ctx, env, result, url.pathname, runId);
        if (langfuseTracingEnabled) {
          ctx.waitUntil(safeFlushLangfuse('halfdozen HTTP route success'));
        }
        return jsonResponse(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        queueErrorNotification(ctx, env, scenario, url.pathname, runId, message);
        if (langfuseTracingEnabled) {
          ctx.waitUntil(safeFlushLangfuse('halfdozen HTTP route error'));
        }
        return jsonResponse(
          {
            success: false,
            scenario,
            error: message
          },
          500
        );
      }
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return PlaybookMCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return PlaybookMCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: 'playbook',
        version: '1.5.0',
        description: 'Host workflow playbooks and installation guidance for MCP onboarding',
        hosts: HOST_PLAYBOOKS.map((p) => p.name),
        catalogEntries: MCP_CATALOG.length,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          halfdozen_fleet_watchdog: HALFDOZEN_FLEET_WATCHDOG_ROUTE,
          halfdozen_inbox_triage: HALFDOZEN_INBOX_TRIAGE_ROUTE,
          halfdozen_dedup: HALFDOZEN_DEDUP_ROUTE,
          halfdozen_notification_test: HALFDOZEN_NOTIFY_TEST_ROUTE,
          langfuse_alert_webhook: LANGFUSE_ALERT_WEBHOOK_ROUTE,
          halfdozen_slack_commands: HALFDOZEN_SLACK_COMMAND_ROUTE,
          mcp_registry_sweep: MCP_REGISTRY_SWEEP_ROUTE
        },
        protectedRoutes: [...HALFDOZEN_TOKEN_PROTECTED_ROUTES, MCP_REGISTRY_SWEEP_ROUTE],
        notifications: {
          halfdozenEmailNotificationsConfigured: Boolean(env.RESEND_API_KEY),
          halfdozenEmailNotificationMode: getNotifyEmailMode(env),
          halfdozenEmailNotificationRecipients: parseEmailList(env.HALFDOZEN_AGENT_NOTIFY_EMAIL_TO)
            .length,
          halfdozenSlackCommandSigningConfigured: Boolean(env.HALFDOZEN_SLACK_SIGNING_SECRET),
          halfdozenSlackTeamRestricted: Boolean(env.HALFDOZEN_SLACK_TEAM_ID),
          langfuseAlertWebhookSigningConfigured: Boolean(env.LANGFUSE_ALERT_WEBHOOK_SECRET),
          halfdozenFleetWatchdogCronEnabled: isFlagEnabled(
            env.HALFDOZEN_FLEET_WATCHDOG_CRON_ENABLED,
            true
          ),
          halfdozenFleetWatchdogEvidenceStore: Boolean(env.TELEMETRY_DB),
          inkBridgeConfigured: Boolean(inkBridgeToken(env))
        },
        tools: [
          'get_playbook',
          'compare_hosts',
          'get_folder_structure',
          'detect_host',
          'list_available_mcps',
          'generate_mcp_config',
          'scaffold_project',
          'verify_mcp_connection'
        ],
        resources: HOST_PLAYBOOKS.length + 3,
        prompts: ['workflow_setup', 'host_comparison', 'project_structure']
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
