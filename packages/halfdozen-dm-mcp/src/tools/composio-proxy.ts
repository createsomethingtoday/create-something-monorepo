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

interface ConnectLinkResolution {
  authConfigId: string | null;
  requestId: string | null;
  status: string | null;
  link: string | null;
  error: string | null;
  existingConnectedAccountId?: string | null;
  existingConnections?: Array<{
    connectionId: string;
    status: string;
    rawStatus: string | null;
    createdAt: string | null;
  }>;
}

const MANAGEMENT_TOOL_NAMES = new Set([
  'dm_composio_toolkit_inventory',
  'dm_composio_connection_status',
  'dm_composio_get_connect_link',
  'dm_gmail_list_recent_threads',
]);

const GMAIL_TOOLKIT = 'gmail';
const GMAIL_RECENT_THREADS_TOOL = 'dm_gmail_list_recent_threads';
const GMAIL_FETCH_EMAILS_TOOL = 'gmail_fetch_emails';
const GMAIL_FETCH_THREAD_TOOL = 'gmail_fetch_message_by_thread_id';

const ENTITY_ARG_KEYS = new Set([
  'entity_id',
  'account_id',
  '__dm_entity_id',
]);

const CONNECTION_ARG_KEYS = new Set([
  'connected_account_id',
  'connectedAccountId',
]);

