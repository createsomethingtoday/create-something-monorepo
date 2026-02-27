import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { initLogger, type Logger, type Span } from 'braintrust';
import {
  ComposioClient,
  type ComposioToolDef,
  type ComposioToolkitSummary,
} from '@create-something/composio-bridge';

interface Env {
  COMPOSIO_API_KEY?: string;
  COMPOSIO_AUTH_CONFIG_MAP?: string;
  COMPOSIO_DEFAULT_ENTITY_ID?: string;
  COMPOSIO_TOOL_CACHE_SECONDS?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_PROJECT_NAME?: string;
}

type ToolkitRuntime = {
  toolkitSlug: string;
  toolDefs: ComposioToolDef[];
  toolkitInfo: ComposioToolkitSummary | null;
  builtAt: number;
};

type ToolRoute = {
  toolName: string;
  composioToolSlug: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const SERVER_NAME = 'composio-toolkit-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_CACHE_SECONDS = 300;
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

const runtimeCache = new Map<string, ToolkitRuntime>();
const pendingRuntimeLoads = new Map<string, Promise<ToolkitRuntime>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let braintrustLogger: Logger<any> | null = null;
let braintrustLoggerKey: string | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        jsonResponse({
          name: SERVER_NAME,
          version: SERVER_VERSION,
          endpoints: {
            toolkitMcp: '/mcp/<toolkitSlug>',
            health: '/health',
          },
          configured: {
            composioApiKey: Boolean(env.COMPOSIO_API_KEY),
            authConfigMapEntries: Object.keys(parseAuthConfigMap(env.COMPOSIO_AUTH_CONFIG_MAP)).length,
            defaultEntity: env.COMPOSIO_DEFAULT_ENTITY_ID ?? 'default',
            braintrustApiKey: Boolean(env.BRAINTRUST_API_KEY),
            braintrustProjectId: resolveBraintrustProjectId(env),
            braintrustProject: resolveBraintrustProjectName(env),
          },
          cache: {
            ttlSeconds: parsePositiveInt(env.COMPOSIO_TOOL_CACHE_SECONDS, DEFAULT_CACHE_SECONDS),
            toolkitEntries: Array.from(runtimeCache.keys()).sort(),
          },
        }),
      );
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!env.COMPOSIO_API_KEY) {
        return withCors(jsonResponse({ error: 'COMPOSIO_API_KEY is required.' }, 500));
      }

      const toolkitSlug = parseToolkitSlugFromPath(url.pathname);
      if (!toolkitSlug) {
        return withCors(
          jsonResponse(
            {
              error: 'Toolkit slug is required. Use /mcp/<toolkitSlug>.',
              example: '/mcp/gmail',
            },
            400,
          ),
        );
      }

      try {
        const runtime = await getToolkitRuntime(toolkitSlug, env);
        const server = buildToolkitServer(runtime, env, request);
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
      } catch (error) {
        return withCors(
          jsonResponse(
            {
              error: error instanceof Error ? error.message : String(error),
              toolkitSlug,
            },
            500,
          ),
        );
      }
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};

