/**
 * Half Dozen DM MCP — Cloudflare Worker
 *
 * Generalized DM server identity.
 * v3 toolsets: Notion + DM-namespaced Composio proxy tools (allow-list driven).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { ComposioClient } from '@create-something/composio-bridge';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';
import { getDmConfig } from '../src/config.js';
import { getNotionClient, requireNotionClient } from '../src/lib/notion.js';
import { registerNotionTools } from '../src/tools/index.js';
import {
  discoverComposioProxyTools,
  registerComposioProxyTools,
} from '../src/tools/composio-proxy.js';
import {
  DM_NOTION_TOOLS,
  getToolsForConfig,
  registerToolsetsResource,
  registerToolsResource,
  type DmComposioProxyToolSummary,
  type DmComposioRuntimeSummary,
} from '../src/resources.js';
import { registerTaskWorkflowPrompt } from '../src/prompts.js';
import { resolveRequestAccountId, validateApiKey } from './lib/auth.js';
import type { DmConfig } from '../src/config.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;

  MCP_API_KEY?: string;
  NOTION_API_KEY?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_AUTH_CONFIG_MAP?: string;

  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;

  COMPOSIO_ENTITY_ID?: string;
  COMPOSIO_PROXY_MODE?: string;
  COMPOSIO_ALLOWED_TOOLKITS?: string;
  COMPOSIO_ALLOWED_TOOLKITS_BY_ENTITY?: string;
  COMPOSIO_TOOL_NAME_PREFIX?: string;
  COMPOSIO_TOOL_CACHE_SECONDS?: string;
}

const SERVER_NAME = 'halfdozen-dm-mcp';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

let lastComposioRuntimeSummary: DmComposioRuntimeSummary | undefined;
let lastComposioProxyTools: DmComposioProxyToolSummary[] = [];
let rootComposioSnapshot:
  | {
      fetchedAt: number;
      runtimeSummary: DmComposioRuntimeSummary;
      proxyTools: DmComposioProxyToolSummary[];
    }
  | undefined;

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

async function resolveRootComposioSnapshot(
  env: Env,
  config: DmConfig,
  enabledToolsets: Set<string>
): Promise<{
  runtimeSummary: DmComposioRuntimeSummary | undefined;
  proxyTools: DmComposioProxyToolSummary[];
}> {
  if (!enabledToolsets.has('composio')) {
    return { runtimeSummary: undefined, proxyTools: [] };
  }

  if (lastComposioRuntimeSummary && lastComposioProxyTools.length > 0) {
    return {
      runtimeSummary: lastComposioRuntimeSummary,
      proxyTools: lastComposioProxyTools,
    };
  }

  const ttlMs = Math.max(5, config.composio.toolCacheSeconds) * 1000;
  if (rootComposioSnapshot && Date.now() - rootComposioSnapshot.fetchedAt < ttlMs) {
    return {
      runtimeSummary: rootComposioSnapshot.runtimeSummary,
      proxyTools: rootComposioSnapshot.proxyTools,
    };
  }

  if (!env.COMPOSIO_API_KEY) {
    return {
      runtimeSummary: lastComposioRuntimeSummary,
      proxyTools: lastComposioProxyTools,
    };
  }

  try {
    const composioClient = new ComposioClient({ apiKey: env.COMPOSIO_API_KEY });
    const discovery = await discoverComposioProxyTools({
      composioClient,
      composioConfig: config.composio,
    });

    const proxyTools = discovery.proxiedTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      toolkit: tool.toolkit,
    }));
    const runtimeSummary: DmComposioRuntimeSummary = {
      registeredToolkits: discovery.registeredToolkits,
      proxiedToolCount: discovery.proxiedTools.length,
      warnings: discovery.warnings,
    };

    rootComposioSnapshot = {
      fetchedAt: Date.now(),
      runtimeSummary,
      proxyTools,
    };

    return { runtimeSummary, proxyTools };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      runtimeSummary: {
        registeredToolkits: [],
        proxiedToolCount: 0,
        warnings: [message],
      },
      proxyTools: [],
    };
  }
}

// =============================================================================
// MCP Agent
// =============================================================================

export class HalfDozenDmMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });
  private currentAccountId = 'operator';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = resolveRequestAccountId(request) ?? 'operator';
    return super.fetch(request);
  }

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME, () => this.currentAccountId, {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
      });
    }

    const config = getDmConfig(this.env);
    const notionClient = getNotionClient(this.env);
    const enabledToolsets = new Set(config.enabledToolsets);

    let composioRuntimeSummary: DmComposioRuntimeSummary | undefined;
    let composioProxyTools: DmComposioProxyToolSummary[] = [];

    if (enabledToolsets.has('notion')) {
      if (!notionClient) {
        console.warn('NOTION_API_KEY is not set; Notion tools will be unavailable.');
      } else {
        registerNotionTools(this.server, requireNotionClient(notionClient));
      }
    }

    if (enabledToolsets.has('composio')) {
      if (!this.env.COMPOSIO_API_KEY) {
        console.warn('COMPOSIO_API_KEY is not set; Composio proxy tools will be unavailable.');
      } else {
        const composioClient = new ComposioClient({ apiKey: this.env.COMPOSIO_API_KEY });

        try {
          const composioResult = await registerComposioProxyTools(this.server, {
            composioClient,
            composioConfig: config.composio,
            authConfigMapRaw: this.env.COMPOSIO_AUTH_CONFIG_MAP,
          });

          composioProxyTools = composioResult.proxiedTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            toolkit: tool.toolkit,
          }));

          composioRuntimeSummary = {
            registeredToolkits: composioResult.registeredToolkits,
            proxiedToolCount: composioResult.proxiedTools.length,
            warnings: composioResult.warnings,
          };

          console.info(
            `Registered DM Composio proxy tools (${composioResult.proxiedTools.length}) across ${composioResult.registeredToolkits.length} toolkit(s)`
          );
          if (composioResult.warnings.length > 0) {
            console.warn(`Composio proxy registration warnings: ${composioResult.warnings.join(' | ')}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Composio proxy tool registration failed: ${message}`);
          composioRuntimeSummary = {
            registeredToolkits: [],
            proxiedToolCount: 0,
            warnings: [message],
          };
        }
      }
    }

    lastComposioRuntimeSummary = composioRuntimeSummary;
    lastComposioProxyTools = composioProxyTools;
    if (composioRuntimeSummary) {
      rootComposioSnapshot = {
        fetchedAt: Date.now(),
        runtimeSummary: composioRuntimeSummary,
        proxyTools: composioProxyTools,
      };
    }

    registerToolsetsResource(this.server, config, composioRuntimeSummary);
    registerToolsResource(this.server, config, composioProxyTools);
    registerTaskWorkflowPrompt(this.server, config, composioRuntimeSummary);

    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), SERVER_NAME);
    }
  }
}

// =============================================================================
// Worker entry
// =============================================================================

export default {
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

    if (url.pathname === '/' || url.pathname === '/health') {
      const config = getDmConfig(env);
      const enabledToolsets = new Set(config.enabledToolsets);
      const rootComposio = await resolveRootComposioSnapshot(env, config, enabledToolsets);
      const declaredTools = getToolsForConfig(config, rootComposio.proxyTools).map(
        (tool) => tool.name
      );

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
                composio: 'COMPOSIO_API_KEY (+ COMPOSIO_AUTH_CONFIG_MAP for connect links)',
              },
            },
            composio: {
              toolset_enabled: enabledToolsets.has('composio'),
              api_key_configured: Boolean(env.COMPOSIO_API_KEY),
              auth_config_map_configured: Boolean(env.COMPOSIO_AUTH_CONFIG_MAP),
              proxy_mode: config.composio.proxyMode,
              default_entity_id: config.composio.defaultEntityId,
              allowed_toolkits: config.composio.allowedToolkits,
              allowed_toolkits_by_entity: config.composio.allowedToolkitsByEntity,
              tool_name_prefix: config.composio.toolNamePrefix,
              registered_toolkits: rootComposio.runtimeSummary?.registeredToolkits ?? [],
              proxied_tool_count: rootComposio.runtimeSummary?.proxiedToolCount ?? 0,
              warnings: rootComposio.runtimeSummary?.warnings ?? [],
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