const CONTROL_ARG_KEYS = new Set([
  ...ENTITY_ARG_KEYS,
  ...CONNECTION_ARG_KEYS,
]);

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

        try {
          const connectedAccountId = pickConnectedAccountId(params);
          if (connectedAccountId) {
            await assertConnectedAccountOwnership(deps.composioClient, entityId, route.toolkit, connectedAccountId);
          } else {
            const activeConnections = await deps.composioClient.getConnectedAccountsForToolkit(entityId, route.toolkit);
            const activeCount = activeConnections.filter((account) => account.status === 'active').length;
            if (activeCount > 1) {
              throw new Error(
                `Toolkit "${route.toolkit}" has ${activeCount} active connections for entity "${entityId}". Pass connected_account_id to disambiguate execution.`
              );
            }
          }
          const forwardedArgs = stripControlArgs(params);

          const result = await deps.composioClient.executeTool(
            route.composioToolSlug,
            forwardedArgs,
            entityId,
            connectedAccountId ?? undefined
          );
          return toJsonResult({
            toolkit: route.toolkit,
            tool: route.name,
            composioToolSlug: route.composioToolSlug,
            entityId,
            result,
          });
        } catch (error) {
          return handleComposioExecutionFailure(
            deps,
            authConfigMap,
            route,
            entityId,
            error
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
        scopeToolkits.map(async (toolkit) => {
          const connections = await deps.composioClient.getConnectedAccountsForToolkit(entityId, toolkit);
          const activeConnections = connections.filter((account) => account.status === 'active');
          const pendingConnections = connections.filter((account) => account.status === 'pending');
          return {
            toolkit,
            connected: activeConnections.length > 0,
            connection_count: connections.length,
            active_connection_count: activeConnections.length,
            pending_connection_count: pendingConnections.length,
            ambiguous: activeConnections.length > 1,
            recommended_connected_account_id:
              activeConnections[0]?.connectionId ?? pendingConnections[0]?.connectionId ?? null,
            connections: connections.map((account) => ({
              connectionId: account.connectionId,
              status: account.status,
              rawStatus: account.rawStatus ?? null,
              createdAt: account.createdAt ?? null,
            })),
          };
        })
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
        force_new: z.boolean().optional(),
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
          `No auth config found for toolkit "${toolkit}". Set COMPOSIO_AUTH_CONFIG_MAP with an entry for "${toolkit}".`,
          {
            error_code: 'COMPOSIO_AUTH_CONFIG_MISSING',
            toolkit,
            entity_id: entityId,
          }
        );
      }

      const link = await resolveConnectLink(
        deps.composioClient,
        authConfigMap,
        entityId,
        toolkit,
        params.force_new === true
      );

      if (link.error) {
        return toJsonResult({
          entityId,
          toolkit,
          authConfigId,
          requestId: link.requestId,
          status: link.status,
          link: link.link,
          existing_connected_account_id: link.existingConnectedAccountId ?? null,
          existing_connections: link.existingConnections ?? [],
          error: link.error,
          message: buildConnectLinkMessage(entityId, toolkit, link),
        });
      }

      return toJsonResult({
        entityId,
        toolkit,
        authConfigId,
        requestId: link.requestId,
        status: link.status,
        link: link.link,
        existing_connected_account_id: link.existingConnectedAccountId ?? null,
        existing_connections: link.existingConnections ?? [],
        message: buildConnectLinkMessage(entityId, toolkit, link),
      });
    }
  );

  if (registeredToolkits.includes(GMAIL_TOOLKIT)) {
    server.registerTool(
      GMAIL_RECENT_THREADS_TOOL,
      {
        description:
          'List recent Gmail threads sorted by latest message timestamp for the current entity.',
        inputSchema: entitySchema.extend({
          user_id: z.string().optional(),
          query: z.string().optional(),
          label_ids: z.array(z.string()).optional(),
          max_results: z.number().int().min(1).max(50).optional(),
          include_spam_trash: z.boolean().optional(),
          connected_account_id: z.string().optional(),
          connectedAccountId: z.string().optional(),
        }),
      },
      async (params, extra) => {
        const entityId = resolveEntityId(extra, params, deps.composioConfig.defaultEntityId);
        const toolkit = GMAIL_TOOLKIT;
        const allowedToolkits =
          deps.composioConfig.proxyMode === 'all'
            ? [...registeredToolkits]
            : resolveAllowedToolkitsForEntity(entityId, deps.composioConfig);

        if (deps.composioConfig.proxyMode === 'allowlist' && !allowedToolkits.includes(toolkit)) {
          return toErrorResult(
            `Toolkit "${toolkit}" is not allowed for entity "${entityId}". Allowed: ${
              allowedToolkits.length > 0 ? allowedToolkits.join(', ') : '(none)'
            }.`
          );
        }

        const connectedAccountId = pickConnectedAccountId(params);
        const userId = stringOrNull(params.user_id) ?? 'me';
        const query = stringOrNull(params.query);
        const labelIds = normalizeStringList(params.label_ids);
        const includeSpamTrash = params.include_spam_trash === true;
        const requestedMaxResults = clampInteger(params.max_results, 10, 1, 50);
        const scanWindow = Math.min(Math.max(requestedMaxResults * 3, requestedMaxResults), 100);
        const route: ProxyRoute = {
          name: GMAIL_RECENT_THREADS_TOOL,
          toolkit,
          composioToolSlug: GMAIL_FETCH_EMAILS_TOOL,
          description: 'List recent Gmail threads sorted by latest message timestamp.',
          inputSchema: z.object({}).passthrough(),
        };

        try {
          await validateConnectedAccountSelection(
            deps.composioClient,
            entityId,
            toolkit,
            connectedAccountId
          );

          const listResult = await deps.composioClient.executeTool(
            GMAIL_FETCH_EMAILS_TOOL,
            {
              user_id: userId,
              verbose: false,
              ids_only: true,
              include_payload: false,
              include_spam_trash: includeSpamTrash,
              max_results: scanWindow,
              ...(labelIds.length > 0 ? { label_ids: labelIds } : { label_ids: ['INBOX'] }),
              ...(query ? { query } : {}),
            },
            entityId,
            connectedAccountId ?? undefined
          );

          const candidateThreadIds = extractGmailThreadIds(listResult);
          const failures: Array<{ thread_id: string; error: string }> = [];
          const settled = await Promise.allSettled(
            candidateThreadIds.map(async (threadId) => {
              const threadResult = await deps.composioClient.executeTool(
                GMAIL_FETCH_THREAD_TOOL,
                {
                  user_id: userId,
                  thread_id: threadId,
                },
                entityId,
                connectedAccountId ?? undefined
              );
              return buildGmailRecentThreadSummary(threadId, threadResult);
            })
          );

          const threads = settled
            .flatMap((result, index) => {
              if (result.status === 'fulfilled') {
                return result.value ? [result.value] : [];
              }
              failures.push({
                thread_id: candidateThreadIds[index] ?? '(unknown)',
                error: describeError(result.reason),
              });
              return [];
            })
            .sort(compareGmailThreadSummariesNewestFirst)
            .slice(0, requestedMaxResults);

          return toJsonResult({
            entityId,
            toolkit,
            user_id: userId,
            query,
            label_ids: labelIds.length > 0 ? labelIds : ['INBOX'],
            include_spam_trash: includeSpamTrash,
            requested_max_results: requestedMaxResults,
            scan_window: scanWindow,
            candidate_thread_count: candidateThreadIds.length,
            returned_thread_count: threads.length,
            failed_thread_count: failures.length,
            ...(failures.length > 0 ? { failed_threads: failures } : {}),
            threads,
          });
        } catch (error) {
          return handleComposioExecutionFailure(
            deps,
            authConfigMap,
            route,
            entityId,
            error
          );
        }
      }
    );
  }
}

