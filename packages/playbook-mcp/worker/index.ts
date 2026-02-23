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

import { flush as flushBraintrust } from '@create-something/observability/braintrust';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';
import { HOST_PLAYBOOKS } from '../src/playbooks.js';
import { MCP_CATALOG } from '../src/catalog.js';
import {
  runHalfDozenDedup,
  runHalfDozenFleetWatchdog,
  runHalfDozenInboxTriage,
} from './halfdozenFleetWatchdog.js';
import type { HalfDozenScenarioRunResult } from './halfdozenFleetWatchdog.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  OPENAI_API_KEY?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_ORG_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_APP_URL?: string;
  BRAINTRUST_ENABLED?: string;
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
  HALFDOZEN_TELEMETRY_MCP_URL?: string;
  HALFDOZEN_GMAIL_MCP_URL?: string;
  HALFDOZEN_NOTION_MCP_URL?: string;
  HALFDOZEN_SLACK_WEBHOOK_URL?: string;
  HALFDOZEN_SLACK_ESCALATION_WEBHOOK_URL?: string;
  HALFDOZEN_SLACK_SIGNING_SECRET?: string;
  HALFDOZEN_SLACK_TEAM_ID?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const HALFDOZEN_FLEET_WATCHDOG_ROUTE = '/clients/halfdozen/agents/fleet-watchdog/run';
const HALFDOZEN_INBOX_TRIAGE_ROUTE = '/clients/halfdozen/agents/inbox-triage/run';
const HALFDOZEN_DEDUP_ROUTE = '/clients/halfdozen/agents/dedup/run';
const HALFDOZEN_SLACK_COMMAND_ROUTE = '/clients/halfdozen/slack/commands';
const SLACK_TIMESTAMP_TOLERANCE_SECONDS = 300;
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

const HALFDOZEN_PROTECTED_ROUTES = [
  HALFDOZEN_FLEET_WATCHDOG_ROUTE,
  HALFDOZEN_INBOX_TRIAGE_ROUTE,
  HALFDOZEN_DEDUP_ROUTE,
] as const;

const AgentRouteBodySchema = z.object({
  query: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  max_turns: z.number().int().min(1).max(30).optional(),
  timeout_ms: z.number().int().min(1_000).max(120_000).optional(),
});

type AgentRouteBody = z.infer<typeof AgentRouteBodySchema>;

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

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function slackJsonResponse(data: SlackResponsePayload, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

function parseSlackCommand(text: string): { scenario?: ScenarioKey; query?: string; showHelp: boolean } {
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
    showHelp: false,
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

async function safeFlushBraintrust(context: string): Promise<void> {
  try {
    await flushBraintrust();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[observability] Braintrust flush failed during ${context}: ${message}`);
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
  return result.degraded || hasRequiredCoverageFailure(result) || result.failed_required_tool_calls.length > 0;
}

function buildScenarioSuccessSlackPayload(
  result: HalfDozenScenarioRunResult,
  route: string,
  runId: string,
): SlackPayload {
  const status = shouldEscalate(result) ? 'ALERT' : 'OK';
  const text = `${status}: ${scenarioLabel(result.scenario)} run ${runId}`;
  const failedServers = result.failed_servers.length > 0 ? result.failed_servers.map((item) => item.server).join(', ') : 'none';
  const outputPreview = truncateText(String(result.final_output ?? ''));

  return {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${status}* ${scenarioLabel(result.scenario)}\nRun ID: \`${runId}\`\nRoute: \`${route}\``,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Degraded*\n${result.degraded ? 'yes' : 'no'}` },
          { type: 'mrkdwn', text: `*Coverage*\n${getCoverageStatus(result)}` },
          { type: 'mrkdwn', text: `*Connected Servers*\n${result.connected_servers.join(', ') || 'none'}` },
          { type: 'mrkdwn', text: `*Failed Servers*\n${failedServers}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${outputPreview || 'No final output.'}`,
        },
      },
    ],
  };
}

function buildScenarioErrorSlackPayload(
  scenario: ScenarioKey,
  route: string,
  runId: string,
  errorMessage: string,
): SlackPayload {
  return {
    text: `ALERT: ${scenarioLabel(scenario)} run failed ${runId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*ALERT* ${scenarioLabel(scenario)}\nRun ID: \`${runId}\`\nRoute: \`${route}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error*\n${truncateText(errorMessage, 1200)}`,
        },
      },
    ],
  };
}

