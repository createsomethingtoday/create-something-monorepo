/**
 * Half Dozen DM MCP — Cloudflare Worker
 *
 * Generalized DM server identity.
 * v2 toolsets: Notion + DM-scoped Google Drive sync.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { ComposioClient } from '@create-something/composio-bridge';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';
import { getDmConfig } from '../src/config.js';
import { getNotionClient, requireNotionClient } from '../src/lib/notion.js';
import { registerDriveTools, registerNotionTools } from '../src/tools/index.js';
import {
  DM_DRIVE_TOOLS,
  DM_NOTION_TOOLS,
  getToolsForConfig,
  registerToolsetsResource,
  registerToolsResource,
} from '../src/resources.js';
import { registerTaskWorkflowPrompt } from '../src/prompts.js';
import { resolveDriveActionSlugs, syncRecentDriveFiles } from '../src/tools/drive-sync.js';
import type { D1Database as DriveSyncDatabase } from '../src/lib/drive-sync-state.js';
import { validateApiKey } from './lib/auth.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  DRIVE_SYNC_DB?: D1Database;

  MCP_API_KEY?: string;
  NOTION_API_KEY?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID?: string;

  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;

  COMPOSIO_ENTITY_ID?: string;
  DRIVE_SYNC_DATA_SOURCE_ID?: string;
  ENABLE_DRIVE_CRON?: string;
  DRIVE_CRON_BATCH_SIZE?: string;
  DRIVE_CRON_INITIAL_LOOKBACK_DAYS?: string;

  COMPOSIO_DRIVE_LIST_FILES_TOOL_SLUG?: string;
  COMPOSIO_DRIVE_GET_METADATA_TOOL_SLUG?: string;
  COMPOSIO_DRIVE_PARSE_FILE_TOOL_SLUG?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_ENABLED?: string;
}

const SERVER_NAME = 'halfdozen-dm-mcp';

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw || !raw.trim()) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

// =============================================================================
// MCP Agent
// =============================================================================

export class HalfDozenDmMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME, undefined, {
        apiKey: this.env.BRAINTRUST_API_KEY,
        projectName: this.env.BRAINTRUST_PROJECT_NAME ?? SERVER_NAME,
        enabled: parseBoolean(this.env.BRAINTRUST_ENABLED, true),
      });
    }

    const config = getDmConfig(this.env);
    const notionClient = getNotionClient(this.env);
    const enabledToolsets = new Set(config.enabledToolsets);

    if (enabledToolsets.has('notion')) {
      if (!notionClient) {
        console.warn('NOTION_API_KEY is not set; Notion tools will be unavailable.');
      } else {
        registerNotionTools(this.server, requireNotionClient(notionClient));
      }
    }

    if (enabledToolsets.has('drive')) {
      const missing: string[] = [];
      if (!this.env.COMPOSIO_API_KEY) missing.push('COMPOSIO_API_KEY');
      if (!notionClient) missing.push('NOTION_API_KEY');
      if (!config.drive.targetDataSourceId) missing.push('DRIVE_SYNC_DATA_SOURCE_ID');
      if (!this.env.DRIVE_SYNC_DB) missing.push('DRIVE_SYNC_DB binding');

      if (missing.length > 0) {
        console.warn(
          `Drive toolset enabled but not fully configured; skipping Drive tool registration. Missing: ${missing.join(', ')}`
        );
      } else {
        const composioClient = new ComposioClient({ apiKey: this.env.COMPOSIO_API_KEY! });

        try {
          const actionSlugs = await registerDriveTools(this.server, requireNotionClient(notionClient), {
            composioClient,
            composioApiKey: this.env.COMPOSIO_API_KEY!,
            driveAuthConfigId: this.env.COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID,
            driveSyncDb: this.env.DRIVE_SYNC_DB as unknown as DriveSyncDatabase,
            entityId: config.drive.entityId,
            targetDataSourceId: config.drive.targetDataSourceId!,
            actionSlugOverrides: config.drive.toolSlugs,
            defaultRecentLimit: config.drive.cronBatchSize,
            initialLookbackDays: config.drive.cronInitialLookbackDays,
          });

          console.info(
            `Registered DM Drive tools (${DM_DRIVE_TOOLS.length}) with action slugs: ${JSON.stringify(actionSlugs)}`
          );
        } catch (error) {
          console.warn(`Drive toolset registration failed: ${String(error)}`);
        }
      }
    }

    registerToolsetsResource(this.server, config);
    registerToolsResource(this.server, config);
    registerTaskWorkflowPrompt(this.server, config);

    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), SERVER_NAME);
    }
  }
}

// =============================================================================
// Worker entry
// =============================================================================

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const config = getDmConfig(env);
    const enabledToolsets = new Set(config.enabledToolsets);

    if (!enabledToolsets.has('drive')) {
      return;
    }

    if (!config.drive.enableCron) {
      return;
    }

    const missing: string[] = [];
    if (!env.COMPOSIO_API_KEY) missing.push('COMPOSIO_API_KEY');
    if (!env.NOTION_API_KEY) missing.push('NOTION_API_KEY');
    if (!env.DRIVE_SYNC_DB) missing.push('DRIVE_SYNC_DB binding');
    if (!config.drive.targetDataSourceId) missing.push('DRIVE_SYNC_DATA_SOURCE_ID');

    if (missing.length > 0) {
      console.warn(`Drive cron skipped due to missing configuration: ${missing.join(', ')}`);
      return;
    }

    const notionClient = getNotionClient(env);
    if (!notionClient) {
      console.warn('Drive cron skipped: NOTION_API_KEY is unavailable.');
      return;
    }

    const composioClient = new ComposioClient({ apiKey: env.COMPOSIO_API_KEY! });

    try {
      const actionSlugs = await resolveDriveActionSlugs(composioClient, config.drive.toolSlugs);
      const summary = await syncRecentDriveFiles(
        {
          composioClient,
          notionClient: requireNotionClient(notionClient),
          driveSyncDb: env.DRIVE_SYNC_DB as unknown as DriveSyncDatabase,
          entityId: config.drive.entityId,
          targetDataSourceId: config.drive.targetDataSourceId!,
          actionSlugs,
          defaultRecentLimit: config.drive.cronBatchSize,
          initialLookbackDays: config.drive.cronInitialLookbackDays,
        },
        {
          limit: config.drive.cronBatchSize,
          withContent: false,
          metadataOnly: true,
          lookbackDays: config.drive.cronInitialLookbackDays,
        }
      );

      console.info(`Drive cron run complete: ${JSON.stringify(summary)}`);
    } catch (error) {
      console.error(`Drive cron run failed: ${String(error)}`);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      return HalfDozenDmMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      return HalfDozenDmMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      const config = getDmConfig(env);
      const enabledToolsets = new Set(config.enabledToolsets);
      const declaredTools = getToolsForConfig(config).map((tool) => tool.name);

      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            display_name: config.displayName,
            version: '1.0.0',
            description: config.description,
            toolsets: config.enabledToolsets,
            tools: declaredTools,
            auth: {
              transport: 'Authorization: Bearer <MCP_API_KEY> or X-API-Key',
              upstream: {
                notion: `NOTION_API_KEY (server-side secret) — ${config.clientLabel}`,
                drive: 'COMPOSIO_API_KEY + COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID (server-side secrets)',
              },
            },
            drive: {
              toolset_enabled: enabledToolsets.has('drive'),
              entity_id: config.drive.entityId,
              target_data_source_configured: Boolean(config.drive.targetDataSourceId),
              composio_configured: Boolean(env.COMPOSIO_API_KEY),
              auth_config_configured: Boolean(env.COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID),
              sync_db_bound: Boolean(env.DRIVE_SYNC_DB),
              cron_enabled: config.drive.enableCron,
              cron_batch_size: config.drive.cronBatchSize,
              cron_initial_lookback_days: config.drive.cronInitialLookbackDays,
              tools: DM_DRIVE_TOOLS.map((tool) => tool.name),
            },
            notion: {
              toolset_enabled: enabledToolsets.has('notion'),
              api_key_configured: Boolean(env.NOTION_API_KEY),
              tools: DM_NOTION_TOOLS.map((tool) => tool.name),
            },
            endpoints: { mcp: '/mcp', sse: '/sse' },
          },
          null,
          2
        ),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