function buildToolkitServer(runtime: ToolkitRuntime, env: Env, request: Request): Server {
  const client = new ComposioClient({ apiKey: env.COMPOSIO_API_KEY! });
  const authConfigMap = parseAuthConfigMap(env.COMPOSIO_AUTH_CONFIG_MAP);
  const logger = getBraintrustLogger(env);

  const managementTools: Tool[] = [
    {
      name: 'connection_status',
      description: `Check if toolkit "${runtime.toolkitSlug}" has an active Composio connection for the current entity.`,
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'get_connect_link',
      description:
        'Get a one-time OAuth link for the current toolkit/entity using COMPOSIO_AUTH_CONFIG_MAP entry.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'toolkit_info',
      description: 'Get toolkit metadata and runtime tool inventory details.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  ];

  const managementNames = new Set(managementTools.map((tool) => tool.name));
  const toolRoutes = buildToolRoutes(runtime.toolDefs, managementNames);

  const server = new Server(
    {
      name: `${SERVER_NAME}:${runtime.toolkitSlug}`,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...managementTools,
      ...toolRoutes.map((route) => ({
        name: route.toolName,
        description: route.description,
        inputSchema: route.inputSchema,
      })),
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (toolRequest, extra) => {
    const toolName = toolRequest.params.name;
    const args = normalizeArgs(toolRequest.params.arguments);
    const entityId = resolveEntityId(extra, request, env);
    const startedAt = Date.now();

    const emitAndReturn = async (
      result: {
        isError?: boolean;
        content: Array<{ type: 'text'; text: string }>;
        structuredContent?: unknown;
      },
      composioToolSlug?: string,
      explicitError?: string,
    ) => {
      if (logger) {
        const durationMs = Date.now() - startedAt;
        const success = result.isError !== true;
        const error = explicitError ?? (success ? undefined : extractToolErrorMessage(result));

        emitBraintrustInvocation(logger, {
          serverName: `${SERVER_NAME}:${runtime.toolkitSlug}`,
          toolkitSlug: runtime.toolkitSlug,
          toolName,
          composioToolSlug,
          accountId: entityId,
          input: args,
          output: result,
          durationMs,
          success,
          error,
        }).catch((emitError) => {
          console.warn(
            `[telemetry] braintrust emit failed for ${runtime.toolkitSlug}:${toolName}:`,
            emitError,
          );
        });
      }

      return result;
    };

    try {
      if (toolName === 'connection_status') {
        const connected = await client.hasActiveConnection(entityId, runtime.toolkitSlug);
        return emitAndReturn(toJsonResult({
          toolkitSlug: runtime.toolkitSlug,
          entityId,
          connected,
          message: connected
            ? `Toolkit "${runtime.toolkitSlug}" is connected for entity "${entityId}".`
            : `Toolkit "${runtime.toolkitSlug}" is not connected. Call get_connect_link and present the URL to the user.`,
        }));
      }

      if (toolName === 'get_connect_link') {
        const authConfigId = authConfigMap[runtime.toolkitSlug] ?? authConfigMap[runtime.toolkitSlug.toLowerCase()];
        if (!authConfigId) {
          return emitAndReturn(toJsonResult({
            toolkitSlug: runtime.toolkitSlug,
            entityId,
            link: null,
            message:
              'No auth config ID found for this toolkit. Add it to COMPOSIO_AUTH_CONFIG_MAP and redeploy.',
          }));
        }

        const connectionRequest = await client.getSDK().connectedAccounts.link(entityId, authConfigId);
        const connectionState = asRecord(connectionRequest);
        const redirectUrl = stringOrNull(connectionState?.redirectUrl);
        const requestId = stringOrNull(connectionState?.id);
        const rawStatus =
          stringOrNull(connectionState?.status) ??
          stringOrNull(connectionState?.connectionStatus);
        const status = rawStatus ? rawStatus.toUpperCase() : null;

        if (status === 'ACTIVE' || status === 'CONNECTED') {
          return emitAndReturn(toJsonResult({
            toolkitSlug: runtime.toolkitSlug,
            entityId,
            alreadyConnected: true,
            link: null,
            requestId,
            status,
            message: `Toolkit "${runtime.toolkitSlug}" is already connected for entity "${entityId}".`,
          }));
        }

        return emitAndReturn(toJsonResult({
          toolkitSlug: runtime.toolkitSlug,
          entityId,
          authConfigId,
          requestId,
          status,
          link: redirectUrl,
          message: redirectUrl
            ? 'Present this URL to the user, then retry connection_status.'
            : 'No redirect URL returned by Composio. Retry connection_status.',
        }));
      }

      if (toolName === 'toolkit_info') {
        return emitAndReturn(toJsonResult({
          toolkitSlug: runtime.toolkitSlug,
          entityId,
          builtAt: new Date(runtime.builtAt).toISOString(),
          toolCount: runtime.toolDefs.length,
          toolkit: runtime.toolkitInfo,
        }));
      }

      const route = toolRoutes.find((candidate) => candidate.toolName === toolName);
      if (!route) {
        const message = `Unknown tool "${toolName}".`;
        return emitAndReturn(toErrorResult(message), undefined, message);
      }

      const result = await client.executeTool(route.composioToolSlug, args, entityId);
      return emitAndReturn(toJsonResult(result), route.composioToolSlug);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Tool "${toolName}" failed: ${String(error)}`;
      return emitAndReturn(toErrorResult(message), undefined, message);
    }
  });

  return server;
}

function buildToolRoutes(toolDefs: ComposioToolDef[], reservedNames: Set<string>): ToolRoute[] {
  const routes: ToolRoute[] = [];
  const usedNames = new Set<string>(reservedNames);

  for (const tool of toolDefs) {
    const baseName = normalizeToolName(tool.slug);
    const toolName = reserveToolName(baseName, usedNames);

    routes.push({
      toolName,
      composioToolSlug: tool.slug,
      description: tool.description || `${tool.name} via Composio`,
      inputSchema: {
        type: 'object',
        properties: tool.parameters.properties ?? {},
        required: tool.parameters.required ?? [],
        additionalProperties: true,
      },
    });
  }

  return routes;
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

async function getToolkitRuntime(toolkitSlug: string, env: Env): Promise<ToolkitRuntime> {
  const normalized = toolkitSlug.trim().toLowerCase();
  const ttlMs = parsePositiveInt(env.COMPOSIO_TOOL_CACHE_SECONDS, DEFAULT_CACHE_SECONDS) * 1000;

  const cached = runtimeCache.get(normalized);
  if (cached && Date.now() - cached.builtAt <= ttlMs) {
    return cached;
  }

  const pending = pendingRuntimeLoads.get(normalized);
  if (pending) {
    return pending;
  }

  const promise = buildToolkitRuntime(normalized, env)
    .then((runtime) => {
      runtimeCache.set(normalized, runtime);
      return runtime;
    })
    .finally(() => {
      pendingRuntimeLoads.delete(normalized);
    });

  pendingRuntimeLoads.set(normalized, promise);
  return promise;
}

async function buildToolkitRuntime(toolkitSlug: string, env: Env): Promise<ToolkitRuntime> {
  const client = new ComposioClient({ apiKey: env.COMPOSIO_API_KEY! });

  const [toolDefs, toolkitInventory] = await Promise.all([
    client.getTools([toolkitSlug], {
      important: false,
      limit: 10000,
    }),
    client.listToolkits({
      managedBy: 'all',
      sortBy: 'alphabetically',
      limit: 1000,
    }),
  ]);

  const toolkitInfo =
    toolkitInventory.find((entry) => entry.slug.toLowerCase() === toolkitSlug) ?? null;

  return {
    toolkitSlug,
    toolDefs,
    toolkitInfo,
    builtAt: Date.now(),
  };
}

function parseToolkitSlugFromPath(pathname: string): string | null {
  if (pathname === '/mcp' || pathname === '/mcp/') return null;
  if (!pathname.startsWith('/mcp/')) return null;

  const [, , rawSlug] = pathname.split('/');
  if (!rawSlug) return null;

  const decoded = decodeURIComponent(rawSlug).trim().toLowerCase();
  return decoded || null;
}

function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function resolveEntityId(extra: unknown, request: Request, env: Env): string {
  const requestInfo = asRecord(extra)?.requestInfo;

  const fromHeader =
    getHeaderValue(requestInfo, 'x-mcp-account-id') ??
    request.headers.get('x-mcp-account-id') ??
    getHeaderValue(requestInfo, 'x-account-id') ??
    request.headers.get('x-account-id');

  if (fromHeader && fromHeader.trim()) {
    return fromHeader.trim();
  }

  const authorization =
    getHeaderValue(requestInfo, 'authorization') ?? request.headers.get('authorization');
  const bearer = authorization ? parseBearerToken(authorization) : null;
  if (bearer) return bearer;

  return env.COMPOSIO_DEFAULT_ENTITY_ID?.trim() || 'default';
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

function parseBearerToken(value: string): string | null {
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token || null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseAuthConfigMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') continue;
      const normalizedKey = key.trim().toLowerCase();
      const normalizedValue = value.trim();
      if (!normalizedKey || !normalizedValue) continue;
      out[normalizedKey] = normalizedValue;
    }
    return out;
  } catch {
    return {};
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function resolveBraintrustProjectId(env: { BRAINTRUST_PROJECT_ID?: string }): string | null {
  const configured = env.BRAINTRUST_PROJECT_ID?.trim();
  return configured && configured.length > 0 ? configured : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBraintrustLogger(env: Env): Logger<any> | null {
  const apiKey = env.BRAINTRUST_API_KEY?.trim();
  if (!apiKey) return null;

  const projectName = resolveBraintrustProjectName(env);
  const projectId = resolveBraintrustProjectId(env);
  const nextKey = `${apiKey}::${projectId ?? ''}::${projectName}`;

  if (!braintrustLogger || braintrustLoggerKey !== nextKey) {
    const loggerConfig: Parameters<typeof initLogger>[0] = {
      apiKey,
      projectName,
      asyncFlush: true,
      setCurrent: true,
    };
    if (projectId) {
      (loggerConfig as Record<string, unknown>).projectId = projectId;
    }

    braintrustLogger = initLogger(loggerConfig);
    braintrustLoggerKey = nextKey;
  }

  return braintrustLogger;
}

async function emitBraintrustInvocation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: Logger<any>,
  args: {
    serverName: string;
    toolkitSlug: string;
    toolName: string;
    accountId: string;
    composioToolSlug?: string;
    input: unknown;
    output: unknown;
    durationMs: number;
    success: boolean;
    error?: string;
  },
): Promise<void> {
  await logger.traced(
    (span: Span) => {
      span.log({
        input: args.input,
        output: args.output,
        error: args.error,
        tags: ['mcp', SERVER_NAME, args.toolkitSlug, args.toolName, args.success ? 'success' : 'error'],
        metadata: {
          server: args.serverName,
          toolkit: args.toolkitSlug,
          tool: args.toolName,
          composioToolSlug: args.composioToolSlug,
          accountId: args.accountId,
          durationMs: args.durationMs,
          success: args.success,
        },
      });
    },
    {
      name: `mcp:${args.serverName}:${args.toolName}`,
      type: 'tool',
    },
  );
}

function extractToolErrorMessage(result: {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
}): string | undefined {
  const structured = asRecord(result.structuredContent);
  if (structured && typeof structured.error === 'string' && structured.error.trim().length > 0) {
    return structured.error.trim();
  }

  for (const entry of result.content) {
    if (entry.type !== 'text') continue;
    const trimmed = entry.text.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().startsWith('error:')) {
      const withoutPrefix = trimmed.slice(6).trim();
      return withoutPrefix.length > 0 ? withoutPrefix : trimmed;
    }
    return trimmed;
  }

  return undefined;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-MCP-Account-Id');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
