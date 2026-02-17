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
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
  HALFDOZEN_TELEMETRY_MCP_URL?: string;
  HALFDOZEN_GMAIL_MCP_URL?: string;
  HALFDOZEN_NOTION_MCP_URL?: string;
  HALFDOZEN_SLACK_WEBHOOK_URL?: string;
  HALFDOZEN_SLACK_ESCALATION_WEBHOOK_URL?: string;
  HALFDOZEN_SLACK_SIGNING_SECRET?: string;
  HALFDOZEN_SLACK_BOT_TOKEN?: string;
  HALFDOZEN_SLACK_TEAM_ID?: string;
  HALFDOZEN_SLACK_POLICY_ALLOWED_USER_IDS?: string;
  HALFDOZEN_SLACK_POLICY_CHANNEL_NAME?: string;
  SUBSTRATE_MCP_URL?: string;
  SUBSTRATE_TOKEN?: string;
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
const DEFAULT_SUBSTRATE_MCP_URL = 'https://substrate.mcp.createsomething.agency/mcp';
const DEFAULT_HALFDOZEN_POLICY_CHANNEL = 'client-halfdozen-ops';
const HALFDOZEN_POLICY_MODAL_CALLBACK_ID = 'halfdozen_policy_pack_v1';

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
  trigger_id?: string;
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
  trigger_id?: string;
  view?: {
    id?: string;
    callback_id?: string;
    private_metadata?: string;
    state?: { values?: Record<string, Record<string, { value?: string; selected_option?: { value?: string }; selected_options?: Array<{ value?: string }> }>> };
  };
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function truncateText(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
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
  if (!actualToken || actualToken !== expectedToken) {
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
    trigger_id: params.get('trigger_id') ?? undefined,
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
      try {
        const result = await runScenarioByKey(scenario, runInput);
        const payload = buildSlackCompletedResponse(result, runId, route);
        await postSlackResponse(responseUrl, payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await postSlackResponse(responseUrl, buildSlackRunFailedResponse(scenario, runId, message));
      }
    })(),
  );
}

function parseCommaSeparatedList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getPolicyChannelName(env: Env): string {
  return (env.HALFDOZEN_SLACK_POLICY_CHANNEL_NAME || DEFAULT_HALFDOZEN_POLICY_CHANNEL).trim();
}

function isSlackPolicyAllowed(env: Env, userId?: string, channelName?: string): { ok: true } | { ok: false; message: string } {
  const allowed = parseCommaSeparatedList(env.HALFDOZEN_SLACK_POLICY_ALLOWED_USER_IDS);
  if (allowed.length > 0 && (!userId || !allowed.includes(userId))) {
    return { ok: false, message: 'You are not allowed to manage policy in this workspace.' };
  }

  const requiredChannel = getPolicyChannelName(env);
  if (requiredChannel && channelName && channelName !== requiredChannel) {
    return { ok: false, message: `Policy changes are restricted to #${requiredChannel}.` };
  }

  return { ok: true };
}

async function slackApi(env: Env, method: string, body: Record<string, unknown>): Promise<any> {
  if (!env.HALFDOZEN_SLACK_BOT_TOKEN) {
    throw new Error('Server misconfigured: HALFDOZEN_SLACK_BOT_TOKEN is not set.');
  }

  const resp = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.HALFDOZEN_SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!resp.ok || !json?.ok) {
    throw new Error(`Slack API ${method} failed: ${json?.error || resp.statusText}`);
  }
  return json;
}

