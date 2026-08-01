/**
 * Pure payload builders for hub_status, hub_list_registry, hub_list_routing,
 * hub_search_proxy_tools, and resource reads.
 *
 * Extracted from `src/index.ts` so the resource and tool handlers stay thin.
 * No process state is read or written here except via injected helpers.
 */

import { loadState } from './config.js';
import { resolveState } from './config.js';
import type { DownstreamConnections } from './downstream.js';
import type { ProxyCatalog } from './proxy-catalog.js';
import {
  activeRateLimitBucketCount,
  resolveRateLimitPolicy,
  type RateLimitPolicy,
} from './rate-limit.js';
import type { TenantRoutingContext } from './routing.js';
import type {
  HubRoutingConfig,
  McpBundleRegistry,
  RegistryPaths,
} from './types.js';
import { numberArg, stringArg } from './util/json.js';

export type HubIdentity = {
  name: string;
  version: string;
};

export function buildStatusPayload(
  identity: HubIdentity,
  paths: RegistryPaths,
  registry: McpBundleRegistry,
  downstream: DownstreamConnections,
  proxies: ProxyCatalog,
  rateLimitPolicy?: RateLimitPolicy,
  tenantRouting?: TenantRoutingContext,
): Record<string, unknown> {
  const state = loadState(paths);
  const resolution = resolveState(registry, state);
  const connectionsPayload = buildConnectionsPayload(registry, downstream, resolution.enabledServerNames);

  return {
    hub: {
      name: identity.name,
      version: identity.version,
    },
    paths: {
      registryPath: paths.registryPath,
      statePath: paths.statePath,
      codexConfigPath: paths.codexConfigPath,
      routingPath: paths.routingPath,
    },
    state: resolution.state,
    enabledServerNames: resolution.enabledServerNames,
    connectedServers: downstream.connected.map((server) => ({
      name: server.name,
      toolCount: server.tools.length,
    })),
    failedServers: downstream.failed,
    connectionSummary: {
      enabledServerNames: connectionsPayload.enabledServerNames,
      totalConfiguredServers: connectionsPayload.totalConfiguredServers,
      connected: connectionsPayload.connected,
      failed: connectionsPayload.failed,
      idle: connectionsPayload.idle,
    },
    connections: connectionsPayload.connections,
    proxyToolCount: proxies.toolDefinitions.length,
    proxyToolBreakdown: {
      direct: proxies.directRouteMetas.length,
      aliases: proxies.aliasPlans.length,
    },
    bundles: Object.keys(registry.bundles)
      .sort()
      .map((bundleName) => ({
        name: bundleName,
        enabled: resolution.state.enabledBundles.includes(bundleName),
        servers: registry.bundles[bundleName],
      })),
    routing: tenantRouting
      ? {
          tenantId: tenantRouting.tenantId,
          allowPendingOauthApprovals: tenantRouting.allowPendingOauthApprovals,
          aliasCount: proxies.aliasPlans.length,
        }
      : null,
    policy: buildPolicyStatusPayload(rateLimitPolicy ?? resolveRateLimitPolicy(process.env)),
    warnings: [...resolution.warnings, ...proxies.warnings],
    note:
      'State edits apply immediately to config writes. Routing and proxied tool inventory update on hub restart.',
  };
}

export function buildStatePayload(
  paths: RegistryPaths,
  registry: McpBundleRegistry,
): Record<string, unknown> {
  const state = loadState(paths);
  const resolution = resolveState(registry, state);
  return {
    state: resolution.state,
    enabledServerNames: resolution.enabledServerNames,
    warnings: resolution.warnings,
  };
}

export function buildConnectionsPayload(
  registry: McpBundleRegistry,
  downstream: DownstreamConnections,
  enabledServerNames: string[],
): Record<string, unknown> {
  const connectedByName = new Map(downstream.connected.map((server) => [server.name, server]));
  const failedByName = new Map(downstream.failed.map((server) => [server.name, server.error]));
  const enabledSet = new Set(enabledServerNames);

  const connections = Object.entries(registry.servers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, config]) => {
      const connected = connectedByName.get(name);
      const failedError = failedByName.get(name);
      const enabled = enabledSet.has(name);
      const status = connected ? 'connected' : failedError ? 'failed' : enabled ? 'disabled' : 'idle';

      return {
        name,
        enabled,
        transport: config.transport,
        target: config.transport === 'http' ? config.url : `${config.command} ${(config.args ?? []).join(' ')}`.trim(),
        status,
        toolCount: connected ? connected.tools.length : 0,
        error: failedError ?? null,
      };
    });

  return {
    enabledServerNames,
    totalConfiguredServers: connections.length,
    connected: downstream.connected.length,
    failed: downstream.failed.length,
    idle: connections.filter((connection) => connection.status === 'idle').length,
    connections,
  };
}

