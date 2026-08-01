import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  HubRoutingConfig,
  OauthApprovalStatus,
  RoutedAliasConfig,
  TenantRoutingPolicy,
} from './types.js';

export type DirectToolRouteMeta = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  description: string;
  inputSchema: Tool['inputSchema'];
};

export type DirectRouteWithTags = {
  route: DirectToolRouteMeta;
  serverTags: string[];
};

export type ResolvedAliasCandidate = {
  serverName: string;
  downstreamToolName: string;
  provider?: string;
  oauthApproval?: OauthApprovalStatus;
  proxyToolName?: string;
  reason?: string;
};

export type AliasRoutePlan = {
  aliasToolName: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  candidates: ResolvedAliasCandidate[];
  skippedCandidates: ResolvedAliasCandidate[];
};

export type TenantRoutingContext = {
  tenantId: string;
  allowPendingOauthApprovals: boolean;
  policy: TenantRoutingPolicy;
};

const EMPTY_POLICY: TenantRoutingPolicy = {};

export function resolveTenantRoutingContext(
  routing: HubRoutingConfig,
  explicitTenantId: string | undefined,
  allowPendingFromEnv = false,
): TenantRoutingContext {
  const tenantId = (
    explicitTenantId ??
    routing.defaults?.tenant ??
    'default'
  ).trim();
  const configuredTenants = routing.tenants ?? {};
  const policy = configuredTenants[tenantId];

  if (Object.keys(configuredTenants).length > 0 && !policy) {
    throw new Error(`Unknown tenant "${tenantId}" in routing config`);
  }

  return {
    tenantId,
    allowPendingOauthApprovals: allowPendingFromEnv || routing.defaults?.allowPendingOauthApprovals === true,
    policy: policy ?? EMPTY_POLICY,
  };
}

export function filterDirectRoutesByTenant(
  routes: DirectRouteWithTags[],
  policy: TenantRoutingPolicy,
): DirectToolRouteMeta[] {
  return routes
    .filter(({ route, serverTags }) => isServerAllowedForTenant(policy, route.serverName, serverTags))
    .filter(({ route }) => isToolAllowedForTenant(policy, route.proxyToolName))
    .map(({ route }) => route);
}

export function planAliasRoutes(
  routing: HubRoutingConfig,
  directRoutes: DirectToolRouteMeta[],
  tenant: TenantRoutingContext,
): { plans: AliasRoutePlan[]; warnings: string[] } {
  const aliases = routing.aliases ?? {};
  const warnings: string[] = [];
  const plans: AliasRoutePlan[] = [];
  const routeByServerTool = new Map<string, DirectToolRouteMeta>();

  for (const route of directRoutes) {
    routeByServerTool.set(serverToolKey(route.serverName, route.downstreamToolName), route);
  }

  for (const [aliasToolName, aliasConfig] of Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b))) {
    if (!isAliasVisibleToTenant(aliasConfig, tenant.tenantId)) {
      continue;
    }
    if (!isToolAllowedForTenant(tenant.policy, aliasToolName)) {
      continue;
    }

    const candidates: ResolvedAliasCandidate[] = [];
    const skippedCandidates: ResolvedAliasCandidate[] = [];

    for (const target of aliasConfig.candidates ?? []) {
      const base: ResolvedAliasCandidate = {
        serverName: target.server,
        downstreamToolName: target.tool,
        provider: target.provider,
        oauthApproval: target.oauthApproval,
      };

      if (target.oauthApproval === 'blocked') {
        skippedCandidates.push({ ...base, reason: 'oauth_blocked' });
        continue;
      }
      if (target.oauthApproval === 'pending' && !tenant.allowPendingOauthApprovals) {
        skippedCandidates.push({ ...base, reason: 'oauth_pending' });
        continue;
      }

      const route = routeByServerTool.get(serverToolKey(target.server, target.tool));
      if (!route) {
        skippedCandidates.push({ ...base, reason: 'route_not_available' });
        continue;
      }

      candidates.push({
        ...base,
        proxyToolName: route.proxyToolName,
      });
    }

    if (candidates.length === 0) {
      warnings.push(`Alias "${aliasToolName}" has no available candidates for tenant "${tenant.tenantId}"`);
      continue;
    }

    const primary = routeByServerTool.get(serverToolKey(candidates[0].serverName, candidates[0].downstreamToolName));
    plans.push({
      aliasToolName,
      description: aliasConfig.description ?? `Routed alias for ${aliasToolName}`,
      inputSchema: toInputSchema(aliasConfig.inputSchema ?? primary?.inputSchema),
      candidates,
      skippedCandidates,
    });
  }

  return { plans, warnings };
}

function isServerAllowedForTenant(policy: TenantRoutingPolicy, serverName: string, serverTags: string[]): boolean {
  const allowServers = asSet(policy.allowServers);
  if (allowServers.size > 0 && !allowServers.has(serverName)) {
    return false;
  }

  const denyServers = asSet(policy.denyServers);
  if (denyServers.has(serverName)) {
    return false;
  }

  const tagSet = new Set(serverTags);
  const allowTags = asSet(policy.allowTags);
  if (allowTags.size > 0) {
    const hasAllowedTag = [...allowTags].some((tag) => tagSet.has(tag));
    if (!hasAllowedTag) {
      return false;
    }
  }

  const denyTags = asSet(policy.denyTags);
  for (const tag of denyTags) {
    if (tagSet.has(tag)) {
      return false;
    }
  }

  return true;
}

function isToolAllowedForTenant(policy: TenantRoutingPolicy, toolName: string): boolean {
  const allowPrefixes = normalizedPrefixes(policy.allowToolPrefixes);
  if (allowPrefixes.length > 0 && !allowPrefixes.some((prefix) => toolName.startsWith(prefix))) {
    return false;
  }

  const denyPrefixes = normalizedPrefixes(policy.denyToolPrefixes);
  if (denyPrefixes.some((prefix) => toolName.startsWith(prefix))) {
    return false;
  }

  return true;
}

function isAliasVisibleToTenant(alias: RoutedAliasConfig, tenantId: string): boolean {
  const allowlist = asSet(alias.tenantAllowlist);
  const denylist = asSet(alias.tenantDenylist);
  if (denylist.has(tenantId)) {
    return false;
  }
  if (allowlist.size > 0 && !allowlist.has(tenantId)) {
    return false;
  }
  return true;
}

function normalizedPrefixes(values: string[] | undefined): string[] {
  return [...asSet(values)].sort((a, b) => b.length - a.length);
}

function asSet(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.trim()).filter(Boolean));
}

function serverToolKey(serverName: string, toolName: string): string {
  return `${serverName}::${toolName}`;
}

function toInputSchema(inputSchema: unknown): Tool['inputSchema'] {
  if (
    typeof inputSchema === 'object' &&
    inputSchema !== null &&
    !Array.isArray(inputSchema) &&
    (inputSchema as Record<string, unknown>).type === 'object'
  ) {
    return inputSchema as Tool['inputSchema'];
  }

  return { type: 'object', properties: {} };
}
