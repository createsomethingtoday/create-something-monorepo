/**
 * Gmail → Notion MCP — Cloudflare Worker (Composio-backed)
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /     — Health/info JSON
 *
 * Identity: send X-MCP-Account-Id or Authorization: Bearer <accountId> for multi-user metering.
 * Pricing: 100 free runs/period, then 1¢/run (1 run = 1 tool call).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { ComposioToolFactory } from '@create-something/composio-bridge';
import { registerAuthTools } from '../src/tools/auth.js';
import { incrementRun, getUsage } from '../src/metering.js';
import { normalizeAccountId } from '../src/identity.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  COMPOSIO_API_KEY: string;
  COMPOSIO_GMAIL_AUTH_CONFIG_ID?: string;
  COMPOSIO_NOTION_AUTH_CONFIG_ID?: string;
  /** D1 for run metering (100 free, then 1¢/run). Create with wrangler d1 create gmail-notion-mcp-runs */
  RUNS_DB?: D1Database;
}

// =============================================================================
// MCP Agent
// =============================================================================

export class GmailNotionMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'gmail-notion-mcp',
    version: '0.1.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjRkZGIiBzdHJva2U9IiM2NjYiLz48cGF0aCBkPSJNNiAxMGg0djRINlYxMHptMCA2aDR2NEg2di00em0xMC02aDR2NGgtNHYtNHptMCA2aDR2NGgtNHYtNHoiIGZpbGw9IiM2NjYiLz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  /** Set in fetch() from X-MCP-Account-Id or Authorization Bearer; used for Composio entityId and metering. */
  private currentAccountId = 'default';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = normalizeAccountId(this.getAccountIdFromRequest(request));
    return super.fetch(request);
  }

  private getAccountIdFromRequest(request: Request): string | null {
    const accountHeader = request.headers.get('x-mcp-account-id');
    if (accountHeader?.trim()) return accountHeader.trim();
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null;
    return null;
  }

  async init() {
    const apiKey = this.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      console.warn('COMPOSIO_API_KEY not set; Gmail/Notion tools will not be registered.');
      this.registerResourcesAndPromptsOnly();
      return;
    }

    const getEntityId = () => this.currentAccountId ?? 'default';

    const factory = new ComposioToolFactory({
      apiKey,
      apps: [
        { app: 'GMAIL', prefix: 'gmail' },
        { app: 'NOTION', prefix: 'notion' },
      ],
    });

    const count = await factory.registerToolsOnMcpServerWithResolver(
      this.server as import('@create-something/composio-bridge').McpServerLike,
      getEntityId,
      async (entityId) => {
        if (!this.env.RUNS_DB) return;
        try {
          await incrementRun(this.env.RUNS_DB, entityId);
        } catch (e) {
          console.warn('Run metering failed (tool call still succeeded):', e);
        }
      },
    );

    registerAuthTools(this.server, {
      composioClient: factory.getClient(),
      composioApiKey: apiKey,
      gmailAuthConfigId: this.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID,
      notionAuthConfigId: this.env.COMPOSIO_NOTION_AUTH_CONFIG_ID,
      getEntityId,
    });

    if (count > 0) {
      console.info(`Registered ${count} Composio tools (gmail_*, notion_*) and auth tools.`);
    }

    this.registerResourcesAndPromptsOnly();
  }

  private registerResourcesAndPromptsOnly() {
    const getEntityId = () => this.currentAccountId ?? 'default';

    // Database tier — Resources
    this.server.resource(
      'sync-config',
      'sync://config',
      { description: 'Sync configuration and connection status', mimeType: 'application/json' },
      async () => ({
        contents: [{
          uri: 'sync://config',
          mimeType: 'application/json',
          text: JSON.stringify({
            entityId: getEntityId(),
            gmailAuthConfigured: Boolean(this.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID),
            notionAuthConfigured: Boolean(this.env.COMPOSIO_NOTION_AUTH_CONFIG_ID),
            composioConfigured: Boolean(this.env.COMPOSIO_API_KEY),
          }, null, 2),
        }],
      }),
    );

    this.server.resource(
      'usage',
      'usage://self',
      { description: 'Run usage and pricing for the current account (100 free, then 1¢/run)', mimeType: 'application/json' },
      async () => {
        const accountId = getEntityId();
        const usage = this.env.RUNS_DB
          ? await getUsage(this.env.RUNS_DB, accountId)
          : { accountId, period: '', runsThisPeriod: 0, freeRuns: 0, billableRuns: 0, limit: 100 };
        return {
          contents: [{
            uri: 'usage://self',
            mimeType: 'application/json',
            text: JSON.stringify(usage, null, 2),
          }],
        };
      },
    );

    // Judgment tier — Prompts
    this.server.prompt(
      'capabilities',
      'What this Gmail–Notion MCP can do and how to connect',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to the Gmail–Notion MCP (Composio-backed).

## Connecting
- Use gmail_connection_status and notion_connection_status to check if the user has connected their accounts.
- If not connected, use gmail_get_connect_link or notion_get_connect_link and present the URL to the user.
- After they authorize, check connection_status again.

## Tools
- gmail_* — Search, read, send emails (Gmail toolkit).
- notion_* — Create pages, query databases, update blocks (Notion toolkit).
- Use these to sync emails to Notion, find or create contacts, and build workflows.

## Tips
- Gmail search: from:, to:, subject:, after:, before:, label:, has:attachment.
- Notion: you need database IDs or page IDs from the user or from previous tool results.`,
          },
        }],
      }),
    );

    this.server.prompt(
      'sync_workflow',
      'Guided workflow: find emails and sync to Notion',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Help me sync emails to Notion. Steps:
1. Use gmail_connection_status and notion_connection_status; if either is disconnected, get the connect link and have the user authorize.
2. Ask what emails to sync (e.g. from a sender, a label, or a date range).
3. Use gmail_* search/list tools to find the emails.
4. Use notion_* tools to create pages or database rows (user must provide or you discover the target database ID).
5. Summarize what was synced.`,
          },
        }],
      }),
    );
  }
}

// =============================================================================
// Worker entry
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return GmailNotionMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(
        JSON.stringify(
          {
            name: 'gmail-notion-mcp',
            version: '0.1.0',
            description: 'Gmail to Notion MCP (Composio-backed). Tools, prompts, resources.',
            auth_surfaces: {
              gmail: {
                method: 'composio',
                tools: ['gmail_connection_status', 'gmail_get_connect_link', 'gmail_*'],
              },
              notion: {
                method: 'composio',
                tools: ['notion_connection_status', 'notion_get_connect_link', 'notion_*'],
              },
            },
            identity: 'Send X-MCP-Account-Id or Authorization: Bearer <accountId> for multi-user metering.',
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
