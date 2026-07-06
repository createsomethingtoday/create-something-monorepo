import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { Composio } from '@composio/core';
import { D1FeedbackStore, enableTelemetry, registerFeedbackTool } from '@create-something/mcp-core';
import { registerInfoResources } from '../src/resources.js';
import { registerOperatorNotionTools } from '../src/tools.js';
import { validateApiKey } from './lib/auth.js';
import { ComposioNotionDispatcher } from '../src/composio-notion.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  CONFIG_DB: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_BASE_URL?: string;
  COMPOSIO_NOTION_AUTH_CONFIG_ID?: string;
  MCP_API_KEY?: string;
  PARTNER_KEY?: string;
  PARTNER_CLIENT_SLUG?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  PINNED_HALFDOZEN_TOOL_NAME?: string;
  PINNED_CLIENT_TOOL_NAME?: string;
  OPENAI_API_KEY?: string;
  ROUTER_OPENAI_MODEL?: string;
  ROUTER_OPENAI_TIMEOUT_MS?: string;
  ROUTER_OPENAI_CACHE_TTL_MS?: string;
}

const SERVER_NAME = 'halfdozen-operator-notion-mcp';
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

function resolveLangfuseProjectName(env: Env): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export class OperatorNotionMcp extends McpAgent<Env> {
  server = new McpServer({ name: SERVER_NAME, version: '1.0.0' });
  private currentAccountId = 'operator';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = this.getAccountIdFromRequest(request) ?? 'operator';
    return super.fetch(request);
  }

  private getAccountIdFromRequest(request: Request): string | null {
    const accountHeader = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-account-id');
    if (accountHeader?.trim()) return accountHeader.trim();

    const auth = request.headers.get('authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      if (token && token !== this.env.MCP_API_KEY) return token;
    }

    return null;
  }

  async init() {
    if (!this.env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY is required.');
    }
    if (!this.env.CONFIG_DB) {
      throw new Error('CONFIG_DB D1 binding is required.');
    }

    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME, () => this.currentAccountId, {
        publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
        projectName: resolveLangfuseProjectName(this.env),
      });
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), SERVER_NAME);
    }

    const composio = new Composio({
      apiKey: this.env.COMPOSIO_API_KEY,
      ...(this.env.COMPOSIO_BASE_URL?.trim() ? { baseURL: this.env.COMPOSIO_BASE_URL.trim() } : {}),
    });
    const dispatcher = new ComposioNotionDispatcher(this.env.COMPOSIO_API_KEY);

    registerOperatorNotionTools(this.server, {
      db: this.env.CONFIG_DB,
      composio,
      dispatcher,
      partnerKey: this.env.PARTNER_KEY?.trim() || 'half-dozen',
      partnerClientSlug: this.env.PARTNER_CLIENT_SLUG?.trim() || 'blondish',
      notionAuthConfigId: this.env.COMPOSIO_NOTION_AUTH_CONFIG_ID?.trim(),
      pinnedHalfdozenToolName: this.env.PINNED_HALFDOZEN_TOOL_NAME?.trim() || 'halfdozen_notion',
      pinnedClientToolName: this.env.PINNED_CLIENT_TOOL_NAME?.trim() || 'blondish_notion',
      routerOpenAiApiKey: this.env.OPENAI_API_KEY?.trim(),
      routerOpenAiModel: this.env.ROUTER_OPENAI_MODEL?.trim(),
      routerOpenAiTimeoutMs: parsePositiveInt(this.env.ROUTER_OPENAI_TIMEOUT_MS),
      routerOpenAiCacheTtlMs: parsePositiveInt(this.env.ROUTER_OPENAI_CACHE_TTL_MS),
      getActor: () => this.currentAccountId,
    });
    registerInfoResources(this.server);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      return OperatorNotionMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            display_name: env.MCP_DISPLAY_NAME ?? 'Half Dozen Operator Notion MCP',
            version: '1.0.0',
            description:
              env.MCP_DESCRIPTION ??
              'Operator-managed Notion accounts via Composio with pinned workspace tools, deterministic sync contracts, and Codex automation-friendly run primitives.',
            tools: [
              env.PINNED_HALFDOZEN_TOOL_NAME ?? 'halfdozen_notion',
              env.PINNED_CLIENT_TOOL_NAME ?? 'blondish_notion',
              'operator_notion_accounts',
              'operator_notion_sync',
              'operator_notion_sync_contracts',
              'operator_notion_run_sync_contract',
              'operator_notion_router',
            ],
            partner: {
              key: env.PARTNER_KEY ?? 'half-dozen',
              client_slug: env.PARTNER_CLIENT_SLUG ?? 'blondish',
            },
            auth: {
              transport: 'Authorization: Bearer <MCP_API_KEY> or X-API-Key',
              composio: 'COMPOSIO_API_KEY + COMPOSIO_NOTION_AUTH_CONFIG_ID',
            },
            endpoints: { mcp: '/mcp' },
          },
          null,
          2,
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
