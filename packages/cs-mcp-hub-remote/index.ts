import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';

import registryJson from '../../config/mcp-hub/registry.json';
import {
  BROKER_TOOLS,
  describeTools,
  invokeToolByCatalogName,
  searchTools,
  toolsForDiscoveryMode
} from './src/broker.js';
import { decodeOffsetCursor, paginateItems } from './src/pagination.js';
import { enforcePolicyAndQuota } from './src/policy.js';
import { getHubRuntime } from './src/runtime.js';
import {
  queryTraceByCorrelation,
  recordHubInvocation,
  recordHubRouteInvocation
} from './src/telemetry.js';
import { extractInvocationTrace, resolveAccountId, resolveTenantId } from './src/trace.js';
import type { DiscoveryMode, Env, HubRuntime, McpBundleRegistry, ProxyRoute } from './src/types.js';
import {
  asRecord,
  authorizeRequest,
  formatHubError,
  jsonResponse,
  normalizeArgs,
  numberArg,
  parsePositiveInt,
  readEnvString,
  stringArg,
  toErrorResult,
  toJsonResult,
  withCors
} from './src/utils.js';

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.1.0';
const DEFAULT_LIST_PAGE_SIZE = 50;

const registry = registryJson as unknown as McpBundleRegistry;

const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show active downstream MCP servers, proxy tool count, and warning state.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'hub_list_registry',
    description: 'List all servers and bundles known by this remote hub registry.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'hub_list_proxy_tools',
    description: 'List proxy tool names currently available from connected downstream MCPs.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'hub_refresh_connections',
    description: 'Force-refresh downstream MCP connections and proxy tool catalog.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'hub_trace_lookup',
    description: 'Lookup hub and downstream telemetry records by correlation ID.',
    inputSchema: {
      type: 'object',
      properties: {
        correlationId: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['correlationId'],
      additionalProperties: false
    }
  }
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authFailure = authorizeRequest(request, env);
      if (authFailure) {
        return withCors(authFailure);
      }

      try {
        const runtime = await getHubRuntime(env, registry);
        const server = buildHubServer(runtime, env);
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        });

        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return withCors(jsonResponse({ error: message }, 500));
      }
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      try {
        const runtime = await getHubRuntime(env, registry);
        const mode = getDiscoveryMode(env);
        return withCors(
          jsonResponse({
            name: HUB_NAME,
            version: HUB_VERSION,
            endpoints: {
              mcp: '/mcp',
              health: '/health'
            },
            discovery_mode: mode,
            list_page_size: getListPageSize(env),
            auth_required: Boolean(readEnvString(env, 'HUB_API_TOKEN')),
            downstream_auth_config: {
              has_cs_telemetry_operator_token: Boolean(
                readEnvString(env, 'CS_TELEMETRY_OPERATOR_API_TOKEN')
              ),
              has_halfdozen_telemetry_operator_token: Boolean(
                readEnvString(env, 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN')
              )
            },
            enabled_servers: runtime.stateResolution.enabledServerNames,
            connected_servers: runtime.connected.map((server) => ({
              name: server.name,
              tool_count: server.tools.length
            })),
            failed_servers: runtime.failed,
            proxy_tool_count: runtime.proxies.toolDefinitions.length,
            catalog_tool_count: runtime.catalog.entries.length,
            warnings: runtime.stateResolution.warnings.concat(runtime.proxies.warnings),
            built_at: new Date(runtime.builtAt).toISOString()
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return withCors(jsonResponse({ error: message }, 500));
      }
    }

    return withCors(new Response('Not found', { status: 404 }));
  }
};

function getDiscoveryMode(env: Env): DiscoveryMode {
  const raw = readEnvString(env, 'HUB_DISCOVERY_MODE')?.toLowerCase();
  return raw === 'compat' ? 'compat' : 'broker';
}

function getListPageSize(env: Env): number {
  return parsePositiveInt(readEnvString(env, 'HUB_LIST_PAGE_SIZE'), DEFAULT_LIST_PAGE_SIZE);
}

function buildHubServer(runtime: HubRuntime, env: Env): Server {
  const server = new Server(
    {
      name: HUB_NAME,
      version: HUB_VERSION
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const mode = getDiscoveryMode(env);
    const listPageSize = getListPageSize(env);
    const allTools = toolsForDiscoveryMode(MANAGEMENT_TOOLS, runtime, mode).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const cursor = stringArg(asRecord(request.params)?.cursor);
    const offset = decodeOffsetCursor(cursor ?? undefined);
    const paged = paginateItems(allTools, offset, listPageSize);

    return {
      tools: paged.items,
      ...(paged.nextCursor ? { nextCursor: paged.nextCursor } : {})
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const toolName = request.params.name;
    const args = normalizeArgs(request.params.arguments);
    const trace = extractInvocationTrace(request, extra);
    const accountId = resolveAccountId(extra, env);
    const tenantId = resolveTenantId(extra, env);
    const startedAt = Date.now();

    let route: ProxyRoute | null = null;
    let routeCatalog = null as HubRuntime['catalog']['entries'][number] | null;

    try {
      if (toolName === 'hub_status') {
        const result = toJsonResult(buildStatusPayload(runtime, env));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management'
          }
        });
        return result;
      }

      if (toolName === 'hub_list_registry') {
        const result = toJsonResult(buildRegistryPayload(registry));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management'
          }
        });
        return result;
      }

      if (toolName === 'hub_list_proxy_tools') {
        const result = toJsonResult({
          proxyTools: runtime.proxies.toolDefinitions.map((tool) => tool.name),
          count: runtime.proxies.toolDefinitions.length
        });
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management'
          }
        });
        return result;
      }

      if (toolName === 'hub_refresh_connections' || toolName === 'hub_tools_refresh_index') {
        const refreshed = await getHubRuntime(env, registry, { force: true });
        const result = toJsonResult(buildStatusPayload(refreshed, env));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: toolName === 'hub_refresh_connections' ? 'management' : 'broker',
            refreshed: true
          }
        });
        return result;
      }

      if (toolName === 'hub_trace_lookup') {
        const correlationId = stringArg(args.correlationId) ?? '';
        if (!correlationId) {
          const errorResult = toErrorResult('"correlationId" is required');
          await recordHubInvocation(env, {
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"correlationId" is required',
            metadata: {
              type: 'management'
            }
          });
          return errorResult;
        }

        const limit = numberArg(args.limit, 50, 1, 200);
        const lookup = await queryTraceByCorrelation(env, correlationId, limit);
        const result = toJsonResult(lookup);
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            correlationId,
            limit
          }
        });
        return result;
      }

      if (toolName === 'hub_tools_search') {
        const payload = searchTools(args, runtime);
        const result = toJsonResult(payload);
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'broker',
            operation: 'search',
            resultCount: Array.isArray(payload.results) ? payload.results.length : 0
          }
        });
        return result;
      }

      if (toolName === 'hub_tools_describe') {
        const payload = describeTools(args, runtime);
        const result = toJsonResult(payload);
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'broker',
            operation: 'describe',
            foundCount: Array.isArray(payload.found) ? payload.found.length : 0
          }
        });
        return result;
      }

      if (toolName === 'hub_tools_invoke') {
        const payload = await invokeToolByCatalogName(args, runtime, env, trace, tenantId);
        const result = toJsonResult(payload);

        const routePayload = asRecord(payload.route);
        const success = payload.success !== false;
        const durationMs = Date.now() - startedAt;

        await Promise.all([
          recordHubInvocation(env, {
            accountId,
            toolName,
            success,
            durationMs,
            trace,
            errorMessage: success ? null : 'Broker-invoked downstream tool returned isError',
            metadata: {
              type: 'broker',
              operation: 'invoke',
              toolRef: payload.toolRef,
              resolvedName: payload.resolvedName,
              downstreamServer: routePayload?.server,
              downstreamTool: routePayload?.downstreamTool
            }
          }),
          recordHubRouteInvocation(env, {
            accountId,
            downstreamServer: String(routePayload?.server ?? 'unknown'),
            downstreamTool: String(routePayload?.downstreamTool ?? 'unknown'),
            success,
            durationMs,
            trace,
            errorMessage: success ? null : 'Broker-invoked downstream tool returned isError',
            metadata: {
              proxyToolName: routePayload?.proxyName,
              brokerToolName: toolName,
              resolvedName: payload.resolvedName
            }
          })
        ]);

        return result;
      }

      route = runtime.proxies.routes.get(toolName) ?? null;
      if (!route) {
        const message = `Unknown tool "${toolName}"`;
        const errorResult = toErrorResult(message, 'HUB_TOOL_NOT_FOUND', { toolName });

        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: false,
          durationMs: Date.now() - startedAt,
          trace,
          errorMessage: message,
          metadata: {
            type: 'unknown-tool'
          }
        });

        return errorResult;
      }

      routeCatalog =
        runtime.catalog.byName.get(toolName) ??
        runtime.catalog.byName.get(route.proxyToolName) ??
        null;
      if (routeCatalog) {
        await enforcePolicyAndQuota(env, {
          tenantId,
          toolRef: routeCatalog.toolRef,
          serverName: routeCatalog.serverName,
          connector: routeCatalog.connector,
          readWrite: routeCatalog.readWrite
        });
      }

      const proxiedResult = await route.call(args, trace);
      const proxiedSuccess = asRecord(proxiedResult)?.isError !== true;
      const durationMs = Date.now() - startedAt;

      await Promise.all([
        recordHubInvocation(env, {
          accountId,
          toolName,
          success: proxiedSuccess,
          durationMs,
          trace,
          errorMessage: proxiedSuccess ? null : 'Downstream MCP returned isError response',
          metadata: {
            type: 'proxy',
            discoveryMode: getDiscoveryMode(env),
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
            toolRef: routeCatalog?.toolRef,
            dottedAlias: routeCatalog?.dottedAlias
          }
        }),
        recordHubRouteInvocation(env, {
          accountId,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          success: proxiedSuccess,
          durationMs,
          trace,
          errorMessage: proxiedSuccess ? null : 'Downstream MCP returned isError response',
          metadata: {
            proxyToolName: toolName,
            toolRef: routeCatalog?.toolRef
          }
        })
      ]);

      return proxiedResult as Record<string, unknown>;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const formattedError = formatHubError(error);

      await recordHubInvocation(env, {
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: formattedError.message,
        metadata: {
          type: route
            ? 'proxy'
            : BROKER_TOOLS.some((tool) => tool.name === toolName)
              ? 'broker'
              : 'management',
          code: formattedError.code,
          downstreamServer: route?.serverName ?? null,
          downstreamTool: route?.downstreamToolName ?? null,
          toolRef: routeCatalog?.toolRef ?? null
        }
      });

      if (route) {
        await recordHubRouteInvocation(env, {
          accountId,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          success: false,
          durationMs,
          trace,
          errorMessage: formattedError.message,
          metadata: {
            proxyToolName: toolName,
            code: formattedError.code,
            toolRef: routeCatalog?.toolRef
          }
        });
      }

      return toErrorResult(formattedError.message, formattedError.code, {
        correlationId: trace.correlationId,
        requestId: trace.requestId,
        ...(formattedError.meta ?? {})
      });
    }
  });

  return server;
}