function slackPolicyModalView(privateMetadata: Record<string, unknown>): Record<string, unknown> {
  const initial = [
    'version: "1.0"',
    'contract_type: "agent_contract"',
    '',
    'metadata:',
    '  client_name: "Half Dozen"',
    '  engagement_id: "<filled-by-system>"',
    '  status: "draft" # draft | active | deprecated',
    '  delivery_mode: "agent-outcome-stack"',
    '',
    'approval_and_control:',
    '  mode: "hybrid" # none | human-in-the-loop | hybrid',
    '  write_operations: "policy" # blocked | policy | always-approved',
    '  destructive_operations: "always-human"',
    '  escalation_triggers:',
    '    - "missing_required_data"',
    '',
    'judgment_layer:',
    '  decision_thresholds:',
    '    minimum_confidence: 0.8',
    '    max_autonomous_steps: 5',
    '',
    'budget_and_latency_guardrails:',
    '  hard_timeout_ms: 30000',
    '',
    '# See templates/agent_contract.yaml for the full schema.',
  ].join('\n');

  return {
    type: 'modal',
    callback_id: HALFDOZEN_POLICY_MODAL_CALLBACK_ID,
    private_metadata: JSON.stringify(privateMetadata),
    title: { type: 'plain_text', text: 'Policy Pack' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Judgment layer config* (modal-only). This creates a versioned policy pack in Substrate + an audit log entry.',
        },
      },
      {
        type: 'input',
        block_id: 'engagement',
        label: { type: 'plain_text', text: 'Engagement' },
        element: {
          type: 'static_select',
          action_id: 'engagement_value',
          options: [
            {
              text: { type: 'plain_text', text: 'Half Dozen — MCP Fleet' },
              value: 'Half Dozen — MCP Fleet',
            },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'pack_name',
        label: { type: 'plain_text', text: 'Policy pack name' },
        element: {
          type: 'plain_text_input',
          action_id: 'pack_name_value',
          placeholder: { type: 'plain_text', text: 'e.g. Half Dozen Fleet - Standard Ops' },
        },
      },
      {
        type: 'input',
        block_id: 'status',
        label: { type: 'plain_text', text: 'Status' },
        element: {
          type: 'radio_buttons',
          action_id: 'status_value',
          options: [
            { text: { type: 'plain_text', text: 'Draft' }, value: 'draft' },
            { text: { type: 'plain_text', text: 'Active' }, value: 'active' },
          ],
          initial_option: { text: { type: 'plain_text', text: 'Draft' }, value: 'draft' },
        },
      },
      {
        type: 'input',
        block_id: 'approval_mode',
        label: { type: 'plain_text', text: 'Approval mode' },
        element: {
          type: 'radio_buttons',
          action_id: 'approval_mode_value',
          options: [
            { text: { type: 'plain_text', text: 'Hybrid' }, value: 'hybrid' },
            { text: { type: 'plain_text', text: 'Human-in-the-loop' }, value: 'human-in-the-loop' },
            { text: { type: 'plain_text', text: 'None' }, value: 'none' },
          ],
          initial_option: { text: { type: 'plain_text', text: 'Hybrid' }, value: 'hybrid' },
        },
      },
      {
        type: 'input',
        block_id: 'write_ops',
        label: { type: 'plain_text', text: 'Write operations' },
        element: {
          type: 'radio_buttons',
          action_id: 'write_ops_value',
          options: [
            { text: { type: 'plain_text', text: 'Policy-gated' }, value: 'policy' },
            { text: { type: 'plain_text', text: 'Blocked' }, value: 'blocked' },
            { text: { type: 'plain_text', text: 'Always approved' }, value: 'always-approved' },
          ],
          initial_option: { text: { type: 'plain_text', text: 'Policy-gated' }, value: 'policy' },
        },
      },
      {
        type: 'input',
        block_id: 'destructive_ops',
        label: { type: 'plain_text', text: 'Destructive operations' },
        element: {
          type: 'radio_buttons',
          action_id: 'destructive_ops_value',
          options: [
            { text: { type: 'plain_text', text: 'Always human' }, value: 'always-human' },
            { text: { type: 'plain_text', text: 'Blocked' }, value: 'blocked' },
          ],
          initial_option: { text: { type: 'plain_text', text: 'Always human' }, value: 'always-human' },
        },
      },
      {
        type: 'input',
        block_id: 'escalation_triggers',
        label: { type: 'plain_text', text: 'Escalation triggers' },
        optional: true,
        element: {
          type: 'multi_static_select',
          action_id: 'escalation_triggers_value',
          options: [
            { text: { type: 'plain_text', text: 'Missing required data' }, value: 'missing_required_data' },
            { text: { type: 'plain_text', text: 'Dependency down' }, value: 'dependency_down' },
            { text: { type: 'plain_text', text: 'Auth expired' }, value: 'auth_expired' },
            { text: { type: 'plain_text', text: 'Rate limited' }, value: 'rate_limited' },
            { text: { type: 'plain_text', text: 'Unknown error' }, value: 'unknown_error' },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'thresholds',
        label: { type: 'plain_text', text: 'Decision thresholds (optional)' },
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'thresholds_value',
          placeholder: { type: 'plain_text', text: 'min_confidence=0.8, max_steps=5, hard_timeout_ms=30000' },
        },
      },
      {
        type: 'input',
        block_id: 'tool_lists',
        label: { type: 'plain_text', text: 'Tool allow/block lists (optional)' },
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'tool_lists_value',
          multiline: true,
          placeholder: { type: 'plain_text', text: 'allowed: tool_a, tool_b\nblocked: tool_x' },
        },
      },
      {
        type: 'input',
        block_id: 'policy_artifact',
        label: { type: 'plain_text', text: 'Policy artifact (YAML)' },
        element: {
          type: 'plain_text_input',
          action_id: 'policy_artifact_value',
          multiline: true,
          initial_value: initial,
        },
      },
      {
        type: 'input',
        block_id: 'notes',
        label: { type: 'plain_text', text: 'Notes / rationale' },
        optional: true,
        element: {
          type: 'plain_text_input',
          action_id: 'notes_value',
          multiline: true,
        },
      },
    ],
  };
}