export function buildRegistryPayload(registry: McpBundleRegistry): Record<string, unknown> {
  const servers = Object.entries(registry.servers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, config]) => ({
      name,
      transport: config.transport,
      target: config.transport === 'http' ? config.url : `${config.command} ${(config.args ?? []).join(' ')}`.trim(),
      tags: config.tags ?? [],
      description: config.description ?? '',
    }));

  const bundles = Object.entries(registry.bundles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bundleServers]) => ({ name, servers: bundleServers }));

  return {
    servers,
    bundles,
    defaults: registry.defaults ?? {},
  };
}

export function buildRoutingPayload(
  routing: HubRoutingConfig,
  tenantRouting: TenantRoutingContext,
  proxies: ProxyCatalog,
): Record<string, unknown> {
  const aliasPlans = proxies.aliasPlans.map((plan) => ({
    aliasToolName: plan.aliasToolName,
    proxyToolName: plan.proxyToolName,
    description: plan.description,
    candidateCount: plan.candidates.length,
    candidates: plan.candidates.map((candidate) => ({
      serverName: candidate.serverName,
      downstreamToolName: candidate.downstreamToolName,
      provider: candidate.provider ?? null,
      oauthApproval: candidate.oauthApproval ?? null,
      directProxyToolName: candidate.proxyToolName ?? null,
    })),
    skippedCandidates: plan.skippedCandidates,
  }));

  return {
    tenant: {
      tenantId: tenantRouting.tenantId,
      allowPendingOauthApprovals: tenantRouting.allowPendingOauthApprovals,
      policy: tenantRouting.policy,
    },
    configuredAliases: Object.keys(routing.aliases ?? {}).sort(),
    activeAliases: aliasPlans,
    directProxyToolCount: proxies.directRouteMetas.length,
    totalProxyToolCount: proxies.toolDefinitions.length,
  };
}

export function buildPolicyStatusPayload(policy: RateLimitPolicy): Record<string, unknown> {
  return {
    rateLimit: {
      enabled: policy.enabled,
      scope: policy.scope,
      maxCallsPerWindow: policy.maxCalls,
      windowSeconds: policy.windowSeconds,
      exemptServers: [...policy.exemptServers].sort(),
      activeBucketCount: activeRateLimitBucketCount(),
    },
    note: policy.enabled
      ? 'Rate limiting applies only to proxied downstream tool calls.'
      : 'Rate limiting is disabled. Set HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW > 0 to enable.',
  };
}

export function searchProxyTools(
  proxies: ProxyCatalog,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const query = stringArg(args.query);
  const serverNameFilter = stringArg(args.serverName);
  const cursor = stringArg(args.cursor);
  const limit = numberArg(args.limit, 25, 1, 100);
  const startIndex = cursor ? numberArg(Number(cursor), 0, 0, Number.MAX_SAFE_INTEGER) : 0;

  const definitionByName = new Map(proxies.toolDefinitions.map((tool) => [tool.name, tool]));
  const all = Array.from(proxies.routes.values())
    .map((route) => {
      const definition = definitionByName.get(route.proxyToolName);
      const candidateServers = (route.candidates ?? []).map((candidate) => candidate.serverName);
      return {
        proxyToolName: route.proxyToolName,
        serverName: route.serverName,
        downstreamToolName: route.downstreamToolName,
        description: definition?.description ?? '',
        source: route.source,
        candidateServers,
      };
    })
    .sort((a, b) => a.proxyToolName.localeCompare(b.proxyToolName));

  const filtered = all.filter((item) => {
    if (serverNameFilter && item.serverName !== serverNameFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const q = query.toLowerCase();
    return (
      item.proxyToolName.toLowerCase().includes(q) ||
      item.serverName.toLowerCase().includes(q) ||
      item.downstreamToolName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.candidateServers.some((server) => server.toLowerCase().includes(q))
    );
  });

  const page = filtered.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + page.length < filtered.length
    ? String(startIndex + page.length)
    : null;

  return {
    query,
    serverName: serverNameFilter,
    total: filtered.length,
    limit,
    cursor: cursor ?? '0',
    nextCursor,
    tools: page,
  };
}
