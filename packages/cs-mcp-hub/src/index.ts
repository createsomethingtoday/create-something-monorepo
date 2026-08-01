#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  loadContext,
  parseAdminArgs,
  printAdminUsage,
  runAdminMode,
  writeCodexResult,
  type AdminArgs,
} from './admin.js';
import {
  loadRouting,
  loadState,
  resolveState,
  saveState,
  updateState,
} from './config.js';
import { closeDownstreamServers, connectDownstreamServers } from './downstream.js';
import {
  buildConnectionsPayload,
  buildPolicyStatusPayload,
  buildRegistryPayload,
  buildRoutingPayload,
  buildStatePayload,
  buildStatusPayload,
  searchProxyTools,
  type HubIdentity,
} from './payloads.js';
import { routeProblem, type HubProblemRouteArgs } from './problem-routing.js';
import { buildProxyCatalog } from './proxy-catalog.js';
import {
  applyRateLimit,
  resolveRateLimitPolicy,
} from './rate-limit.js';
import { resolveTenantRoutingContext } from './routing.js';
import type { McpBundleRegistry, RegistryPaths, StatePatch } from './types.js';
import {
  booleanArg,
  enumArg,
  normalizeArgs,
  numberArg,
  parseBooleanEnv,
  stringArg,
  stringArrayArg,
  toErrorResult,
  toJsonResource,
  toJsonResult,
} from './util/json.js';

const HUB_NAME = 'create-something-hub';
const HUB_VERSION = '0.1.0';

const HUB_IDENTITY: HubIdentity = {
  name: HUB_NAME,
  version: HUB_VERSION,
};