function getViewValue(
  values: SlackInteractionPayload['view']['state']['values'],
  blockId: string,
  actionId: string,
): { value?: string; selected?: string; selectedMany?: string[] } {
  const block = values?.[blockId];
  const action = block?.[actionId];
  if (!action) return {};
  return {
    value: action.value,
    selected: action.selected_option?.value,
    selectedMany: Array.isArray(action.selected_options) ? action.selected_options.map((x) => x.value).filter(Boolean) as string[] : undefined,
  };
}

function parseThresholds(raw: string | undefined): Record<string, number> | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  const out: Record<string, number> = {};
  const pairs = text
    .split(/[,\\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const pair of pairs) {
    const [kRaw, vRaw] = pair.split('=').map((s) => s.trim());
    if (!kRaw || !vRaw) continue;
    const key = kRaw
      .replace(/minimum_confidence|min_confidence/i, 'minimum_confidence')
      .replace(/max_autonomous_steps|max_steps/i, 'max_autonomous_steps')
      .replace(/hard_timeout_ms|timeout_ms/i, 'hard_timeout_ms');
    const num = Number(vRaw);
    if (Number.isFinite(num)) out[key] = num;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function parseToolLists(raw: string | undefined): { allowed?: string[]; blocked?: string[] } {
  const text = (raw || '').trim();
  if (!text) return {};

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: { allowed?: string[]; blocked?: string[] } = {};

  const parseList = (s: string) =>
    s
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('allowed:')) {
      out.allowed = parseList(line.slice('allowed:'.length));
    } else if (lower.startsWith('blocked:')) {
      out.blocked = parseList(line.slice('blocked:'.length));
    }
  }

  return out;
}

