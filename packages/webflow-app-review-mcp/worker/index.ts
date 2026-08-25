import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import {
  createD1WebhookStateStore,
  deleteExceptionWebhooks,
  listBaseWebhooks,
  processExceptionWebhookPayloads,
  refreshExceptionWebhooks,
  registerExceptionWebhooks,
  verifyAirtableContentMac,
  type ExceptionWebhookProcessorDeps,
  type WebhookApiConfig,
  type WebhookLegStateStore,
} from '../src/exception-webhook.js';
import { SlackClient } from '../src/slack.js';
import {
  cloudflareAccessServePath,
  isCloudflareAccessMcpPath,
  parseAllowedEmails,
  parseReviewerDirectory,
  resolveCloudflareAccessRequest,
} from '../src/cloudflare-access.js';
import { DEFAULT_AIRTABLE_BASE_ID, DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
import { attachRequestProps } from '../src/request-context.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { ZendeskClient } from '../src/zendesk.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  SLACK_BOT_TOKEN?: string;
  AIRTABLE_WEBHOOK_API_KEY?: string;
  EXCEPTION_SLACK_CHANNEL_ID?: string;
  EXCEPTION_DECISIONS_VIEW_URL?: string;
  /** PAT for the reviewer-exceptions KB base — secret already provisioned on this worker. */
  AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY?: string;
  EXCEPTIONS_KB_API_KEY?: string;
  EXCEPTIONS_KB_BASE_ID?: string;
  EXCEPTIONS_KB_TABLE_ID?: string;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_GOVERNANCE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_GOVERNANCE_BASE_ID?: string;
  AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
  REVIEWER_AUTH_EMAIL_ALIASES_JSON?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  OAUTH_ALLOWED_EMAIL_DOMAIN?: string;
  OAUTH_ALLOWED_EMAILS?: string;
  /** Zendesk API token (secret via `wrangler secret put`) — enables app_review_send_ticket_followup. */
  ZENDESK_API_TOKEN?: string;
  ZENDESK_API_EMAIL?: string;
  ZENDESK_SUBDOMAIN?: string;
}

type RequestProps = {
  accountId?: string;
  email?: string;
  name?: string | null;
  authMode?: 'legacy' | 'cloudflare-access';
};

export function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  return validateBearerToken(request, env.MCP_API_KEY);
}

export class WebflowAppReviewMCP extends McpAgent<Env, unknown, RequestProps> {
  server = new McpServer({
    name: 'webflow-app-review-mcp',
    version: '1.0.0',
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-app-review-mcp',
        () => this.props?.accountId ?? this.env.MCP_ACCOUNT_ID?.trim() ?? 'operator',
      );
    }

    const getClient = () => {
      if (!this.env.AIRTABLE_API_KEY) {
        throw new Error('Missing AIRTABLE_API_KEY environment variable.');
      }
      return new AirtableClient({
        apiKey: this.env.AIRTABLE_API_KEY,
        governanceApiKey: this.env.AIRTABLE_GOVERNANCE_API_KEY,
        baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
        governanceBaseId: this.env.AIRTABLE_GOVERNANCE_BASE_ID,
        governanceFindingsTableId: this.env.AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID,
      });
    };

    const getZendesk = () => {
      if (!this.env.ZENDESK_API_TOKEN || !this.env.ZENDESK_API_EMAIL) {
        return null;
      }
      return new ZendeskClient({
        subdomain: this.env.ZENDESK_SUBDOMAIN ?? 'webflow2579',
        email: this.env.ZENDESK_API_EMAIL,
        apiToken: this.env.ZENDESK_API_TOKEN,
      });
    };

    registerResources(this.server, getClient);
    registerTools(this.server, getClient, () => null, getZendesk);
    registerPrompts(this.server);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

const JSON_HEADERS = { 'Content-Type': 'application/json', ...CORS_HEADERS };

function allowedDomain(env: Env): string {
  return (env.OAUTH_ALLOWED_EMAIL_DOMAIN ?? 'webflow.com').trim().toLowerCase();
}

function accessError(status: 401 | 403, code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: JSON_HEADERS,
  });
}

async function authenticateWithCloudflareAccess(
  request: Request,
  env: Env,
): Promise<{ props: RequestProps } | Response> {
  let directory;
  try {
    directory = parseReviewerDirectory(
      env.REVIEWER_DIRECTORY_JSON,
      env.REVIEWER_AUTH_EMAIL_ALIASES_JSON,
    );
  } catch {
    return misconfiguredResponse('REVIEWER_DIRECTORY_JSON is invalid.');
  }

  const result = await resolveCloudflareAccessRequest({
    request,
    teamDomain: env.CF_ACCESS_TEAM_DOMAIN ?? '',
    audience: env.CF_ACCESS_AUD ?? '',
    allowedDomain: allowedDomain(env),
    allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    directory,
  });
  if (result.ok === false) {
    if (result.status === 401) return accessError(401, 'UNAUTHORIZED', result.message);
    if (result.status === 403) return accessError(403, 'FORBIDDEN', result.message);
    return misconfiguredResponse(result.message);
  }

  return {
    props: {
      authMode: 'cloudflare-access',
      accountId: result.accountId,
      email: result.email,
      name: result.name,
    },
  };
}