const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show registry, state, active bundles, connected servers, and proxy tool coverage.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hub_list_registry',
    description: 'List all known MCP servers and bundles from the hub registry.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hub_update_state',
    description:
      'Enable/disable bundles or servers in the state database. Optionally writes .codex/config.toml immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        enableBundles: { type: 'array', items: { type: 'string' } },
        disableBundles: { type: 'array', items: { type: 'string' } },
        enableServers: { type: 'array', items: { type: 'string' } },
        disableServers: { type: 'array', items: { type: 'string' } },
        writeCodexConfig: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_write_codex_config',
    description:
      'Write current bundle/server enablement to .codex/config.toml. Existing non-registry servers are preserved.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_proxy_tools',
    description: 'List currently proxied tools exposed by this hub instance.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hub_search_proxy_tools',
    description: 'Search proxied tools with optional server filter and cursor pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        serverName: { type: 'string' },
        cursor: { type: 'string' },
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_routing',
    description: 'Show active tenant routing policy, alias plans, and filtered tool visibility.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_policy_status',
    description: 'Show active proxy policy settings (including rate limits) for this hub runtime.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_route_problem',
    description:
      'Classify task bottleneck axis (reasoning/effort/coordination/ambiguity/etc.) and return model-profile routing.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string' },
        context: { type: 'string' },
        requiresToolOrchestration: { type: 'boolean' },
        stakeholderCount: { type: 'number' },
        expectedDurationMinutes: { type: 'number' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        domainCriticality: { type: 'string', enum: ['low', 'medium', 'high'] },
        isCodeTask: { type: 'boolean' },
      },
      required: ['task'],
      additionalProperties: false,
    },
  },
];

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${HUB_NAME}] fatal: ${message}`);
  process.exit(1);
});

async function main(): Promise<void> {
  const admin: AdminArgs | null = parseAdminArgs(process.argv.slice(2));
  if (admin !== null) {
    await runAdminMode(admin, HUB_IDENTITY);
    return;
  }

  await runServerMode();
}

async function runServerMode(): Promise<void> {
  const { paths, registry } = loadContext();
  const routing = loadRouting(paths);
  const tenantRouting = resolveTenantRoutingContext(
    routing,
    process.env.HUB_TENANT_ID,
    parseBooleanEnv(process.env.HUB_ALLOW_PENDING_OAUTH_APPROVALS, false),
  );
  const initialState = loadState(paths);
  const resolution = resolveState(registry, initialState);
  const downstream = await connectDownstreamServers(registry, resolution.enabledServerNames);
  const proxies = buildProxyCatalog(
    downstream.connected,
    registry,
    routing,
    tenantRouting,
    MANAGEMENT_TOOLS.map((tool) => tool.name),
  );
  const rateLimitPolicy = resolveRateLimitPolicy(process.env);

  const server = new Server(
    {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...MANAGEMENT_TOOLS, ...proxies.toolDefinitions],
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'hub://status',
        name: 'Hub Status',
        description: 'Hub runtime status, resolution summary, connected/failed servers, and proxy tooling counts.',
        mimeType: 'application/json',
      },
      {
        uri: 'hub://registry',
        name: 'Hub Registry',
        description: 'Configured registry servers and bundles as seen by hub runtime.',
        mimeType: 'application/json',
      },
      {
        uri: 'hub://proxy-tools',
        name: 'Hub Proxy Tools',
        description: 'Current proxied tools exposed by the hub instance.',
        mimeType: 'application/json',
      },
      {
        uri: 'hub://state',
        name: 'Hub State',
        description: 'Resolved state payload, including enabled bundles and servers.',
        mimeType: 'application/json',
      },
      {
        uri: 'hub://connections',
        name: 'Hub Connections',
        description: 'Per-server connection status for all configured servers.',
        mimeType: 'application/json',
      },
      {
        uri: 'hub://routing',
        name: 'Hub Routing',
        description: 'Tenant policy, alias routes, and provider failover plan.',
        mimeType: 'application/json',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    const status = buildStatusPayload(
      HUB_IDENTITY,
      paths,
      registry,
      downstream,
      proxies,
      rateLimitPolicy,
      tenantRouting,
    );
    const registryPayload = buildRegistryPayload(registry);
    const proxyToolsPayload = {
      proxyTools: proxies.toolDefinitions.map((tool) => tool.name),
      count: proxies.toolDefinitions.length,
    };
    const routingPayload = buildRoutingPayload(routing, tenantRouting, proxies);

    switch (uri) {
      case 'hub://status':
        return toJsonResource(uri, status);
      case 'hub://registry':
        return toJsonResource(uri, registryPayload);
      case 'hub://proxy-tools':
        return toJsonResource(uri, proxyToolsPayload);
      case 'hub://state':
        return toJsonResource(uri, buildStatePayload(paths, registry));
      case 'hub://connections':
        return toJsonResource(uri, buildConnectionsPayload(registry, downstream, resolution.enabledServerNames));
      case 'hub://routing':
        return toJsonResource(uri, routingPayload);
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = normalizeArgs(request.params.arguments);

    try {
      if (toolName === 'hub_status') {
        return toJsonResult(
          buildStatusPayload(HUB_IDENTITY, paths, registry, downstream, proxies, rateLimitPolicy, tenantRouting),
        );
      }

      if (toolName === 'hub_list_registry') {
        return toJsonResult(buildRegistryPayload(registry));
      }

      if (toolName === 'hub_list_proxy_tools') {
        return toJsonResult({
          proxyTools: proxies.toolDefinitions.map((tool) => tool.name),
          count: proxies.toolDefinitions.length,
        });
      }

      if (toolName === 'hub_search_proxy_tools') {
        return toJsonResult(searchProxyTools(proxies, args));
      }

      if (toolName === 'hub_list_routing') {
        return toJsonResult(buildRoutingPayload(routing, tenantRouting, proxies));
      }

      if (toolName === 'hub_policy_status') {
        return toJsonResult(buildPolicyStatusPayload(rateLimitPolicy));
      }

      if (toolName === 'hub_route_problem') {
        return toJsonResult(routeProblem(parseProblemRouteArgs(args)));
      }

      if (toolName === 'hub_update_state') {
        return toJsonResult(applyStateUpdate(args, paths, registry));
      }

      if (toolName === 'hub_write_codex_config') {
        return toJsonResult(writeCodexResult(paths, registry));
      }

      const route = proxies.routes.get(toolName);
      if (!route) {
        return toErrorResult(`Unknown tool "${toolName}"`);
      }

      const rateLimitDecision = applyRateLimit(rateLimitPolicy, 'operator', route);
      if (!rateLimitDecision.allowed) {
        return toErrorResult(
          `Rate limit exceeded (${rateLimitDecision.maxCalls} calls per ${rateLimitDecision.windowSeconds}s, scope=${rateLimitDecision.scope}). ` +
          `Retry after ${rateLimitDecision.resetAt}.`,
        );
      }

      return await route.call(args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return toErrorResult(`Tool "${toolName}" failed: ${message}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${HUB_NAME}] running on stdio`);
  console.error(
    `[${HUB_NAME}] enabled=${resolution.enabledServerNames.length} connected=${downstream.connected.length} failed=${downstream.failed.length} proxied_tools=${proxies.toolDefinitions.length}`,
  );
  console.error(
    `[${HUB_NAME}] tenant=${tenantRouting.tenantId} direct_tools=${proxies.directRouteMetas.length} aliases=${proxies.aliasPlans.length}`,
  );
  if (downstream.failed.length > 0) {
    console.error(`[${HUB_NAME}] failed servers: ${downstream.failed.map((f) => f.name).join(', ')}`);
  }
  if (resolution.warnings.length > 0) {
    console.error(`[${HUB_NAME}] state warnings: ${resolution.warnings.join(' | ')}`);
  }
  if (proxies.warnings.length > 0) {
    console.error(`[${HUB_NAME}] proxy warnings: ${proxies.warnings.join(' | ')}`);
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await closeDownstreamServers(downstream.connected);
    try {
      await server.close();
    } catch {
      // ignore close errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  // Reference printAdminUsage so it remains visible in --help wiring callers.
  void printAdminUsage;
}

function applyStateUpdate(
  args: Record<string, unknown>,
  paths: RegistryPaths,
  registry: McpBundleRegistry,
): Record<string, unknown> {
  const patch: StatePatch = {
    enableBundles: stringArrayArg(args.enableBundles, 'enableBundles'),
    disableBundles: stringArrayArg(args.disableBundles, 'disableBundles'),
    enableServers: stringArrayArg(args.enableServers, 'enableServers'),
    disableServers: stringArrayArg(args.disableServers, 'disableServers'),
  };

  const current = loadState(paths);
  const next = updateState(registry, current, patch);
  saveState(paths, next);

  const writeRequested = booleanArg(args.writeCodexConfig, true);
  const writeResult = writeRequested ? writeCodexResult(paths, registry) : null;
  const resolution = resolveState(registry, next);

  return {
    updatedState: next,
    enabledServerNames: resolution.enabledServerNames,
    warnings: resolution.warnings,
    codexWrite: writeResult,
    note: 'Restart create-something-hub to refresh proxied downstream tools after state changes.',
  };
}

function parseProblemRouteArgs(args: Record<string, unknown>): HubProblemRouteArgs {
  const task = stringArg(args.task);
  if (!task) {
    throw new Error('"task" is required');
  }

  const context = stringArg(args.context) ?? undefined;

  let isCodeTask: boolean | null | undefined;
  if (args.isCodeTask === undefined) {
    isCodeTask = undefined;
  } else if (typeof args.isCodeTask === 'boolean') {
    isCodeTask = args.isCodeTask;
  } else {
    throw new Error('"isCodeTask" must be a boolean');
  }

  return {
    task,
    context,
    requiresToolOrchestration: booleanArg(args.requiresToolOrchestration, false),
    stakeholderCount: numberArg(args.stakeholderCount, 1, 1, 10_000),
    expectedDurationMinutes: numberArg(args.expectedDurationMinutes, 60, 1, 60 * 24 * 30),
    riskLevel: enumArg(args.riskLevel, 'riskLevel', ['low', 'medium', 'high'] as const, 'medium'),
    domainCriticality: enumArg(
      args.domainCriticality,
      'domainCriticality',
      ['low', 'medium', 'high'] as const,
      'medium',
    ),
    isCodeTask,
  };
}