async function handleComposioExecutionFailure(
  deps: RegisterComposioProxyToolsDeps,
  authConfigMap: Record<string, string>,
  route: ProxyRoute,
  entityId: string,
  error: unknown
) {
  const rawError = describeError(error);
  let connectionState: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  let connectionCheckError: string | null = null;

  try {
    const connected = await deps.composioClient.hasActiveConnection(entityId, route.toolkit);
    connectionState = connected ? 'connected' : 'disconnected';
  } catch (connectionError) {
    connectionCheckError = describeError(connectionError);
  }

  if (connectionState === 'disconnected') {
    const connectLink = await resolveConnectLink(
      deps.composioClient,
      authConfigMap,
      entityId,
      route.toolkit
    );

    const message =
      connectLink.link && connectLink.link.length > 0
        ? `No active "${route.toolkit}" connection for entity "${entityId}". Reconnect via dm_composio_get_connect_link (toolkit="${route.toolkit}") or use this URL: ${connectLink.link}`
        : `No active "${route.toolkit}" connection for entity "${entityId}". Reconnect via dm_composio_get_connect_link (toolkit="${route.toolkit}") and retry.`;

    return toErrorResult(message, {
      error_code: 'COMPOSIO_TOOLKIT_DISCONNECTED',
      toolkit: route.toolkit,
      entity_id: entityId,
      tool: route.name,
      composio_tool_slug: route.composioToolSlug,
      connection_state: connectionState,
      next_step: 'reconnect_toolkit_and_retry',
      connection_check_error: connectionCheckError,
      upstream_error: rawError,
      connect_link: connectLink.link,
      connect_link_status: connectLink.status,
      connect_link_request_id: connectLink.requestId,
      connect_link_error: connectLink.error,
    });
  }

  const baseMessage = `Failed to execute tool ${route.composioToolSlug}: ${rawError}`;
  const guidance =
    connectionState === 'connected'
      ? 'Connection is active; verify input arguments, provider permissions/scopes, and API limits.'
      : `Run dm_composio_connection_status for toolkit "${route.toolkit}" and reconnect if needed.`;

  return toErrorResult(`${baseMessage}. ${guidance}`, {
    error_code: 'COMPOSIO_TOOL_EXECUTION_FAILED',
    toolkit: route.toolkit,
    entity_id: entityId,
    tool: route.name,
    composio_tool_slug: route.composioToolSlug,
    connection_state: connectionState,
    connection_check_error: connectionCheckError,
    upstream_error: rawError,
    next_step:
      connectionState === 'connected'
        ? 'validate_arguments_or_permissions'
        : 'check_connection_status',
  });
}

