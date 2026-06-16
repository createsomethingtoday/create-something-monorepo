import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import {
  DEFAULT_ASSET_ATTRIBUTION_LOOKBACK_HOURS,
  DEFAULT_ASSET_ATTRIBUTION_START_AT,
  runAssetAttributionSync
} from '../src/asset-attribution.js';
import { DEFAULT_AIRTABLE_BASE_ID } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
import { parseReviewerDirectory, getReviewerProfileForAccount } from '../src/reviewer-directory.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';

interface WorkflowInstanceLike {
  id: string;
  status?: () => Promise<unknown>;
}

interface WorkflowBindingLike {
  create(options?: {
    id?: string;
    params?: unknown;
    payload?: unknown;
  }): Promise<WorkflowInstanceLike>;
  get?(id: string): Promise<WorkflowInstanceLike>;
}

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  ASSET_ATTRIBUTION_WORKFLOW?: WorkflowBindingLike;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  ASSET_ATTRIBUTION_LOOKBACK_HOURS?: string;
  ASSET_ATTRIBUTION_SYNC_START_AT?: string;
  REVIEWER_DIRECTORY_JSON?: string;
}

type RequestProps = {
  accountId?: string;
};

interface AssetAttributionWorkflowPayload {
  triggeredBy: 'cron' | 'manual';
  scheduledTime?: string;
  cron?: string;
  lookbackHours: number;
  startAt: string;
}

type WorkflowEventLike<T> = {
  payload?: T;
  params?: T;
};

type WorkflowStepLike = {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
  do<T>(name: string, config: Record<string, unknown>, callback: () => Promise<T>): Promise<T>;
};

export function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  return validateBearerToken(request, env.MCP_API_KEY);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

function parseLookbackHours(env: Env): number {
  const raw = env.ASSET_ATTRIBUTION_LOOKBACK_HOURS?.trim();
  if (!raw) return DEFAULT_ASSET_ATTRIBUTION_LOOKBACK_HOURS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('ASSET_ATTRIBUTION_LOOKBACK_HOURS must be a positive number.');
  }
  return parsed;
}

function getAssetAttributionStartAt(env: Env): string {
  return env.ASSET_ATTRIBUTION_SYNC_START_AT?.trim() || DEFAULT_ASSET_ATTRIBUTION_START_AT;
}

function buildAssetAttributionWorkflowPayload(
  env: Env,
  trigger: { triggeredBy: 'cron' | 'manual'; scheduledTime?: number; cron?: string }
): AssetAttributionWorkflowPayload {
  return {
    triggeredBy: trigger.triggeredBy,
    ...(trigger.scheduledTime
      ? { scheduledTime: new Date(trigger.scheduledTime).toISOString() }
      : {}),
    ...(trigger.cron ? { cron: trigger.cron } : {}),
    lookbackHours: parseLookbackHours(env),
    startAt: getAssetAttributionStartAt(env)
  };
}

async function createAssetAttributionWorkflowInstance(
  env: Env,
  payload: AssetAttributionWorkflowPayload
): Promise<WorkflowInstanceLike> {
  if (!env.ASSET_ATTRIBUTION_WORKFLOW) {
    throw new Error('ASSET_ATTRIBUTION_WORKFLOW binding is not configured.');
  }

  const scheduledPart = payload.scheduledTime
    ? payload.scheduledTime.replace(/[^0-9]/g, '').slice(0, 14)
    : 'manual';
  const id = `asset-attribution-${scheduledPart}-${crypto.randomUUID().slice(0, 8)}`;
  return env.ASSET_ATTRIBUTION_WORKFLOW.create({ id, params: payload });
}

export class WebflowAppReviewMCP extends McpAgent<Env, unknown, RequestProps> {
  server = new McpServer({
    name: 'webflow-app-review-mcp',
    version: '1.0.0'
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-app-review-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator'
      );
    }

    const getClient = () => {
      if (!this.env.AIRTABLE_API_KEY) {
        throw new Error('Missing AIRTABLE_API_KEY environment variable.');
      }
      return new AirtableClient({
        apiKey: this.env.AIRTABLE_API_KEY,
        baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID
      });
    };

    const reviewerDirectory = parseReviewerDirectory(this.env.REVIEWER_DIRECTORY_JSON);
    const getReviewer = () =>
      getReviewerProfileForAccount(reviewerDirectory, this.props?.accountId ?? null);

    registerResources(this.server, getClient, getReviewer);
    registerTools(this.server, getClient, getReviewer);
    registerPrompts(this.server);
  }
}

export class AppAssetAttributionWorkflow extends WorkflowEntrypoint<
  Env,
  AssetAttributionWorkflowPayload