function buildSlackQuickActionElements(): Array<Record<string, unknown>> {
  return [
    {
      type: 'button',
      action_id: 'run_fleet_watchdog',
      text: { type: 'plain_text', text: 'Fleet Watchdog' },
      value: 'fleet-watchdog',
    },
    {
      type: 'button',
      action_id: 'run_inbox_triage',
      text: { type: 'plain_text', text: 'Inbox Triage' },
      value: 'inbox-triage',
    },
    {
      type: 'button',
      action_id: 'run_dedup',
      text: { type: 'plain_text', text: 'Dedup' },
      value: 'dedup',
    },
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
            `• \`${command} watchdog investigate no-data servers only\``,
        },
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements(),
      },
    ],
  };
}

function buildSlackAcceptedResponse(
  scenario: ScenarioKey,
  runId: string,
  query?: string,
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
          text: `Starting *${scenarioLabel(scenario)}*.\nRun ID: \`${runId}\`${queryLine}`,
        },
      },
    ],
  };
}

function buildSlackCompletedResponse(
  result: HalfDozenScenarioRunResult,
  runId: string,
  route: string,
): SlackResponsePayload {
  const summary = truncateText(String(result.final_output ?? ''), 1400);
  const status = shouldEscalate(result) ? 'ALERT' : 'OK';
  const failedServers = result.failed_servers.length > 0 ? result.failed_servers.map((item) => item.server).join(', ') : 'none';
  return {
    response_type: 'in_channel',
    text: `${status}: ${scenarioLabel(result.scenario)} run ${runId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${status}* ${scenarioLabel(result.scenario)}\nRun ID: \`${runId}\`\nRoute: \`${route}\``,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Degraded*\n${result.degraded ? 'yes' : 'no'}` },
          { type: 'mrkdwn', text: `*Coverage*\n${getCoverageStatus(result)}` },
          { type: 'mrkdwn', text: `*Connected Servers*\n${result.connected_servers.join(', ') || 'none'}` },
          { type: 'mrkdwn', text: `*Failed Servers*\n${failedServers}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${summary || 'No final output.'}`,
        },
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements(),
      },
    ],
  };
}

function buildSlackRunFailedResponse(
  scenario: ScenarioKey,
  runId: string,
  errorMessage: string,
): SlackResponsePayload {
  return {
    response_type: 'in_channel',
    text: `ALERT: ${scenarioLabel(scenario)} run failed ${runId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*ALERT* ${scenarioLabel(scenario)}\nRun ID: \`${runId}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error*\n${truncateText(errorMessage, 1400)}`,
        },
      },
      {
        type: 'actions',
        elements: buildSlackQuickActionElements(),
      },
    ],
  };
}

async function postSlackWebhook(webhookUrl: string, payload: SlackPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}

