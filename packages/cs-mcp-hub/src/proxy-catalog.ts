/**
 * Build the proxy tool catalog from connected downstream MCP servers.
 *
 * Extracted from `src/index.ts`. Pure construction (no IO beyond the
 * downstream client.callTool closure) — easy to unit test.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import type { ConnectedDownstream } from './downstream.js';
import {
  filterDirectRoutesByTenant,
  planAliasRoutes,
  type AliasRoutePlan,
  type DirectRouteWithTags,
  type DirectToolRouteMeta,
  type ResolvedAliasCandidate,
  type TenantRoutingContext,
} from './routing.js';
import type { HubRoutingConfig, McpBundleRegistry } from './types.js';
import { isRecord } from './util/json.js';

export type ProxyRoute = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  source: 'direct' | 'alias';
  candidates?: ResolvedAliasCandidate[];
  call: (args: Record<string, unknown>) => Promise<any>;
};

export type ProxyCatalog = {
  toolDefinitions: Tool[];
  directRouteMetas: DirectToolRouteMeta[];
  aliasPlans: AliasRoutePlan[];
  routes: Map<string, ProxyRoute>;
  warnings: string[];
};

export function buildProxyCatalog(
  connectedServers: ConnectedDownstream[],
  registry: McpBundleRegistry,
  routing: HubRoutingConfig,
  tenantRouting: TenantRoutingContext,
  reservedToolNames: Iterable<string> = [],
): ProxyCatalog {
  const toolDefinitions: Tool[] = [];
  const routes = new Map<string, ProxyRoute>();
  const directRouteMap = new Map<string, ProxyRoute>();
  const reservedProxyNames = new Set(reservedToolNames);
  const warnings: string[] = [];
  const directRoutesWithTags: DirectRouteWithTags[] = [];

  for (const server of connectedServers) {
    const serverTags = registry.servers[server.name]?.tags ?? [];
    for (const tool of server.tools) {
      const baseProxyName = buildProxyToolName(server.name, tool.name);
      const proxyName = reserveProxyName(baseProxyName, directRouteMap, warnings);
      const inputSchema = normalizeToolInputSchema(tool.inputSchema);
      const description = `[${server.name}] ${tool.description ?? ''}`.trim();
      const routeMeta: DirectToolRouteMeta = {
        proxyToolName: proxyName,
        serverName: server.name,
        downstreamToolName: tool.name,
        description,
        inputSchema,
      };

      const route: ProxyRoute = {
        proxyToolName: proxyName,
        serverName: server.name,
        downstreamToolName: tool.name,
        source: 'direct',
        call: (args) => server.client.callTool({ name: tool.name, arguments: args }),
      };

      directRouteMap.set(proxyName, route);
      directRoutesWithTags.push({
        route: routeMeta,
        serverTags,
      });
    }
  }

  const directRouteMetas = filterDirectRoutesByTenant(directRoutesWithTags, tenantRouting.policy);
  const allowedDirectProxyNames = new Set(directRouteMetas.map((route) => route.proxyToolName));

  for (const directRouteMeta of directRouteMetas) {
    const directRoute = directRouteMap.get(directRouteMeta.proxyToolName);
    if (!directRoute) {
      warnings.push(`Direct route metadata references missing route "${directRouteMeta.proxyToolName}"`);
      continue;
    }

    routes.set(directRouteMeta.proxyToolName, directRoute);
    toolDefinitions.push({
      name: directRouteMeta.proxyToolName,
      description: directRouteMeta.description,
      inputSchema: directRouteMeta.inputSchema,
    });
  }

  const aliasPlanResult = planAliasRoutes(routing, directRouteMetas, tenantRouting);
  warnings.push(...aliasPlanResult.warnings);

  for (const aliasPlan of aliasPlanResult.plans) {
    const normalizedAliasName = sanitizeName(aliasPlan.aliasToolName);
    if (normalizedAliasName !== aliasPlan.aliasToolName) {
      warnings.push(`Alias "${aliasPlan.aliasToolName}" normalized to "${normalizedAliasName}"`);
    }

    const aliasProxyName = reserveProxyName(normalizedAliasName, routes, warnings, reservedProxyNames);
    toolDefinitions.push({
      name: aliasProxyName,
      description: `[alias] ${aliasPlan.description}`,
      inputSchema: aliasPlan.inputSchema,
    });

    routes.set(aliasProxyName, {
      proxyToolName: aliasProxyName,
      serverName: 'hub-routing',
      downstreamToolName: aliasPlan.aliasToolName,
      source: 'alias',
      candidates: aliasPlan.candidates,
      call: async (args) => {
        const failures: string[] = [];
        for (const candidate of aliasPlan.candidates) {
          const candidateProxyName = candidate.proxyToolName;
          if (!candidateProxyName || !allowedDirectProxyNames.has(candidateProxyName)) {
            failures.push(`[${candidate.serverName}/${candidate.downstreamToolName}] unavailable`);
            continue;
          }

          const target = directRouteMap.get(candidateProxyName);
          if (!target) {
            failures.push(`[${candidate.serverName}/${candidate.downstreamToolName}] unresolved`);
            continue;
          }

          try {
            return await target.call(args);
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            failures.push(`[${candidate.serverName}/${candidate.downstreamToolName}] ${message}`);
          }
        }

        throw new Error(
          `Alias "${aliasPlan.aliasToolName}" exhausted all candidates. ${failures.join(' | ')}`,
        );
      },
    });
  }

  return { toolDefinitions, directRouteMetas, aliasPlans: aliasPlanResult.plans, routes, warnings };
}

export function buildProxyToolName(serverName: string, downstreamToolName: string): string {
  return `${sanitizeName(serverName)}__${sanitizeName(downstreamToolName)}`;
}

export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function normalizeToolInputSchema(inputSchema: unknown): Tool['inputSchema'] {
  if (isRecord(inputSchema) && inputSchema.type === 'object') {
    return inputSchema as Tool['inputSchema'];
  }
  return { type: 'object', properties: {} };
}

export function reserveProxyName(
  baseName: string,
  routes: Map<string, ProxyRoute>,
  warnings: string[],
  reservedNames: ReadonlySet<string> = new Set(),
): string {
  if (!routes.has(baseName) && !reservedNames.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (routes.has(candidate) || reservedNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }
  warnings.push(`Proxy tool name collision for "${baseName}", renamed to "${candidate}"`);
  return candidate;
}