// --- Exception webhook leg (Airtable Webhooks API → Slack enrichment) --------
// See docs/exception-transparency-loop.md. Inert until SLACK_BOT_TOKEN is
// provisioned and a registration call is made; the native Airtable automations
// keep working regardless. State lives in the existing TELEMETRY_DB D1 binding.

const DEFAULT_EXCEPTION_CHANNEL_ID = 'C0BN54FQU84';
const DEFAULT_DECISIONS_VIEW_URL = 'https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/';

interface WebhookLeg {
  webhookApi: WebhookApiConfig;
  store: WebhookLegStateStore;
  deps: ExceptionWebhookProcessorDeps;
}

function buildWebhookLeg(env: Env): WebhookLeg | { missing: string[] } {
  const missing: string[] = [];
  if (!env.TELEMETRY_DB) missing.push('TELEMETRY_DB (D1 binding — stores webhook state)');
  if (!env.SLACK_BOT_TOKEN) missing.push('SLACK_BOT_TOKEN');
  const webhookApiKey = env.AIRTABLE_WEBHOOK_API_KEY ?? env.AIRTABLE_API_KEY;
  if (!webhookApiKey) missing.push('AIRTABLE_WEBHOOK_API_KEY or AIRTABLE_API_KEY');
  if (missing.length > 0) return { missing };

  const baseId = env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID;
  const webhookApi: WebhookApiConfig = {
    fetchFn: (...args: Parameters<typeof fetch>) => fetch(...args),
    apiKey: webhookApiKey!,
    baseId,
  };
  const store = createD1WebhookStateStore(env.TELEMETRY_DB!);
  const airtable = new AirtableClient({
    apiKey: env.AIRTABLE_API_KEY ?? webhookApiKey!,
    baseId,
  });
  const slack = new SlackClient({ token: env.SLACK_BOT_TOKEN! });

  const kbApiKey = env.AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY ?? env.EXCEPTIONS_KB_API_KEY;
  const kb =
    kbApiKey && env.EXCEPTIONS_KB_BASE_ID && env.EXCEPTIONS_KB_TABLE_ID
      ? {
          apiKey: kbApiKey,
          baseId: env.EXCEPTIONS_KB_BASE_ID,
          tableId: env.EXCEPTIONS_KB_TABLE_ID,
        }
      : null;

  return {
    webhookApi,
    store,
    deps: {
      airtable,
      slack,
      store,
      webhookApi,
      exceptionChannelId: env.EXCEPTION_SLACK_CHANNEL_ID ?? DEFAULT_EXCEPTION_CHANNEL_ID,
      versionViewUrlBase: env.EXCEPTION_DECISIONS_VIEW_URL ?? DEFAULT_DECISIONS_VIEW_URL,
      kb,
      logger: (message) => console.log(message),
    },
  };
}

function webhookLegUnavailable(missing: string[]): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code: 'WEBHOOK_LEG_UNCONFIGURED', missing } }),
    { status: 503, headers: JSON_HEADERS },
  );
}

