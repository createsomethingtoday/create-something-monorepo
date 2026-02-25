/**
 * DM Composio proxy tools.
 *
 * Registers DM-namespaced tools that proxy through Composio with server-side
 * allow-list enforcement per entity.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  ComposioClient,
  type ComposioToolDef,
  type ComposioToolkitSummary,
} from '@create-something/composio-bridge';
import type { DmComposioConfig } from '../config.js';

export interface RegisteredDmComposioTool {
  name: string;
  description: string;
  toolkit: string;
  composioToolSlug: string;
}

export interface ComposioProxyRegistrationResult {
  proxiedTools: RegisteredDmComposioTool[];
  registeredToolkits: string[];
  warnings: string[];
}

export interface RegisterComposioProxyToolsDeps {
  composioClient: ComposioClient;
  composioConfig: DmComposioConfig;
  authConfigMapRaw?: string;
}

export interface DiscoverComposioProxyToolsDeps {
  composioClient: ComposioClient;
  composioConfig: DmComposioConfig;
}

interface ProxyRoute {
  name: string;
  toolkit: string;
  composioToolSlug: string;
  description: string;
  inputSchema: z.ZodTypeAny;
}

interface ProxyDiscoveryResult extends ComposioProxyRegistrationResult {
  routes: ProxyRoute[];
}

const MANAGEMENT_TOOL_NAMES = new Set([
  'dm_composio_toolkit_inventory',
  'dm_composio_connection_status',
  'dm_composio_get_connect_link',
]);

const CONTROL_ARG_KEYS = new Set(['entity_id', 'account_id', '__dm_entity_id']);

export async function registerComposioProxyTools(
  server: McpServer,
  deps: RegisterComposioProxyToolsDeps
): Promise<ComposioProxyRegistrationResult> {
  const authConfigMap = parseAuthConfigMap(deps.authConfigMapRaw);
  const discovery = await discoverComposioRoutes(deps);
  const { routes, proxiedTools, registeredToolkits, warnings } = discovery;

  registerManagementTools(server, deps, authConfigMap, registeredToolkits, proxiedTools);

  for (const route of routes) {
    server.registerTool(
      route.name,
      {
        description: route.description,
        inputSchema: route.inputSchema,
      },
      async (params, extra) => {
        const entityId = resolveEntityId(extra, params, deps.composioConfig.defaultEntityId);
        const allowedToolkits = resolveAllowedToolkitsForEntity(entityId, deps.composioConfig);

        if (
          deps.composioConfig.proxyMode === 'allowlist' &&
          !allowedToolkits.includes(route.toolkit)
        ) {
          return toErrorResult(
            `Toolkit "${route.toolkit}" is not allowed for entity "${entityId}". Allowed: ${
              allowedToolkits.length > 0 ? allowedToolkits.join(', ') : '(none)'
            }.`
          );
        }

        const forwardedArgs = stripControlArgs(params);

        try {
          const result = await deps.composioClient.executeTool(
            route.composioToolSlug,
            forwardedArgs,
            entityId
          );
          return toJsonResult({
            toolkit: route.toolkit,
            tool: route.name,
            composioToolSlug: route.composioToolSlug,
            entityId,
            result,
          });
        } catch (error) {
          return toErrorResult(
            error instanceof Error
              ? error.message
              : `Composio tool execution failed: ${String(error)}`
          );
        }
      }
    );
  }

  return {
    proxiedTools,
    registeredToolkits,
    warnings,
  };
}

export async function discoverComposioProxyTools(
  deps: DiscoverComposioProxyToolsDeps
): Promise<ComposioProxyRegistrationResult> {
  const discovery = await discoverComposioRoutes(deps);
  const { routes: _routes, ...publicResult } = discovery;
  return publicResult;
}

async function discoverComposioRoutes(
  deps: DiscoverComposioProxyToolsDeps
): Promise<ProxyDiscoveryResult> {
  const warnings: string[] = [];
  const discovery = await resolveToolkitDiscovery(deps.composioClient, deps.composioConfig);

  warnings.push(...discovery.warnings);

  const registeredToolkits = discovery.toolkits;
  const proxiedTools: RegisteredDmComposioTool[] = [];
  const routes: ProxyRoute[] = [];
  const usedNames = new Set<string>(MANAGEMENT_TOOL_NAMES);

  for (const toolkit of registeredToolkits) {
    try {
      const defs = await deps.composioClient.getTools([toolkit], {
        important: false,
        limit: 10000,
      });

      for (const def of defs) {
        const route = buildRoute(def, toolkit, deps.composioConfig.toolNamePrefix, usedNames);
        routes.push(route);
        proxiedTools.push({
          name: route.name,
          description: route.description,
          toolkit,
          composioToolSlug: def.slug,
        });
      }
    } catch (error) {
      warnings.push(
        `Failed to load Composio tools for toolkit "${toolkit}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    proxiedTools,
    registeredToolkits,
    warnings,
    routes,
  };
}

async function resolveToolkitDiscovery(
  composioClient: ComposioClient,
  composioConfig: DmComposioConfig
): Promise<{ toolkits: string[]; warnings: string[] }> {
  const warnings: string[] = [];

  if (composioConfig.proxyMode === 'all') {
    try {
      const inventory = await composioClient.listToolkits({
        managedBy: 'all',
        sortBy: 'alphabetically',
        limit: 1000,
      });

      return {
        toolkits: normalizeToolkitList(
          inventory.map((item: ComposioToolkitSummary) => item.slug)
        ),
        warnings,
      };
    } catch (error) {
      warnings.push(
        `COMPOSIO_PROXY_MODE=all failed to load toolkit inventory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const union = new Set<string>(composioConfig.allowedToolkits);
  for (const toolkits of Object.values(composioConfig.allowedToolkitsByEntity)) {
    for (const toolkit of toolkits) union.add(toolkit);
  }

  return {
    toolkits: [...union].sort(),
    warnings,
  };
}

function registerManagementTools(
  server: McpServer,
  deps: RegisterComposioProxyToolsDeps,
  authConfigMap: Record<string, string>,
  registeredToolkits: string[],
  proxiedTools: RegisteredDmComposioTool[]
): void {
  const entitySchema = z
    .object({
      entity_id: z.string().optional(),
      __dm_entity_id: z.string().optional(),
      account_id: z.string().optional(),
    })
    .passthrough();

  server.registerTool(
    'dm_composio_toolkit_inventory',
    {
      description: 'List DM Composio proxy toolkits and tool inventory for the current entity.',
      inputSchema: entitySchema,
    },
    async (params, extra) => {
      const entityId = resolveEntityId(extra, params, deps.composioConfig.defaultEntityId);
      const allowedToolkits =
        deps.composioConfig.proxyMode === 'all'
          ? [...registeredToolkits]
          : resolveAllowedToolkitsForEntity(entityId, deps.composioConfig);

      return toJsonResult({
        entityId,
        proxyMode: deps.composioConfig.proxyMode,
        toolNamePrefix: deps.composioConfig.toolNamePrefix,
        registeredToolkits,
        allowedToolkits,
        proxiedToolCount: proxiedTools.length,
      });
    }
  );

  server.registerTool(
    'dm_composio_connection_status',
    {
      description:
        'Check Composio connection status for one toolkit or all allowed toolkits for the current entity.',
      inputSchema: entitySchema.extend({
        toolkit: z.string().optional(),
      }),
    },
    async (params, extra) => {
      const entityId = resolveEntityId(extra, params, deps.composioConfig.defaultEntityId);
      const requestedToolkit =
        typeof params.toolkit === 'string' ? normalizeToolkit(params.toolkit) : undefined;
      const allowedToolkits =
        deps.composioConfig.proxyMode === 'all'
          ? [...registeredToolkits]
          : resolveAllowedToolkitsForEntity(entityId, deps.composioConfig);
      const scopeToolkits =
        requestedToolkit !== undefined ? [requestedToolkit] : [...allowedToolkits];

      if (requestedToolkit && !registeredToolkits.includes(requestedToolkit)) {
        return toErrorResult(
          `Toolkit "${requestedToolkit}" is not registered on this DM server. Registered toolkits: ${
            registeredToolkits.length > 0 ? registeredToolkits.join(', ') : '(none)'
          }.`
        );
      }

      if (deps.composioConfig.proxyMode === 'allowlist') {
        const blocked = scopeToolkits.filter((toolkit) => !allowedToolkits.includes(toolkit));
        if (blocked.length > 0) {
          return toErrorResult(
            `Toolkit(s) not allowed for entity "${entityId}": ${blocked.join(', ')}. Allowed: ${
              allowedToolkits.length > 0 ? allowedToolkits.join(', ') : '(none)'
            }.`
          );
        }
      }

      const statuses = await Promise.all(
        scopeToolkits.map(async (toolkit) => ({
          toolkit,
          connected: await deps.composioClient.hasActiveConnection(entityId, toolkit),
        }))
      );

      return toJsonResult({
        entityId,
        statuses,
      });
    }
  );

  server.registerTool(
    'dm_composio_get_connect_link',
    {
      description:
        'Get a one-time Composio OAuth link for a toolkit for the current entity (requires COMPOSIO_AUTH_CONFIG_MAP).',
      inputSchema: entitySchema.extend({
        toolkit: z.string(),
      }),
    },
    async (params, extra) => {
      const entityId = resolveEntityId(extra, params, deps.composioConfig.defaultEntityId);
      const toolkit = normalizeToolkit(params.toolkit);
      const allowedToolkits =
        deps.composioConfig.proxyMode === 'all'
          ? [...registeredToolkits]
          : resolveAllowedToolkitsForEntity(entityId, deps.composioConfig);

      if (!registeredToolkits.includes(toolkit)) {
        return toErrorResult(
          `Toolkit "${toolkit}" is not registered on this DM server. Registered toolkits: ${
            registeredToolkits.length > 0 ? registeredToolkits.join(', ') : '(none)'
          }.`
        );
      }

      if (deps.composioConfig.proxyMode === 'allowlist' && !allowedToolkits.includes(toolkit)) {
        return toErrorResult(
          `Toolkit "${toolkit}" is not allowed for entity "${entityId}". Allowed: ${
            allowedToolkits.length > 0 ? allowedToolkits.join(', ') : '(none)'
          }.`
        );
      }

      const authConfigId = authConfigMap[toolkit];
      if (!authConfigId) {
        return toErrorResult(
          `No auth config found for toolkit "${toolkit}". Set COMPOSIO_AUTH_CONFIG_MAP with an entry for "${toolkit}".`
        );
      }

      try {
        const connectionRequest = await deps.composioClient
          .getSDK()
          .connectedAccounts.link(entityId, authConfigId);
        const state = asRecord(connectionRequest);

        const redirectUrl = stringOrNull(state?.redirectUrl);
        const requestId = stringOrNull(state?.id);
        const rawStatus =
          stringOrNull(state?.status) ?? stringOrNull(state?.connectionStatus);
        const status = rawStatus ? rawStatus.toUpperCase() : null;

        return toJsonResult({
          entityId,
          toolkit,
          authConfigId,
          requestId,
          status,
          link: redirectUrl,
          message:
            redirectUrl && redirectUrl.length > 0
              ? 'Present this URL to the user. After auth, call dm_composio_connection_status again.'
              : 'No redirect URL returned by Composio. Retry dm_composio_connection_status.',
        });
      } catch (error) {
        return toErrorResult(
          error instanceof Error
            ? error.message
            : `Failed to create connect link: ${String(error)}`
        );
      }
    }
  );
}

function buildRoute(
  tool: ComposioToolDef,
  toolkit: string,
  toolNamePrefix: string,
  usedNames: Set<string>
): ProxyRoute {
  const baseName = `${normalizeToolNamePrefix(toolNamePrefix)}__${sanitizeSegment(
    toolkit
  )}__${normalizeToolName(tool.slug)}`;
  const name = reserveToolName(baseName, usedNames);

  return {
    name,
    toolkit,
    composioToolSlug: tool.slug,
    description: `${tool.description || tool.name || tool.slug} (Composio toolkit: ${toolkit})`,
    inputSchema: toInputSchema(tool),
  };
}

function toInputSchema(tool: ComposioToolDef): z.ZodObject<any> {
  const required = new Set((tool.parameters.required ?? []).map((entry) => String(entry)));
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const key of Object.keys(tool.parameters.properties ?? {})) {
    shape[key] = required.has(key) ? z.any() : z.any().optional();
  }

  // Control args are accepted and stripped before forwarding.
  shape.entity_id = z.string().optional();
  shape.account_id = z.string().optional();
  shape.__dm_entity_id = z.string().optional();

  return z.object(shape).passthrough();
}

function normalizeToolkitList(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeToolkit).filter(Boolean))).sort();
}

function normalizeToolkit(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeToolNamePrefix(prefix: string): string {
  const sanitized = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  return sanitized || 'dm_composio';
}

function sanitizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function normalizeToolName(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function reserveToolName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }

  usedNames.add(candidate);
  return candidate;
}

function resolveAllowedToolkitsForEntity(
  entityId: string,
  config: DmComposioConfig
): string[] {
  if (config.proxyMode === 'all') {
    return [];
  }

  const normalizedEntity = entityId.trim().toLowerCase();
  const fromEntity = config.allowedToolkitsByEntity[normalizedEntity];
  if (fromEntity && fromEntity.length > 0) return fromEntity;

  const wildcard = config.allowedToolkitsByEntity['*'];
  if (wildcard && wildcard.length > 0) return wildcard;

  return config.allowedToolkits;
}

function resolveEntityId(
  extra: unknown,
  params: Record<string, unknown>,
  fallbackEntityId: string
): string {
  const fromParams = pickEntityFromParams(params);
  if (fromParams) return fromParams;

  const requestInfo = asRecord(extra)?.requestInfo;
  const fromHeaders =
    getHeaderValue(requestInfo, 'x-mcp-account-id') ??
    getHeaderValue(requestInfo, 'x-account-id');
  if (fromHeaders && fromHeaders.trim()) {
    return fromHeaders.trim();
  }

  return fallbackEntityId;
}

function pickEntityFromParams(params: Record<string, unknown>): string | null {
  for (const key of CONTROL_ARG_KEYS) {
    const value = params[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function stripControlArgs(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (CONTROL_ARG_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function getHeaderValue(requestInfo: unknown, name: string): string | null {
  const infoRecord = asRecord(requestInfo);
  const headers = infoRecord?.headers;
  if (!headers) return null;

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      if (String(entry[0]).toLowerCase() === name.toLowerCase()) {
        return String(entry[1]);
      }
    }
    return null;
  }

  const record = asRecord(headers);
  if (!record) return null;

  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() !== name.toLowerCase()) continue;
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
  }

  return null;
}

function parseAuthConfigMap(raw: string | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const map: Record<string, string> = {};
    for (const [toolkit, authConfigId] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof authConfigId !== 'string') continue;
      const normalizedToolkit = normalizeToolkit(toolkit);
      const normalizedAuthConfigId = authConfigId.trim();
      if (!normalizedToolkit || !normalizedAuthConfigId) continue;
      map[normalizedToolkit] = normalizedAuthConfigId;
    }
    return map;
  } catch {
    return {};
  }
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toErrorResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}