async function postSlackResponse(responseUrl: string, payload: SlackResponsePayload): Promise<void> {
  const response = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack response_url failed (${response.status}): ${body}`);
  }
}

async function verifySlackSignature(
  request: Request,
  rawBody: string,
  signingSecret?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!signingSecret) {
    return {
      ok: false,
      error: 'Server misconfigured: HALFDOZEN_SLACK_SIGNING_SECRET is not set.',
    };
  }

  const signature = request.headers.get('X-Slack-Signature');
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  if (!signature || !timestamp) {
    return {
      ok: false,
      error: 'Missing Slack signature headers.',
    };
  }

  const timestampSec = Number(timestamp);
  if (!Number.isFinite(timestampSec)) {
    return {
      ok: false,
      error: 'Invalid Slack timestamp header.',
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > SLACK_TIMESTAMP_TOLERANCE_SECONDS) {
    return {
      ok: false,
      error: 'Slack request timestamp is outside allowed tolerance window.',
    };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const baseString = `v0:${timestamp}:${rawBody}`;
  const digestBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString)),
  );
  const digestHex = [...digestBytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  const expectedSignature = `v0=${digestHex}`;

  if (!timingSafeEqual(signature, expectedSignature)) {
    return {
      ok: false,
      error: 'Slack signature mismatch.',
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
): void {
  const primaryWebhook = env.HALFDOZEN_SLACK_WEBHOOK_URL;
  const escalationWebhook = env.HALFDOZEN_SLACK_ESCALATION_WEBHOOK_URL;
  if (!primaryWebhook && !escalationWebhook) return;

  const escalate = shouldEscalate(result);
  const payload = buildScenarioSuccessSlackPayload(result, route, runId);

  ctx.waitUntil(
    (async () => {
      try {
        let sentPrimary = false;
        if (primaryWebhook) {
          await postSlackWebhook(primaryWebhook, payload);
          sentPrimary = true;
        }

        if (escalate) {
          const escalationTarget = escalationWebhook ?? primaryWebhook;
          if (escalationTarget && (!sentPrimary || escalationTarget !== primaryWebhook)) {
            await postSlackWebhook(escalationTarget, payload);
          }
        }
      } catch (error) {
        console.error('Half Dozen Slack notify failed', error);
      }
    })(),
  );
}

function queueErrorNotification(
  ctx: ExecutionContext,
  env: Env,
  scenario: ScenarioKey,
  route: string,
  runId: string,
  errorMessage: string,
): void {
  const escalationWebhook = env.HALFDOZEN_SLACK_ESCALATION_WEBHOOK_URL ?? env.HALFDOZEN_SLACK_WEBHOOK_URL;
  if (!escalationWebhook) return;

  const payload = buildScenarioErrorSlackPayload(scenario, route, runId, errorMessage);
  ctx.waitUntil(
    (async () => {
      try {
        await postSlackWebhook(escalationWebhook, payload);
      } catch (error) {
        console.error('Half Dozen Slack escalation notify failed', error);
      }
    })(),
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
        error: 'Server misconfigured: HALFDOZEN_AGENT_ROUTE_TOKEN is not set.',
      },
      500,
    );
  }

  const actualToken = getAuthToken(request);
  if (!actualToken || !timingSafeEqual(actualToken, expectedToken)) {
    return jsonResponse(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Valid Bearer token or X-API-Key header is required.',
      },
      401,
      { 'WWW-Authenticate': 'Bearer realm="playbook-halfdozen"' },
    );
  }

  return null;
}

function isHalfDozenScenarioRoute(pathname: string): pathname is (typeof HALFDOZEN_PROTECTED_ROUTES)[number] {
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

function parseScenarioFromRoute(pathname: string): ScenarioKey {
  if (pathname === HALFDOZEN_FLEET_WATCHDOG_ROUTE) return 'fleet-watchdog';
  if (pathname === HALFDOZEN_INBOX_TRIAGE_ROUTE) return 'inbox-triage';
  return 'dedup';
}

async function runScenarioByKey(
  scenario: ScenarioKey,
  input: HalfDozenRouteRunInput,
): Promise<HalfDozenScenarioRunResult> {
  if (scenario === 'fleet-watchdog') {
    return runHalfDozenFleetWatchdog(input);
  }
  if (scenario === 'inbox-triage') {
    return runHalfDozenInboxTriage(input);
  }
  return runHalfDozenDedup(input);
}

function buildHalfDozenRunInput(env: Env, body: AgentRouteBody | { query?: string }): HalfDozenRouteRunInput {
  return {
    openaiApiKey: env.OPENAI_API_KEY as string,
    telemetryMcpUrl: env.HALFDOZEN_TELEMETRY_MCP_URL,
    gmailMcpUrl: env.HALFDOZEN_GMAIL_MCP_URL,
    notionMcpUrl: env.HALFDOZEN_NOTION_MCP_URL,
    query: body.query,
    model: 'model' in body ? body.model : undefined,
    maxTurns: 'max_turns' in body ? body.max_turns : undefined,
    timeoutMs: 'timeout_ms' in body ? body.timeout_ms : undefined,
  };
}

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function isBraintrustRouteTracingEnabled(env: Env): boolean {
  const enabled = env.BRAINTRUST_ENABLED?.trim().toLowerCase();
  if (enabled === 'false' || enabled === '0' || enabled === 'off') return false;
  return Boolean(env.BRAINTRUST_API_KEY);
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
    user_name: params.get('user_name') ?? undefined,
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
      error: 'Unauthorized Slack workspace.',
    },
    401,
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
  runId: string,
): void {
  const route = scenarioRoute(scenario);
  const runInput = buildHalfDozenRunInput(env, { query });

  ctx.waitUntil(
    (async () => {
      const braintrustTracingEnabled = isBraintrustRouteTracingEnabled(env);

      try {
        const result = await runScenarioByKey(scenario, {
          ...runInput,
          tracingDisabled: !braintrustTracingEnabled,
        });
        const payload = buildSlackCompletedResponse(result, runId, route);
        await postSlackResponse(responseUrl, payload);
        if (braintrustTracingEnabled) {
          await safeFlushBraintrust('slack scenario run');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await postSlackResponse(responseUrl, buildSlackRunFailedResponse(scenario, runId, message));
        if (braintrustTracingEnabled) {
          await safeFlushBraintrust('slack scenario error');
        }
      }
    })(),
  );
}

// =============================================================================
// MCP Agent
// =============================================================================

export class PlaybookMCP extends McpAgent<Env> {
  server: any = new McpServer({
    name: 'playbook',
    version: '1.5.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, 'playbook', undefined, {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
      });
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === HALFDOZEN_SLACK_COMMAND_ROUTE) {
      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.',
          },
          405,
          { Allow: 'POST' },
        );
      }

      const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('application/x-www-form-urlencoded')) {
        return jsonResponse(
          {
            success: false,
            error: 'Unsupported content type',
            message: 'Slack commands require application/x-www-form-urlencoded.',
          },
          415,
        );
      }

      const rawBody = await request.text();
      const signatureCheck = await verifySlackSignature(request, rawBody, env.HALFDOZEN_SLACK_SIGNING_SECRET);
      if (!signatureCheck.ok) {
        return jsonResponse(
          {
            success: false,
            error: 'Unauthorized',
            message: signatureCheck.error,
          },
          401,
        );
      }

      if (!env.OPENAI_API_KEY) {
        return slackJsonResponse({
          response_type: 'ephemeral',
          text: 'Playbook MCP is misconfigured: OPENAI_API_KEY is not set.',
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
              message,
            },
            400,
          );
        }

        const teamError = validateSlackTeam(payload.team?.id, env.HALFDOZEN_SLACK_TEAM_ID);
        if (teamError) return teamError;

        const responseUrl = payload.response_url;
        if (!responseUrl) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: 'Unable to run command: missing Slack response URL.',
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
          text: 'Unable to run command: missing Slack response URL.',
        });
      }

      queueSlackScenarioRun(ctx, env, parsed.scenario, parsed.query, fields.response_url, runId);
      return slackJsonResponse(buildSlackAcceptedResponse(parsed.scenario, runId, parsed.query));
    }

    if (isHalfDozenScenarioRoute(url.pathname)) {
      const runId = crypto.randomUUID();
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            ...JSON_HEADERS,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.',
          },
          405,
          { Allow: 'POST, OPTIONS' },
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
            error: 'Server misconfigured: OPENAI_API_KEY is not set.',
          },
          500,
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
            message,
          },
          400,
        );
      }

      const baseInput = buildHalfDozenRunInput(env, body);
      const scenario = parseScenarioFromRoute(url.pathname);
      const braintrustTracingEnabled = isBraintrustRouteTracingEnabled(env);

      try {
        const result = await runScenarioByKey(scenario, {
          ...baseInput,
          tracingDisabled: !braintrustTracingEnabled,
        });
        queueSuccessNotifications(ctx, env, result, url.pathname, runId);
        if (braintrustTracingEnabled) {
          ctx.waitUntil(safeFlushBraintrust('halfdozen HTTP route success'));
        }
        return jsonResponse(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        queueErrorNotification(ctx, env, scenario, url.pathname, runId, message);
        if (braintrustTracingEnabled) {
          ctx.waitUntil(safeFlushBraintrust('halfdozen HTTP route error'));
        }
        return jsonResponse(
          {
            success: false,
            scenario,
            error: message,
          },
          500,
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
          halfdozen_slack_commands: HALFDOZEN_SLACK_COMMAND_ROUTE,
        },
        protectedRoutes: HALFDOZEN_PROTECTED_ROUTES,
        notifications: {
          halfdozenSlackWebhookConfigured: Boolean(env.HALFDOZEN_SLACK_WEBHOOK_URL),
          halfdozenSlackEscalationWebhookConfigured: Boolean(env.HALFDOZEN_SLACK_ESCALATION_WEBHOOK_URL),
          halfdozenSlackCommandSigningConfigured: Boolean(env.HALFDOZEN_SLACK_SIGNING_SECRET),
          halfdozenSlackTeamRestricted: Boolean(env.HALFDOZEN_SLACK_TEAM_ID),
        },
        tools: [
          'get_playbook',
          'compare_hosts',
          'get_folder_structure',
          'detect_host',
          'list_available_mcps',
          'generate_mcp_config',
          'scaffold_project',
          'verify_mcp_connection',
        ],
        resources: HOST_PLAYBOOKS.length + 3,
        prompts: ['workflow_setup', 'host_comparison', 'project_structure'],
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