async function connectSubstrate(env: Env) {
  const url = env.SUBSTRATE_MCP_URL || DEFAULT_SUBSTRATE_MCP_URL;
  const token = env.SUBSTRATE_TOKEN;
  if (!token) throw new Error('Server misconfigured: SUBSTRATE_TOKEN is not set.');

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const client = new McpClient({ name: 'playbook-halfdozen', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const callTool = async (name: string, args: Record<string, unknown>) => {
    const out = await client.callTool({ name, arguments: args });
    const text = out.content?.[0]?.text;
    return text ? JSON.parse(text) : null;
  };

  return { client, callTool, close: () => client.close() };
}

async function handleHalfDozenPolicyViewSubmission(payload: SlackInteractionPayload, env: Env): Promise<void> {
  const view = payload.view;
  const values = view?.state?.values;

  const engagement = getViewValue(values, 'engagement', 'engagement_value').selected;
  const name = getViewValue(values, 'pack_name', 'pack_name_value').value?.trim();
  const status = getViewValue(values, 'status', 'status_value').selected || 'draft';
  const approvalMode = getViewValue(values, 'approval_mode', 'approval_mode_value').selected || 'hybrid';
  const writeOps = getViewValue(values, 'write_ops', 'write_ops_value').selected || 'policy';
  const destructiveOps = getViewValue(values, 'destructive_ops', 'destructive_ops_value').selected || 'always-human';
  const escalationTriggers = getViewValue(values, 'escalation_triggers', 'escalation_triggers_value').selectedMany || [];
  const thresholdsRaw = getViewValue(values, 'thresholds', 'thresholds_value').value;
  const toolsRaw = getViewValue(values, 'tool_lists', 'tool_lists_value').value;
  const policyArtifact = getViewValue(values, 'policy_artifact', 'policy_artifact_value').value || '';
  const notes = getViewValue(values, 'notes', 'notes_value').value?.trim() || '';

  const privateMetadataRaw = view?.private_metadata || '{}';
  const privateMetadata = (() => {
    try {
      return JSON.parse(privateMetadataRaw) as { channel_id?: string; channel_name?: string; user_id?: string };
    } catch {
      return {};
    }
  })();

  const actor = payload.user?.id || privateMetadata.user_id;
  const channelId = privateMetadata.channel_id;
  const channelName = privateMetadata.channel_name;

  const access = isSlackPolicyAllowed(env, actor, channelName);
  if (!access.ok) {
    if (channelId && actor) {
      await slackApi(env, 'chat.postEphemeral', {
        channel: channelId,
        user: actor,
        text: access.message,
      });
    }
    return;
  }

  if (!engagement) {
    if (channelId && actor) {
      await slackApi(env, 'chat.postEphemeral', {
        channel: channelId,
        user: actor,
        text: 'Missing engagement selection.',
      });
    }
    return;
  }

  const thresholds = parseThresholds(thresholdsRaw);
  const toolLists = parseToolLists(toolsRaw);

  const { callTool, close } = await connectSubstrate(env);
  try {
    const workspace_name = 'CREATE SOMETHING Agency Ops';

    const engagementResult = await callTool('find_records', {
      workspace_name,
      table_name: 'engagements',
      filters: [{ column: 'name', operator: 'eq', value: engagement }],
      limit: 5,
    });
    const engagementRecord = engagementResult?.records?.[0];
    if (!engagementRecord) {
      throw new Error(`Engagement not found in Substrate: ${engagement}`);
    }

    const engagementNotionId = engagementRecord.data?.notion_page_id || '';
    const now = new Date();
    const nowIso = now.toISOString();
    const versionTag = nowIso.slice(0, 10);

    let deprecatedCount = 0;
    if (status === 'active' && engagementNotionId) {
      const activePacks = await callTool('find_records', {
        workspace_name,
        table_name: 'judgment_packs',
        filters: [
          { column: 'engagement_notion_page_id', operator: 'eq', value: engagementNotionId },
          { column: 'status', operator: 'eq', value: 'active' },
        ],
        limit: 50,
      });

      for (const pack of activePacks?.records || []) {
        if (!pack?.id) continue;
        await callTool('update_record', {
          record_id: pack.id,
          data: { status: 'deprecated' },
        });
        deprecatedCount += 1;
      }
    }

    const packData: Record<string, unknown> = {
      name: name && name.length > 0 ? name : `${engagement} - ${versionTag}`,
      status,
      version: versionTag,
      primary_interface: 'slack',
      approval_mode: approvalMode,
      write_operations: writeOps,
      destructive_operations: destructiveOps,
      escalation_triggers: escalationTriggers,
      decision_thresholds: thresholds ?? undefined,
      allowed_tools: toolLists.allowed && toolLists.allowed.length > 0 ? toolLists.allowed : undefined,
      blocked_tools: toolLists.blocked && toolLists.blocked.length > 0 ? toolLists.blocked : undefined,
      policy_format: 'yaml',
      policy_artifact: policyArtifact,
      slack_channel_id: channelId || undefined,
      slack_view_id: view?.id || undefined,
      notes: notes || undefined,
      engagement_id: engagementRecord.id,
      engagement_name: engagementRecord.data?.name || engagement,
      engagement_notion_page_id: engagementNotionId || undefined,
      source_system: 'slack',
      ...(status === 'active' ? { last_applied_at: nowIso } : {}),
    };

    const created = await callTool('add_record', {
      workspace_name,
      table_name: 'judgment_packs',
      data: packData,
    });
    const judgmentPackId = created?.record?.id || created?.id || created?.record_id;

    await callTool('add_record', {
      workspace_name,
      table_name: 'policy_change_log',
      data: {
        changed_at: nowIso,
        change_type: 'create',
        actor: actor || undefined,
        channel: channelId || undefined,
        source_system: 'slack',
        judgment_pack_id: judgmentPackId || undefined,
        reason: notes || undefined,
        diff: {
          created: packData,
          deprecated_previous_active_packs: deprecatedCount,
        },
        raw_event: {
          type: payload.type,
          user_id: actor,
          view_id: view?.id,
          callback_id: view?.callback_id,
        },
      },
    });

    if (channelId && actor) {
      const suffix = deprecatedCount > 0 ? ` (deprecated ${deprecatedCount} prior active pack${deprecatedCount === 1 ? '' : 's'})` : '';
      await slackApi(env, 'chat.postEphemeral', {
        channel: channelId,
        user: actor,
        text: `Saved policy pack: ${String(packData.name)} [${status}]${suffix}`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (channelId && actor) {
      await slackApi(env, 'chat.postEphemeral', {
        channel: channelId,
        user: actor,
        text: `Failed to save policy pack: ${truncateText(message, 600)}`,
      });
    }
  } finally {
    close();
  }
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
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, 'playbook');
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

        if (payload.type === 'view_submission' && payload.view?.callback_id === HALFDOZEN_POLICY_MODAL_CALLBACK_ID) {
          ctx.waitUntil(handleHalfDozenPolicyViewSubmission(payload, env));
          return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const scenario = parseScenarioFromSlackAction(payload.actions?.[0]);
        if (!scenario) {
          return slackJsonResponse(buildSlackHelpResponse('/halfdozen'));
        }

        if (!env.OPENAI_API_KEY) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: 'Playbook MCP is misconfigured: OPENAI_API_KEY is not set.',
          });
        }

        const responseUrl = payload.response_url;
        if (!responseUrl) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: 'Unable to run command: missing Slack response URL.',
          });
        }

        queueSlackScenarioRun(ctx, env, scenario, undefined, responseUrl, runId);
        return slackJsonResponse(buildSlackAcceptedResponse(scenario, runId));
      }

      const fields = parseSlackCommandFields(rawBody);
      const teamError = validateSlackTeam(fields.team_id, env.HALFDOZEN_SLACK_TEAM_ID);
      if (teamError) return teamError;

      const command = fields.command ?? '/halfdozen';
      const cmdText = (fields.text ?? '').trim();
      if (cmdText.toLowerCase().startsWith('policy')) {
        const access = isSlackPolicyAllowed(env, fields.user_id, fields.channel_name);
        if (!access.ok) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: access.message,
          });
        }

        if (!fields.trigger_id) {
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: 'Slack did not provide a trigger_id for this command (required to open a modal).',
          });
        }

        try {
          await slackApi(env, 'views.open', {
            trigger_id: fields.trigger_id,
            view: slackPolicyModalView({
              channel_id: fields.channel_id,
              channel_name: fields.channel_name,
              user_id: fields.user_id,
            }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return slackJsonResponse({
            response_type: 'ephemeral',
            text: `Failed to open policy modal: ${truncateText(message, 600)}`,
          });
        }

        return slackJsonResponse({
          response_type: 'ephemeral',
          text: 'Opening policy modal...',
        });
      }

      if (!env.OPENAI_API_KEY) {
        return slackJsonResponse({
          response_type: 'ephemeral',
          text: 'Playbook MCP is misconfigured: OPENAI_API_KEY is not set.',
        });
      }

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

      try {
        const result = await runScenarioByKey(scenario, baseInput);
        queueSuccessNotifications(ctx, env, result, url.pathname, runId);
        return jsonResponse(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        queueErrorNotification(ctx, env, scenario, url.pathname, runId, message);
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
          halfdozenSlackBotConfigured: Boolean(env.HALFDOZEN_SLACK_BOT_TOKEN),
          halfdozenSlackTeamRestricted: Boolean(env.HALFDOZEN_SLACK_TEAM_ID),
          halfdozenSlackPolicyAllowlistConfigured: Boolean(env.HALFDOZEN_SLACK_POLICY_ALLOWED_USER_IDS),
          halfdozenSlackPolicyChannel: getPolicyChannelName(env),
          substrateConfigured: Boolean(env.SUBSTRATE_TOKEN),
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