> {
  async run(event: WorkflowEventLike<AssetAttributionWorkflowPayload>, step: WorkflowStepLike) {
    const payload = event.payload ??
      event.params ?? {
        triggeredBy: 'manual',
        lookbackHours: DEFAULT_ASSET_ATTRIBUTION_LOOKBACK_HOURS,
        startAt: DEFAULT_ASSET_ATTRIBUTION_START_AT
      };

    return step.do(
      'attribute recent Asset Update rows',
      {
        retries: {
          limit: 3,
          delay: '5 seconds',
          backoff: 'exponential'
        },
        timeout: '5 minutes'
      },
      async () => {
        if (!this.env.AIRTABLE_API_KEY) {
          throw new Error('Missing AIRTABLE_API_KEY environment variable.');
        }

        return runAssetAttributionSync({
          apiKey: this.env.AIRTABLE_API_KEY,
          baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
          lookbackHours: payload.lookbackHours,
          now: payload.scheduledTime ? new Date(payload.scheduledTime) : new Date(),
          startAt: payload.startAt
        });
      }
    );
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id'
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (
      url.pathname === '/mcp' ||
      url.pathname.startsWith('/mcp/') ||
      url.pathname === '/sse' ||
      url.pathname.startsWith('/sse/')
    ) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const accountId =
        request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
      return WebflowAppReviewMCP.serve('/mcp').fetch(request, env, {
        ...ctx,
        props: {
          ...(accountId ? { accountId } : {})
        }
      });
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const accountId =
        request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
      return WebflowAppReviewMCP.serve('/sse').fetch(request, env, {
        ...ctx,
        props: {
          ...(accountId ? { accountId } : {})
        }
      });
    }

    if (url.pathname === '/admin/asset-attribution-sync') {
      const authError = validateApiKey(request, env);
      if (authError) return authError;

      if (request.method === 'GET') {
        const instanceId = url.searchParams.get('instanceId');
        if (!instanceId) {
          return jsonResponse({ error: 'instanceId query parameter is required.' }, 400);
        }
        if (!env.ASSET_ATTRIBUTION_WORKFLOW?.get) {
          return jsonResponse(
            { error: 'ASSET_ATTRIBUTION_WORKFLOW binding is not configured.' },
            500
          );
        }
        const instance = await env.ASSET_ATTRIBUTION_WORKFLOW.get(instanceId);
        return jsonResponse({
          id: instance.id,
          status: instance.status ? await instance.status() : null
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
      }

      const direct = url.searchParams.get('mode') === 'direct';
      const payload = buildAssetAttributionWorkflowPayload(env, { triggeredBy: 'manual' });

      if (direct) {
        if (!env.AIRTABLE_API_KEY) {
          return jsonResponse({ error: 'Missing AIRTABLE_API_KEY environment variable.' }, 500);
        }

        const summary = await runAssetAttributionSync({
          apiKey: env.AIRTABLE_API_KEY,
          baseId: env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
          lookbackHours: payload.lookbackHours,
          startAt: payload.startAt
        });
        return jsonResponse({ mode: 'direct', summary });
      }

      const instance = await createAssetAttributionWorkflowInstance(env, payload);
      return jsonResponse(
        {
          mode: 'workflow',
          id: instance.id,
          status: instance.status ? await instance.status() : null
        },
        202
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-app-review-mcp',
            version: '1.0.0',
            description:
              'Webflow App Review MCP — Airtable-scoped review workflows for Assets + Asset Versions',
            auth: {
              mode: 'Bearer required',
              configured: Boolean(env.MCP_API_KEY),
              header: 'Authorization: Bearer <MCP_API_KEY>'
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
              assetAttributionSync: '/admin/asset-attribution-sync'
            },
            automation: {
              assetAttributionSync: {
                configured: Boolean(env.ASSET_ATTRIBUTION_WORKFLOW),
                lookbackHours: parseLookbackHours(env),
                startAt: getAssetAttributionStartAt(env)
              }
            },
            tables: {
              assets: 'tblRwzpWoLgE9MrUm',
              assetVersions: 'tblHxZ2hgSFLZxsZu'
            }
          },
          null,
          2
        ),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          }
        }
      );
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const payload = buildAssetAttributionWorkflowPayload(env, {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      triggeredBy: 'cron'
    });

    const instance = await createAssetAttributionWorkflowInstance(env, payload);
    ctx.waitUntil(
      Promise.resolve(instance.status?.()).catch((error) => {
        console.error('Failed to read asset attribution workflow status', error);
      })
    );
    console.log('Created asset attribution workflow instance', instance.id);
  }
};