async function handleWebhookRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith('/webhooks/airtable')) return null;
  const leg = buildWebhookLeg(env);

  // Ping from Airtable: MAC-verified, no bearer auth (the URL is public).
  if (pathname === '/webhooks/airtable' && request.method === 'POST') {
    if ('missing' in leg) return webhookLegUnavailable(leg.missing);
    const rawBody = await request.text();
    let ping: { webhook?: { id?: string } };
    try {
      ping = JSON.parse(rawBody) as { webhook?: { id?: string } };
    } catch {
      return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
    }
    const state = await leg.store.get();
    const webhook = state?.webhooks.find((w) => w.id === ping.webhook?.id);
    if (!webhook) {
      return new Response('Unknown webhook', { status: 404, headers: CORS_HEADERS });
    }
    const valid = await verifyAirtableContentMac(
      webhook.macSecretBase64,
      rawBody,
      request.headers.get('X-Airtable-Content-MAC'),
    );
    if (!valid) {
      return new Response('Invalid signature', { status: 401, headers: CORS_HEADERS });
    }
    ctx.waitUntil(
      processExceptionWebhookPayloads(leg.deps).catch((error) =>
        console.error(`exception-webhook processing failed: ${String(error)}`),
      ),
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  // Operator endpoints: bearer-authenticated with the MCP API key.
  const authError = validateApiKey(request, env);
  if (authError) return authError;
  if ('missing' in leg) return webhookLegUnavailable(leg.missing);

  if (pathname === '/webhooks/airtable/register' && request.method === 'POST') {
    const url = new URL(request.url);
    const existing = await leg.store.get();
    if (existing && url.searchParams.get('force') !== '1') {
      return new Response(
        JSON.stringify({ ok: false, error: { code: 'ALREADY_REGISTERED' }, state: summarizeState(existing) }),
        { status: 409, headers: JSON_HEADERS },
      );
    }
    if (existing) await deleteExceptionWebhooks(leg.webhookApi, existing);
    const notificationUrl = `${url.origin}/webhooks/airtable`;
    const state = await registerExceptionWebhooks(leg.webhookApi, notificationUrl);
    await leg.store.put(state);
    return new Response(JSON.stringify({ ok: true, state: summarizeState(state) }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  }

  if (pathname === '/webhooks/airtable/status' && request.method === 'GET') {
    const state = await leg.store.get();
    let remote: unknown = null;
    try {
      remote = await listBaseWebhooks(leg.webhookApi);
    } catch (error) {
      remote = { error: String(error) };
    }
    return new Response(
      JSON.stringify({ ok: true, state: state ? summarizeState(state) : null, remote }, null, 2),
      { status: 200, headers: JSON_HEADERS },
    );
  }

  if (pathname === '/webhooks/airtable/process' && request.method === 'POST') {
    const result = await processExceptionWebhookPayloads(leg.deps);
    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: JSON_HEADERS });
  }

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
}

function summarizeState(state: { webhooks: Array<{ id: string; tableId: string; cursor: number }>; notificationUrl: string; registeredAt: string }) {
  return {
    notificationUrl: state.notificationUrl,
    registeredAt: state.registeredAt,
    webhooks: state.webhooks.map((w) => ({ id: w.id, tableId: w.tableId, cursor: w.cursor })),
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const webhookResponse = await handleWebhookRoutes(request, env, ctx, url.pathname);
    if (webhookResponse) return webhookResponse;

    if (isCloudflareAccessMcpPath(url.pathname)) {
      const basePath = cloudflareAccessServePath(url.pathname);
      const serve = basePath === '/access/sse'
        ? WebflowAppReviewMCP.serveSSE('/access/sse')
        : WebflowAppReviewMCP.serve('/access/mcp');
      const result = await authenticateWithCloudflareAccess(request, env);
      if (result instanceof Response) return result;
      return serve.fetch(request, env, attachRequestProps(ctx, result.props));
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return WebflowAppReviewMCP.serve('/mcp').fetch(
        request,
        env,
        attachRequestProps(ctx, {
          authMode: 'legacy' as const,
          ...(env.MCP_ACCOUNT_ID?.trim() ? { accountId: env.MCP_ACCOUNT_ID.trim() } : {}),
        }),
      );
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return WebflowAppReviewMCP.serveSSE('/sse').fetch(
        request,
        env,
        attachRequestProps(ctx, {
          authMode: 'legacy' as const,
          ...(env.MCP_ACCOUNT_ID?.trim() ? { accountId: env.MCP_ACCOUNT_ID.trim() } : {}),
        }),
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-app-review-mcp',
            version: '1.0.0',
            description: 'Webflow App Review MCP — Airtable-scoped review workflows and governance database access',
            auth: {
              modes: {
                cloudflareAccess: {
                  flow: 'Cloudflare Access Managed OAuth with a signed application assertion',
                  endpoint: '/access/mcp',
                  teamDomain: env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, '') || null,
                  audienceConfigured: Boolean(env.CF_ACCESS_AUD?.trim()),
                  configured: Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim() && env.CF_ACCESS_AUD?.trim()),
                },
                legacy: {
                  flow: 'Shared bearer token (hub bridges only)',
                  configured: Boolean(env.MCP_API_KEY),
                  header: 'Authorization: Bearer <MCP_API_KEY>',
                },
              },
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
              managedOAuthMcp: '/access/mcp',
              airtableWebhooks: '/webhooks/airtable',
            },
            exceptionWebhookLeg: (() => {
              const leg = buildWebhookLeg(env);
              return 'missing' in leg ? { configured: false, missing: leg.missing } : { configured: true };
            })(),
            tables: {
              assets: 'tblRwzpWoLgE9MrUm',
              assetVersions: 'tblHxZ2hgSFLZxsZu',
              governanceBase: env.AIRTABLE_GOVERNANCE_BASE_ID ?? env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
              governanceFindings: env.AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID ?? DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID,
            },
          },
          null,
          2,
        ),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        },
      );
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },

  // Cron: keep the Airtable webhook subscriptions alive (they expire after 7
  // days without a refresh) and sweep any payloads whose ping was missed.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const leg = buildWebhookLeg(env);
    if ('missing' in leg) return;
    const state = await leg.store.get();
    if (!state) return;

    ctx.waitUntil(
      (async () => {
        const { refreshed, errors } = await refreshExceptionWebhooks(leg.webhookApi, state);
        if (errors.length > 0) console.error(`exception-webhook refresh errors: ${errors.join('; ')}`);
        else console.log(`exception-webhook refreshed ${refreshed} subscription(s)`);
        await processExceptionWebhookPayloads(leg.deps);
      })().catch((error) => console.error(`exception-webhook cron failed: ${String(error)}`)),
    );
  },
};