function buildStatusPayload(runtime: HubRuntime, env: Env): Record<string, unknown> {
  return {
    hub: {
      name: HUB_NAME,
      version: HUB_VERSION
    },
    discoveryMode: getDiscoveryMode(env),
    listPageSize: getListPageSize(env),
    state: runtime.stateResolution.state,
    enabledServerNames: runtime.stateResolution.enabledServerNames,
    connectedServers: runtime.connected.map((server) => ({
      name: server.name,
      toolCount: server.tools.length
    })),
    failedServers: runtime.failed,
    proxyToolCount: runtime.proxies.toolDefinitions.length,
    catalogToolCount: runtime.catalog.entries.length,
    warnings: runtime.proxies.warnings,
    builtAt: new Date(runtime.builtAt).toISOString(),
    note: 'Use hub_refresh_connections or hub_tools_refresh_index to force reconnect + rebuild tool catalog index.'
  };
}

function buildRegistryPayload(currentRegistry: McpBundleRegistry): Record<string, unknown> {
  const servers = Object.entries(currentRegistry.servers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, config]) => ({
      name,
      transport: config.transport,
      target:
        config.transport === 'http'
          ? config.url
          : `${config.command} ${(config.args ?? []).join(' ')}`.trim(),
      tags: config.tags ?? [],
      description: config.description ?? '',
      lifecycle: config.lifecycle ?? 'active',
      catalog: config.catalog ?? null
    }));

  const bundles = Object.entries(currentRegistry.bundles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bundleServers]) => ({
      name,
      servers: bundleServers
    }));

  return {
    servers,
    bundles,
    defaults: currentRegistry.defaults ?? {}
  };
}