async function resolveConnectLink(
  composioClient: ComposioClient,
  authConfigMap: Record<string, string>,
  entityId: string,
  toolkit: string,
  forceNew = false,
): Promise<ConnectLinkResolution> {
  const authConfigId = authConfigMap[toolkit];
  if (!authConfigId) {
    return {
      authConfigId: null,
      requestId: null,
      status: null,
      link: null,
      error: `No auth config found for toolkit "${toolkit}"`,
    };
  }

  try {
    const existingConnections = await composioClient.getConnectedAccountsForToolkit(entityId, toolkit);
    const activeConnections = existingConnections.filter((account) => account.status === 'active');
    const pendingConnections = existingConnections.filter((account) => account.status === 'pending');
    const summarizedConnections = existingConnections.map((account) => ({
      connectionId: account.connectionId,
      status: account.status,
      rawStatus: account.rawStatus ?? null,
      createdAt: account.createdAt ?? null,
    }));

    if (activeConnections.length > 0) {
      return {
        authConfigId,
        requestId: activeConnections[0]?.connectionId ?? null,
        status: 'ACTIVE',
        link: null,
        existingConnectedAccountId: activeConnections[0]?.connectionId ?? null,
        existingConnections: summarizedConnections,
        error: activeConnections.length > 1
          ? `Toolkit "${toolkit}" already has ${activeConnections.length} active connections for entity "${entityId}".`
          : null,
      };
    }

    if (!forceNew && pendingConnections.length > 0) {
      return {
        authConfigId,
        requestId: pendingConnections[0]?.connectionId ?? null,
        status: 'PENDING',
        link: null,
        existingConnectedAccountId: pendingConnections[0]?.connectionId ?? null,
        existingConnections: summarizedConnections,
        error: `Toolkit "${toolkit}" already has ${pendingConnections.length} pending connection request(s) for entity "${entityId}".`,
      };
    }

    const connectionRequest = await composioClient
      .getSDK()
      .connectedAccounts.link(entityId, authConfigId);
    const state = asRecord(connectionRequest);

    const rawStatus = stringOrNull(state?.status) ?? stringOrNull(state?.connectionStatus);
    return {
      authConfigId,
      requestId: stringOrNull(state?.id),
      status: rawStatus ? rawStatus.toUpperCase() : null,
      link: stringOrNull(state?.redirectUrl),
      existingConnectedAccountId: null,
      existingConnections: summarizedConnections,
      error: null,
    };
  } catch (error) {
    return {
      authConfigId,
      requestId: null,
      status: null,
      link: null,
      error: `Failed to create connect link: ${describeError(error)}`,
    };
  }
}

function buildConnectLinkMessage(
  entityId: string,
  toolkit: string,
  link: ConnectLinkResolution
): string {
  if (link.link && link.link.length > 0) {
    return 'Present this URL to the user. After auth, call dm_composio_connection_status again.';
  }
  if (link.status === 'ACTIVE') {
    return `Toolkit "${toolkit}" is already connected for entity "${entityId}".`;
  }
  if (link.status === 'PENDING') {
    return `Toolkit "${toolkit}" already has a pending connection for entity "${entityId}". Complete that flow or rerun with force_new after cleaning up stale requests.`;
  }
  return 'No redirect URL returned by Composio. Retry dm_composio_connection_status.';
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
  shape.connected_account_id = z.string().optional();
  shape.connectedAccountId = z.string().optional();

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
  // Connection IDs disambiguate execution within an entity and must not change
  // which entity the server resolves for allow-list and ownership checks.
  for (const key of ENTITY_ARG_KEYS) {
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

function pickConnectedAccountId(params: Record<string, unknown>): string | null {
  const candidate = params.connected_account_id ?? params.connectedAccountId;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed || null;
}

async function validateConnectedAccountSelection(
  composioClient: ComposioClient,
  entityId: string,
  toolkit: string,
  connectedAccountId: string | null
): Promise<void> {
  if (connectedAccountId) {
    await assertConnectedAccountOwnership(composioClient, entityId, toolkit, connectedAccountId);
    return;
  }

  const activeConnections = await composioClient.getConnectedAccountsForToolkit(entityId, toolkit);
  const activeCount = activeConnections.filter((account) => account.status === 'active').length;
  if (activeCount > 1) {
    throw new Error(
      `Toolkit "${toolkit}" has ${activeCount} active connections for entity "${entityId}". Pass connected_account_id to disambiguate execution.`
    );
  }
}

async function assertConnectedAccountOwnership(
  composioClient: ComposioClient,
  entityId: string,
  toolkit: string,
  connectedAccountId: string
): Promise<void> {
  const connections = await composioClient.getConnectedAccountsForToolkit(entityId, toolkit);
  const match = connections.find((account) => account.connectionId === connectedAccountId);
  if (!match) {
    throw new Error(
      `connected_account_id "${connectedAccountId}" does not belong to toolkit "${toolkit}" for entity "${entityId}".`
    );
  }
  if (match.status !== 'active') {
    throw new Error(
      `connected_account_id "${connectedAccountId}" is "${match.status}" for toolkit "${toolkit}" and entity "${entityId}". Pass an active connection ID.`
    );
  }
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

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const list = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => entry !== null);
}

function extractGmailMessages(result: Record<string, unknown>): Record<string, unknown>[] {
  const data = asRecord(result.data);
  return asRecordArray(data?.messages ?? result.messages);
}

function extractGmailThreadIds(result: Record<string, unknown>): string[] {
  const threadIds = extractGmailMessages(result)
    .map((message) => stringOrNull(message.threadId ?? message.thread_id))
    .filter((threadId): threadId is string => threadId !== null);
  return Array.from(new Set(threadIds));
}

function buildGmailRecentThreadSummary(
  fallbackThreadId: string,
  result: Record<string, unknown>
): Record<string, unknown> | null {
  const messages = extractGmailMessages(result);
  if (messages.length === 0) return null;

  const normalizedMessages = messages.map((message) => {
    const preview = asRecord(message.preview);
    const timestamp = normalizeGmailTimestamp(message);
    const attachmentList = asRecordArray(message.attachmentList);
    const labelIds = normalizeStringList(message.labelIds ?? message.label_ids);
    const threadId =
      stringOrNull(message.threadId ?? message.thread_id) ??
      fallbackThreadId;

    return {
      threadId,
      messageId:
        stringOrNull(message.messageId ?? message.message_id ?? message.id) ?? null,
      timestamp,
      subject:
        stringOrNull(message.subject) ??
        stringOrNull(preview?.subject) ??
        null,
      sender:
        stringOrNull(message.sender) ??
        stringOrNull(message.from) ??
        null,
      to: stringOrNull(message.to) ?? null,
      preview:
        stringOrNull(preview?.body) ??
        stringOrNull(message.snippet) ??
        null,
      labelIds,
      attachmentCount: attachmentList.length,
      unread: labelIds.includes('UNREAD'),
    };
  });

  normalizedMessages.sort((left, right) => {
    const rightEpoch = right.timestamp.epochMs ?? 0;
    const leftEpoch = left.timestamp.epochMs ?? 0;
    return rightEpoch - leftEpoch;
  });

  const latest = normalizedMessages[0];
  return {
    thread_id: latest.threadId,
    latest_message_id: latest.messageId,
    latest_timestamp: latest.timestamp.value,
    subject: latest.subject,
    sender: latest.sender,
    to: latest.to,
    preview: latest.preview,
    label_ids: latest.labelIds,
    unread: latest.unread,
    has_attachments: latest.attachmentCount > 0,
    attachment_count: latest.attachmentCount,
    message_count: normalizedMessages.length,
  };
}

function normalizeGmailTimestamp(message: Record<string, unknown>): {
  value: string | null;
  epochMs: number | null;
} {
  const rawValue =
    stringOrNull(message.messageTimestamp ?? message.message_timestamp) ??
    stringOrNull(message.internalDate ?? message.internal_date) ??
    null;
  const parsed = parseTimestampValue(rawValue);
  if (parsed === null) {
    return {
      value: rawValue,
      epochMs: null,
    };
  }

  return {
    value: new Date(parsed).toISOString(),
    epochMs: parsed,
  };
}

function parseTimestampValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareGmailThreadSummariesNewestFirst(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  const rightEpoch = parseTimestampValue(right.latest_timestamp) ?? 0;
  const leftEpoch = parseTimestampValue(left.latest_timestamp) ?? 0;
  return rightEpoch - leftEpoch;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  const record = asRecord(error);
  if (!record) {
    return String(error);
  }

  const direct =
    stringOrNull(record.message) ??
    stringOrNull(record.error) ??
    stringOrNull(record.details) ??
    stringOrNull(asRecord(record.response)?.message) ??
    stringOrNull(asRecord(record.response)?.error) ??
    stringOrNull(asRecord(record.cause)?.message) ??
    stringOrNull(asRecord(record.cause)?.error);
  if (direct) return direct;

  try {
    const serialized = JSON.stringify(record);
    return serialized.length > 500 ? `${serialized.slice(0, 500)}...` : serialized;
  } catch {
    return String(error);
  }
}

function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toErrorResult(message: string, structured?: Record<string, unknown>) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
    ...(structured ? { structuredContent: { error: message, ...structured } } : {}),
  };
}
