import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { Langfuse } from 'langfuse';
import {
  ComposioClient,
  type ComposioToolDef,
  type ComposioToolkitSummary,
} from '@create-something/composio-bridge';

interface Env {
  COMPOSIO_API_KEY?: string;
  COMPOSIO_AUTH_CONFIG_MAP?: string;
  COMPOSIO_AIRTABLE_AUTH_CONFIG_ID?: string;
  COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID?: string;
  COMPOSIO_DEFAULT_ENTITY_ID?: string;
  COMPOSIO_ENTITY_RESOLUTION_MODE?: string;
  COMPOSIO_TOOL_CACHE_SECONDS?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_BASE_URL?: string;
  LANGFUSE_PROJECT_NAME?: string;
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

type EntityResolutionMode = 'header_required' | 'compat';

const SERVER_NAME = 'composio-toolkit-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_CACHE_SECONDS = 300;
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';
const ZOOM_TRANSCRIPT_STATUS_TOOL = 'zoom_latest_transcript_status';
const ZOOM_LIST_TRANSCRIPTS_TOOL = 'zoom_list_available_transcripts';
const DEFAULT_ZOOM_LOOKBACK_DAYS = 7;
const GMAIL_MARK_READ_BY_QUERY_TOOL = 'gmail_mark_read_by_query';
const DEFAULT_GMAIL_QUERY = 'is:unread';
const DEFAULT_GMAIL_PAGE_SIZE = 100;
const DEFAULT_GMAIL_BATCH_SIZE = 500;
const DEFAULT_GMAIL_MAX_MESSAGES = 5000;
const ZOOM_TOOL_NAMES = {
  getCurrentUser: 'zoom_get_current_user',
  listMeetings: 'zoom_list_meetings',
  getMeetingRecordings: 'zoom_get_meeting_recordings',
} as const;

const runtimeCache = new Map<string, ToolkitRuntime>();
const pendingRuntimeLoads = new Map<string, Promise<ToolkitRuntime>>();
let langfuseClient: Langfuse | null = null;
let langfuseLoggerKey: string | null = null;

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
            authConfigMapEntries: Object.keys(buildAuthConfigMap(env)).length,
            defaultEntity: env.COMPOSIO_DEFAULT_ENTITY_ID ?? 'default',
            entityResolutionMode: resolveEntityResolutionMode(env),
            langfusePublicKey: Boolean(env.LANGFUSE_PUBLIC_KEY),
            langfuseSecretKey: Boolean(env.LANGFUSE_SECRET_KEY),
            langfuseProject: resolveLangfuseProjectName(env),
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
  const authConfigMap = buildAuthConfigMap(env);
  const logger = getLangfuseLogger(env);
  const isZoomToolkit = runtime.toolkitSlug === 'zoom';

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
        'Get a one-time OAuth link for the current toolkit/entity using COMPOSIO_AUTH_CONFIG_MAP entry or toolkit-specific auth config env.',
      inputSchema: {
        type: 'object',
        properties: {
          forceNew: {
            type: 'boolean',
            description:
              'Start a fresh auth flow even if a pending connection already exists. Ignored when an active connection already exists.',
          },
        },
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
  const isGmailToolkit = runtime.toolkitSlug === 'gmail';
  if (isZoomToolkit) {
    managementTools.push({
      name: ZOOM_TRANSCRIPT_STATUS_TOOL,
      description:
        'Check transcript availability for the latest Zoom meeting recording (or a specific meeting ID/UUID).',
      inputSchema: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: 'Optional meeting ID or UUID to inspect directly.',
          },
          composioUserId: {
            type: 'string',
            description: 'Optional Composio user ID override (for example: "dm").',
          },
          connectedAccountId: {
            type: 'string',
            description: 'Optional Composio connected account ID to force account selection.',
          },
          from: {
            type: 'string',
            description: 'Optional UTC start date (yyyy-mm-dd) for previous meeting search.',
          },
          to: {
            type: 'string',
            description: 'Optional UTC end date (yyyy-mm-dd) for previous meeting search.',
          },
          topicQuery: {
            type: 'string',
            description: 'Optional case-insensitive topic filter when selecting the latest meeting.',
          },
          pageSize: {
            type: 'number',
            description: 'Number of previous meetings to fetch (1-100, default 30).',
          },
          includeRecordingFiles: {
            type: 'boolean',
            description: 'Include full recording file metadata in the response.',
          },
        },
        additionalProperties: false,
      },
    });
    managementTools.push({
      name: ZOOM_LIST_TRANSCRIPTS_TOOL,
      description: 'List available Zoom transcript files across previous meetings.',
      inputSchema: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: 'Optional meeting ID or UUID to limit listing to one meeting.',
          },
          composioUserId: {
            type: 'string',
            description: 'Optional Composio user ID override (for example: "dm").',
          },
          connectedAccountId: {
            type: 'string',
            description: 'Optional Composio connected account ID to force account selection.',
          },
          from: {
            type: 'string',
            description: 'Optional UTC start date (yyyy-mm-dd) for previous meeting search.',
          },
          to: {
            type: 'string',
            description: 'Optional UTC end date (yyyy-mm-dd) for previous meeting search.',
          },
          topicQuery: {
            type: 'string',
            description: 'Optional case-insensitive topic filter.',
          },
          pageSize: {
            type: 'number',
            description: 'Number of meetings fetched from Zoom (1-100, default 30).',
          },
          maxMeetings: {
            type: 'number',
            description: 'Maximum meetings to inspect for transcript files (1-100, default 20).',
          },
          limit: {
            type: 'number',
            description: 'Maximum transcript files returned (1-500, default 100).',
          },
        },
        additionalProperties: false,
      },
    });
  }
  if (isGmailToolkit) {
    managementTools.push({
      name: GMAIL_MARK_READ_BY_QUERY_TOOL,
      description:
        'Resolve a Gmail search query to message IDs, then mark those messages as read by removing the UNREAD label in batches.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: `Gmail search query to mark as read (default: ${DEFAULT_GMAIL_QUERY}).`,
          },
          pageSize: {
            type: 'number',
            description: 'How many matching messages to fetch per page (1-500, default 100).',
          },
          batchSize: {
            type: 'number',
            description: 'How many message IDs to update per batch (1-1000, default 500).',
          },
          maxMessages: {
            type: 'number',
            description: 'Safety cap on total matched messages processed (1-10000, default 5000).',
          },
          dryRun: {
            type: 'boolean',
            description: 'If true, only collect matching message IDs and return the plan without modifying Gmail.',
          },
          connectedAccountId: {
            type: 'string',
            description:
              'Optional Composio connected account ID. Use this when multiple active Gmail connections exist for the same entity.',
          },
        },
        additionalProperties: false,
      },
    });
  }

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
    const startedAt = Date.now();
    let entityId = 'unknown';
    const traceContext = resolveInvocationTraceContext(extra, request);

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

        emitLangfuseInvocation(logger, {
          serverName: `${SERVER_NAME}:${runtime.toolkitSlug}`,
          toolkitSlug: runtime.toolkitSlug,
          toolName,
          composioToolSlug,
          accountId: entityId,
          correlationId: traceContext.correlationId,
          requestId: traceContext.requestId,
          input: args,
          output: result,
          durationMs,
          success,
          error,
        }).catch((emitError) => {
          console.warn(
            `[telemetry] langfuse emit failed for ${runtime.toolkitSlug}:${toolName}:`,
            emitError,
          );
        });
      }

      return result;
    };

    try {
      entityId = resolveEntityId(extra, request, env);

      if (toolName === 'connection_status') {
        const connections = await client.getConnectedAccountsForToolkit(entityId, runtime.toolkitSlug);
        const activeConnections = connections.filter((account) => account.status === 'active');
        const pendingConnections = connections.filter((account) => account.status === 'pending');
        const connected = activeConnections.length > 0;
        return emitAndReturn(toJsonResult({
          toolkitSlug: runtime.toolkitSlug,
          entityId,
          connected,
          connectionCount: connections.length,
          activeConnectionCount: activeConnections.length,
          pendingConnectionCount: pendingConnections.length,
          ambiguous: activeConnections.length > 1,
          recommendedConnectedAccountId:
            activeConnections[0]?.connectionId ?? pendingConnections[0]?.connectionId ?? null,
          connections: connections.map((account) => ({
            connectionId: account.connectionId,
            status: account.status,
            rawStatus: account.rawStatus ?? null,
            createdAt: account.createdAt ?? null,
          })),
          message: connected
            ? activeConnections.length > 1
              ? `Toolkit "${runtime.toolkitSlug}" has ${activeConnections.length} active connections for entity "${entityId}". Use connectedAccountId to pin execution or clean up duplicates in Composio.`
              : `Toolkit "${runtime.toolkitSlug}" is connected for entity "${entityId}".`
            : pendingConnections.length > 0
              ? `Toolkit "${runtime.toolkitSlug}" has a pending connection for entity "${entityId}". Complete that flow or call get_connect_link with forceNew=true after cleaning up stale requests.`
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
              'No auth config ID found for this toolkit. Add it to COMPOSIO_AUTH_CONFIG_MAP or toolkit-specific auth config env and redeploy.',
          }));
        }

        const forceNew = args.forceNew === true;
        const existingConnections = await client.getConnectedAccountsForToolkit(entityId, runtime.toolkitSlug);
        const activeConnections = existingConnections.filter((account) => account.status === 'active');
        const pendingConnections = existingConnections.filter((account) => account.status === 'pending');

        if (activeConnections.length > 0) {
          return emitAndReturn(toJsonResult({
            toolkitSlug: runtime.toolkitSlug,
            entityId,
            authConfigId,
            alreadyConnected: true,
            link: null,
            status: 'ACTIVE',
            requestId: activeConnections[0]?.connectionId ?? null,
            activeConnectionCount: activeConnections.length,
            pendingConnectionCount: pendingConnections.length,
            ambiguous: activeConnections.length > 1,
            recommendedConnectedAccountId: activeConnections[0]?.connectionId ?? null,
            existingConnections: existingConnections.map((account) => ({
              connectionId: account.connectionId,
              status: account.status,
              rawStatus: account.rawStatus ?? null,
              createdAt: account.createdAt ?? null,
            })),
            message: activeConnections.length > 1
              ? `Toolkit "${runtime.toolkitSlug}" already has ${activeConnections.length} active connections for entity "${entityId}". Refusing to create another link; clean up duplicates or pass connectedAccountId during execution.`
              : `Toolkit "${runtime.toolkitSlug}" is already connected for entity "${entityId}".`,
          }));
        }

        if (!forceNew && pendingConnections.length > 0) {
          return emitAndReturn(toJsonResult({
            toolkitSlug: runtime.toolkitSlug,
            entityId,
            authConfigId,
            pendingExisting: true,
            link: null,
            status: 'PENDING',
            requestId: pendingConnections[0]?.connectionId ?? null,
            pendingConnectionCount: pendingConnections.length,
            recommendedConnectedAccountId: pendingConnections[0]?.connectionId ?? null,
            existingConnections: existingConnections.map((account) => ({
              connectionId: account.connectionId,
              status: account.status,
              rawStatus: account.rawStatus ?? null,
              createdAt: account.createdAt ?? null,
            })),
            message: `Toolkit "${runtime.toolkitSlug}" already has ${pendingConnections.length} pending connection request(s) for entity "${entityId}". Complete the existing flow or pass forceNew=true after cleaning up stale requests.`,
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

      if (toolName === ZOOM_TRANSCRIPT_STATUS_TOOL && isZoomToolkit) {
        const result = await checkZoomTranscriptAvailability({
          client,
          toolRoutes,
          entityId,
          args,
          toolkitSlug: runtime.toolkitSlug,
        });
        return emitAndReturn(toJsonResult(result));
      }

      if (toolName === ZOOM_LIST_TRANSCRIPTS_TOOL && isZoomToolkit) {
        const result = await listZoomAvailableTranscripts({
          client,
          toolRoutes,
          entityId,
          args,
          toolkitSlug: runtime.toolkitSlug,
        });
        return emitAndReturn(toJsonResult(result));
      }

      if (toolName === GMAIL_MARK_READ_BY_QUERY_TOOL && isGmailToolkit) {
        const result = await markGmailMessagesReadByQuery({
          client,
          toolRoutes,
          entityId,
          args,
          toolkitSlug: runtime.toolkitSlug,
        });
        return emitAndReturn(toJsonResult(result));
      }

      const route = toolRoutes.find((candidate) => candidate.toolName === toolName);
      if (!route) {
        const message = `Unknown tool "${toolName}".`;
        return emitAndReturn(toErrorResult(message), undefined, message);
      }

      const connectedAccountId = stringOrNull(args.connectedAccountId);
      if (connectedAccountId) {
        await assertConnectedAccountOwnership({
          client,
          entityId,
          connectedAccountId,
          toolkitSlug: runtime.toolkitSlug,
        });
      } else {
        const activeConnections = await client.getConnectedAccountsForToolkit(entityId, runtime.toolkitSlug);
        const activeCount = activeConnections.filter((account) => account.status === 'active').length;
        if (activeCount > 1) {
          throw new Error(
            `Toolkit "${runtime.toolkitSlug}" has ${activeCount} active connections for entity "${entityId}". Pass connectedAccountId to disambiguate execution.`,
          );
        }
      }

      const result = await client.executeTool(
        route.composioToolSlug,
        stripConnectedAccountArg(args),
        entityId,
        connectedAccountId ?? undefined,
      );
      return emitAndReturn(toJsonResult(result), route.composioToolSlug);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Tool "${toolName}" failed: ${String(error)}`;
      return emitAndReturn(toErrorResult(message), undefined, message);
    }
  });

  return server;
}

async function checkZoomTranscriptAvailability(params: {
  client: ComposioClient;
  toolRoutes: ToolRoute[];
  entityId: string;
  args: Record<string, unknown>;
  toolkitSlug: string;
}): Promise<Record<string, unknown>> {
  const { client, toolRoutes, entityId, args, toolkitSlug } = params;
  const warnings: string[] = [];
  const composioUserId = stringOrNull(args.composioUserId) ?? entityId;
  const connectedAccountId = stringOrNull(args.connectedAccountId);
  if (connectedAccountId) {
    await assertConnectedAccountOwnership({
      client,
      entityId: composioUserId,
      connectedAccountId,
      toolkitSlug,
    });
  }

  const connected = await client.hasActiveConnection(composioUserId, toolkitSlug).catch((error) => {
    warnings.push(`Connection check failed: ${toErrorMessage(error)}`);
    return false;
  });
  const bypassConnectionGate = Boolean(connectedAccountId && connectedAccountId.trim().length > 0);

  if (!connected && !bypassConnectionGate) {
    return {
      toolkitSlug,
      entityId,
      composioUserId,
      connectedAccountId,
      connected: false,
      status: 'not_connected',
      transcriptAvailable: false,
      message:
        'Zoom is not connected for this entity. Call get_connect_link and authenticate the Zoom account you want to query.',
      warnings,
    };
  }
  if (!connected && bypassConnectionGate) {
    warnings.push(
      `No active "${toolkitSlug}" connection found for composioUserId="${composioUserId}". ` +
      `Proceeding with connectedAccountId override "${connectedAccountId}".`,
    );
  }

  const requestedMeetingId = stringOrNull(args.meetingId);
  const topicQuery = stringOrNull(args.topicQuery);
  const includeRecordingFiles = booleanArg(args.includeRecordingFiles, false);
  const pageSize = numberArg(args.pageSize, 30, 1, 100);

  const todayUtc = new Date();
  const defaultTo = formatUtcDate(todayUtc);
  const defaultFrom = formatUtcDate(
    new Date(todayUtc.getTime() - (DEFAULT_ZOOM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)),
  );

  const fromInput = stringOrNull(args.from);
  const toInput = stringOrNull(args.to);
  const parsedFrom = fromInput ? normalizeIsoDate(fromInput) : null;
  const parsedTo = toInput ? normalizeIsoDate(toInput) : null;
  if (fromInput && !parsedFrom) {
    warnings.push(`Invalid "from" date "${fromInput}". Expected yyyy-mm-dd. Using default ${defaultFrom}.`);
  }
  if (toInput && !parsedTo) {
    warnings.push(`Invalid "to" date "${toInput}". Expected yyyy-mm-dd. Using default ${defaultTo}.`);
  }
  const from = parsedFrom ?? defaultFrom;
  const to = parsedTo ?? defaultTo;

  let currentUser: Record<string, unknown> | null = null;
  const currentUserResult = await executeToolkitToolByName({
    client,
    toolRoutes,
    toolName: ZOOM_TOOL_NAMES.getCurrentUser,
    args: {},
    entityId: composioUserId,
    connectedAccountId,
  }).catch((error) => {
    warnings.push(`Could not fetch Zoom user profile: ${toErrorMessage(error)}`);
    return null;
  });
  if (currentUserResult && isExecutionSuccessful(currentUserResult)) {
    currentUser = extractDataRecord(currentUserResult);
  }

  let selectedMeeting: Record<string, unknown> | null = null;
  let candidatesScanned = 0;
  if (requestedMeetingId) {
    selectedMeeting = { id: requestedMeetingId };
  } else {
    const listMeetingsResult = await executeToolkitToolByName({
      client,
      toolRoutes,
      toolName: ZOOM_TOOL_NAMES.listMeetings,
      args: {
        userId: 'me',
        type: 'previous_meetings',
        from,
        to,
        page_size: pageSize,
      },
      entityId: composioUserId,
      connectedAccountId,
    }).catch((error) => {
      warnings.push(`Failed to list previous Zoom meetings: ${toErrorMessage(error)}`);
      return null;
    });

    if (!listMeetingsResult) {
      return {
        toolkitSlug,
        entityId,
        composioUserId,
        connectedAccountId,
        connected: true,
        status: 'meeting_lookup_failed',
        transcriptAvailable: false,
        query: {
          meetingId: requestedMeetingId,
          from,
          to,
          topicQuery,
          pageSize,
        },
        account: summarizeZoomUser(currentUser),
        message: 'Could not list previous meetings from Zoom.',
        warnings,
      };
    }

    if (!isExecutionSuccessful(listMeetingsResult)) {
      const lookupError = extractExecutionError(listMeetingsResult) ?? 'Unknown Zoom list_meetings error';
      return {
        toolkitSlug,
        entityId,
        composioUserId,
        connectedAccountId,
        connected: true,
        status: 'meeting_lookup_failed',
        transcriptAvailable: false,
        query: {
          meetingId: requestedMeetingId,
          from,
          to,
          topicQuery,
          pageSize,
        },
        account: summarizeZoomUser(currentUser),
        message: `Zoom list_meetings failed: ${lookupError}`,
        warnings,
      };
    }

    const meetingRows = asRecordArray(extractDataRecord(listMeetingsResult)?.meetings);
    const filteredMeetings = topicQuery
      ? meetingRows.filter((meeting) => {
        const topic = (stringOrNull(meeting.topic) ?? '').toLowerCase();
        return topic.includes(topicQuery.toLowerCase());
      })
      : meetingRows;

    filteredMeetings.sort((a, b) => {
      const aTime = Date.parse(stringOrNull(a.start_time) ?? '') || 0;
      const bTime = Date.parse(stringOrNull(b.start_time) ?? '') || 0;
      return bTime - aTime;
    });

    candidatesScanned = filteredMeetings.length;
    selectedMeeting = filteredMeetings[0] ?? null;
  }

  if (!selectedMeeting) {
    return {
      toolkitSlug,
      entityId,
      composioUserId,
      connectedAccountId,
      connected: true,
      status: 'no_meetings_found',
      transcriptAvailable: false,
      query: {
        meetingId: requestedMeetingId,
        from,
        to,
        topicQuery,
        pageSize,
      },
      account: summarizeZoomUser(currentUser),
      message: topicQuery
        ? `No previous meetings matched topic filter "${topicQuery}".`
        : 'No previous meetings found in the selected time window.',
      warnings,
    };
  }

  const meetingIdForLookup =
    stringOrNull(selectedMeeting.id) ??
    stringOrNull(selectedMeeting.meeting_id) ??
    requestedMeetingId;
  const meetingUuidForLookup = stringOrNull(selectedMeeting.uuid);

  const lookupAttempts: Array<Record<string, unknown>> = [];
  let recordingFiles: Record<string, unknown>[] = [];
  let recordingCount = 0;

  const runRecordingLookup = async (lookupId: string, lookupType: 'meeting_id' | 'meeting_uuid') => {
    const recordingResult = await executeToolkitToolByName({
      client,
      toolRoutes,
      toolName: ZOOM_TOOL_NAMES.getMeetingRecordings,
      args: { meetingId: lookupId },
      entityId: composioUserId,
      connectedAccountId,
    }).catch((error) => {
      const reason = toErrorMessage(error);
      lookupAttempts.push({
        lookupType,
        lookupId,
        ok: false,
        error: reason,
      });
      warnings.push(`Recording lookup failed for ${lookupType}=${lookupId}: ${reason}`);
      return null;
    });

    if (!recordingResult) return;
    if (!isExecutionSuccessful(recordingResult)) {
      const reason = extractExecutionError(recordingResult) ?? 'Unknown Zoom get_meeting_recordings error';
      lookupAttempts.push({
        lookupType,
        lookupId,
        ok: false,
        error: reason,
      });
      warnings.push(`Recording lookup failed for ${lookupType}=${lookupId}: ${reason}`);
      return;
    }

    const data = extractDataRecord(recordingResult);
    const files = asRecordArray(data?.recording_files);
    const reportedCount = numberOrNull(data?.recording_count) ?? files.length;
    recordingFiles = dedupeRecordingFiles(recordingFiles.concat(files));
    recordingCount = Math.max(recordingCount, reportedCount);
    lookupAttempts.push({
      lookupType,
      lookupId,
      ok: true,
      recordingCount: reportedCount,
      fileCount: files.length,
    });
  };

  if (meetingIdForLookup) {
    await runRecordingLookup(meetingIdForLookup, 'meeting_id');
  }
  if (recordingFiles.length === 0 && meetingUuidForLookup && meetingUuidForLookup !== meetingIdForLookup) {
    await runRecordingLookup(meetingUuidForLookup, 'meeting_uuid');
  }

  const transcriptFiles = recordingFiles
    .filter((file) => isTranscriptFile(file))
    .map((file) => summarizeRecordingFile(file));
  const summarizedFiles = recordingFiles.map((file) => summarizeRecordingFile(file));
  const transcriptAvailable = transcriptFiles.length > 0;
  const recordingAvailable = recordingFiles.length > 0 || recordingCount > 0;

  const status = transcriptAvailable
    ? 'transcript_available'
    : (recordingAvailable ? 'recording_available_transcript_pending' : 'recording_not_found');

  const message = transcriptAvailable
    ? 'Transcript file is available for the selected meeting recording.'
    : (recordingAvailable
      ? 'Recording exists but no transcript file is available yet.'
      : 'No cloud recording files are available for the selected meeting yet.');

  return {
    toolkitSlug,
    entityId,
    composioUserId,
    connectedAccountId,
    connected: true,
    status,
    transcriptAvailable,
    query: {
      meetingId: requestedMeetingId,
      from,
      to,
      topicQuery,
      pageSize,
    },
    account: summarizeZoomUser(currentUser),
    meeting: summarizeMeeting(selectedMeeting),
    candidatesScanned,
    recording: {
      recordingAvailable,
      recordingCount,
      fileCount: recordingFiles.length,
      transcriptFileCount: transcriptFiles.length,
      transcriptFiles,
      lookupAttempts,
      files: includeRecordingFiles ? summarizedFiles : undefined,
    },
    message,
    warnings,
  };
}

async function listZoomAvailableTranscripts(params: {
  client: ComposioClient;
  toolRoutes: ToolRoute[];
  entityId: string;
  args: Record<string, unknown>;
  toolkitSlug: string;
}): Promise<Record<string, unknown>> {
  const { client, toolRoutes, entityId, args, toolkitSlug } = params;
  const warnings: string[] = [];
  const composioUserId = stringOrNull(args.composioUserId) ?? entityId;
  const connectedAccountId = stringOrNull(args.connectedAccountId);
  if (connectedAccountId) {
    await assertConnectedAccountOwnership({
      client,
      entityId: composioUserId,
      connectedAccountId,
      toolkitSlug,
    });
  }

  const connected = await client.hasActiveConnection(composioUserId, toolkitSlug).catch((error) => {
    warnings.push(`Connection check failed: ${toErrorMessage(error)}`);
    return false;
  });
  const bypassConnectionGate = Boolean(connectedAccountId && connectedAccountId.trim().length > 0);
  if (!connected && !bypassConnectionGate) {
    return {
      toolkitSlug,
      entityId,
      composioUserId,
      connectedAccountId,
      connected: false,
      status: 'not_connected',
      transcriptCount: 0,
      transcripts: [],
      message:
        'Zoom is not connected for this entity. Call get_connect_link and authenticate the Zoom account you want to query.',
      warnings,
    };
  }
  if (!connected && bypassConnectionGate) {
    warnings.push(
      `No active "${toolkitSlug}" connection found for composioUserId="${composioUserId}". ` +
      `Proceeding with connectedAccountId override "${connectedAccountId}".`,
    );
  }

  const requestedMeetingId = stringOrNull(args.meetingId);
  const topicQuery = stringOrNull(args.topicQuery);
  const pageSize = numberArg(args.pageSize, 30, 1, 100);
  const maxMeetings = numberArg(args.maxMeetings, 20, 1, 100);
  const limit = numberArg(args.limit, 100, 1, 500);

  const todayUtc = new Date();
  const defaultTo = formatUtcDate(todayUtc);
  const defaultFrom = formatUtcDate(
    new Date(todayUtc.getTime() - (DEFAULT_ZOOM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)),
  );
  const fromInput = stringOrNull(args.from);
  const toInput = stringOrNull(args.to);
  const parsedFrom = fromInput ? normalizeIsoDate(fromInput) : null;
  const parsedTo = toInput ? normalizeIsoDate(toInput) : null;
  if (fromInput && !parsedFrom) {
    warnings.push(`Invalid "from" date "${fromInput}". Expected yyyy-mm-dd. Using default ${defaultFrom}.`);
  }
  if (toInput && !parsedTo) {
    warnings.push(`Invalid "to" date "${toInput}". Expected yyyy-mm-dd. Using default ${defaultTo}.`);
  }
  const from = parsedFrom ?? defaultFrom;
  const to = parsedTo ?? defaultTo;

  let currentUser: Record<string, unknown> | null = null;
  const currentUserResult = await executeToolkitToolByName({
    client,
    toolRoutes,
    toolName: ZOOM_TOOL_NAMES.getCurrentUser,
    args: {},
    entityId: composioUserId,
    connectedAccountId,
  }).catch((error) => {
    warnings.push(`Could not fetch Zoom user profile: ${toErrorMessage(error)}`);
    return null;
  });
  if (currentUserResult && isExecutionSuccessful(currentUserResult)) {
    currentUser = extractDataRecord(currentUserResult);
  }

  let meetingCandidates: Record<string, unknown>[] = [];
  if (requestedMeetingId) {
    meetingCandidates = [{ id: requestedMeetingId }];
  } else {
    const listMeetingsResult = await executeToolkitToolByName({
      client,
      toolRoutes,
      toolName: ZOOM_TOOL_NAMES.listMeetings,
      args: {
        userId: 'me',
        type: 'previous_meetings',
        from,
        to,
        page_size: pageSize,
      },
      entityId: composioUserId,
      connectedAccountId,
    }).catch((error) => {
      warnings.push(`Failed to list previous Zoom meetings: ${toErrorMessage(error)}`);
      return null;
    });

    if (!listMeetingsResult) {
      return {
        toolkitSlug,
        entityId,
        composioUserId,
        connectedAccountId,
        connected: true,
        status: 'meeting_lookup_failed',
        transcriptCount: 0,
        transcripts: [],
        query: {
          meetingId: requestedMeetingId,
          from,
          to,
          topicQuery,
          pageSize,
          maxMeetings,
          limit,
        },
        account: summarizeZoomUser(currentUser),
        message: 'Could not list previous meetings from Zoom.',
        warnings,
      };
    }

    if (!isExecutionSuccessful(listMeetingsResult)) {
      const lookupError = extractExecutionError(listMeetingsResult) ?? 'Unknown Zoom list_meetings error';
      return {
        toolkitSlug,
        entityId,
        composioUserId,
        connectedAccountId,
        connected: true,
        status: 'meeting_lookup_failed',
        transcriptCount: 0,
        transcripts: [],
        query: {
          meetingId: requestedMeetingId,
          from,
          to,
          topicQuery,
          pageSize,
          maxMeetings,
          limit,
        },
        account: summarizeZoomUser(currentUser),
        message: `Zoom list_meetings failed: ${lookupError}`,
        warnings,
      };
    }

    const rows = asRecordArray(extractDataRecord(listMeetingsResult)?.meetings);
    const filtered = topicQuery
      ? rows.filter((meeting) => {
        const topic = (stringOrNull(meeting.topic) ?? '').toLowerCase();
        return topic.includes(topicQuery.toLowerCase());
      })
      : rows;

    filtered.sort((a, b) => {
      const aTime = Date.parse(stringOrNull(a.start_time) ?? '') || 0;
      const bTime = Date.parse(stringOrNull(b.start_time) ?? '') || 0;
      return bTime - aTime;
    });
    meetingCandidates = filtered.slice(0, maxMeetings);
  }

  const transcripts: Array<Record<string, unknown>> = [];
  const transcriptKeys = new Set<string>();
  let recordingsScanned = 0;
  const lookupAttempts: Array<Record<string, unknown>> = [];

  for (const meeting of meetingCandidates) {
    if (transcripts.length >= limit) break;
    const meetingSummary = summarizeMeeting(meeting);
    const lookupIds = [
      stringOrNull(meeting.id) ?? stringOrNull(meeting.meeting_id),
      stringOrNull(meeting.uuid),
    ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

    if (lookupIds.length === 0 && requestedMeetingId) {
      lookupIds.push(requestedMeetingId);
    }

    const recordingFiles: Record<string, unknown>[] = [];
    for (const lookupId of lookupIds) {
      const lookupType: 'meeting_id' | 'meeting_uuid' = lookupId.includes('=') ? 'meeting_uuid' : 'meeting_id';
      const recordingResult = await executeToolkitToolByName({
        client,
        toolRoutes,
        toolName: ZOOM_TOOL_NAMES.getMeetingRecordings,
        args: { meetingId: lookupId },
        entityId: composioUserId,
        connectedAccountId,
      }).catch((error) => {
        const reason = toErrorMessage(error);
        lookupAttempts.push({ meetingLookupId: lookupId, lookupType, ok: false, error: reason });
        warnings.push(`Recording lookup failed for ${lookupType}=${lookupId}: ${reason}`);
        return null;
      });

      if (!recordingResult) continue;
      if (!isExecutionSuccessful(recordingResult)) {
        const reason = extractExecutionError(recordingResult) ?? 'Unknown Zoom get_meeting_recordings error';
        lookupAttempts.push({ meetingLookupId: lookupId, lookupType, ok: false, error: reason });
        continue;
      }

      const data = extractDataRecord(recordingResult);
      const files = asRecordArray(data?.recording_files);
      recordingsScanned += files.length;
      recordingFiles.push(...files);
      lookupAttempts.push({
        meetingLookupId: lookupId,
        lookupType,
        ok: true,
        recordingCount: numberOrNull(data?.recording_count) ?? files.length,
        fileCount: files.length,
      });
    }

    const transcriptFiles = dedupeRecordingFiles(recordingFiles).filter((file) => isTranscriptFile(file));
    for (const transcript of transcriptFiles) {
      if (transcripts.length >= limit) break;
      const fileSummary = summarizeRecordingFile(transcript);
      const key = `${meetingSummary.id ?? meetingSummary.uuid ?? 'unknown'}::${fileSummary.id ?? fileSummary.downloadUrl ?? Math.random().toString(36).slice(2)}`;
      if (transcriptKeys.has(key)) continue;
      transcriptKeys.add(key);
      transcripts.push({
        meeting: meetingSummary,
        file: fileSummary,
      });
    }
  }

  const status = transcripts.length > 0 ? 'transcripts_found' : 'no_transcripts_found';
  const message = transcripts.length > 0
    ? `Found ${transcripts.length} transcript file(s).`
    : 'No transcript files found for the selected meetings.';

  return {
    toolkitSlug,
    entityId,
    composioUserId,
    connectedAccountId,
    connected: true,
    status,
    transcriptCount: transcripts.length,
    transcripts,
    query: {
      meetingId: requestedMeetingId,
      from,
      to,
      topicQuery,
      pageSize,
      maxMeetings,
      limit,
    },
    account: summarizeZoomUser(currentUser),
    meetingsScanned: meetingCandidates.length,
    recordingsScanned,
    lookupAttempts,
    message,
    warnings,
  };
}

async function executeToolkitToolByName(params: {
  client: ComposioClient;
  toolRoutes: ToolRoute[];
  toolName: string;
  args: Record<string, unknown>;
  entityId: string;
  connectedAccountId?: string | null;
}): Promise<Record<string, unknown>> {
  const { client, toolRoutes, toolName, args, entityId, connectedAccountId } = params;
  const route = toolRoutes.find((candidate) => candidate.toolName === toolName);
  if (!route) {
    throw new Error(`Required toolkit tool "${toolName}" is unavailable in this toolkit route.`);
  }

  if (connectedAccountId && connectedAccountId.trim().length > 0) {
    const result = await client.getSDK().tools.execute(route.composioToolSlug, {
      userId: entityId,
      connectedAccountId,
      arguments: args,
      dangerouslySkipVersionCheck: true,
    });
    if (result && typeof result === 'object') {
      return result as Record<string, unknown>;
    }
    return { result };
  }

  return client.executeTool(route.composioToolSlug, args, entityId);
}

async function markGmailMessagesReadByQuery(params: {
  client: ComposioClient;
  toolRoutes: ToolRoute[];
  entityId: string;
  args: Record<string, unknown>;
  toolkitSlug: string;
}): Promise<Record<string, unknown>> {
  const { client, toolRoutes, entityId, args, toolkitSlug } = params;
  const warnings: string[] = [];
  const query = stringOrNull(args.query) ?? DEFAULT_GMAIL_QUERY;
  const pageSize = numberArg(args.pageSize, DEFAULT_GMAIL_PAGE_SIZE, 1, 500);
  const batchSize = numberArg(args.batchSize, DEFAULT_GMAIL_BATCH_SIZE, 1, 1000);
  const maxMessages = numberArg(args.maxMessages, DEFAULT_GMAIL_MAX_MESSAGES, 1, 10000);
  const dryRun = booleanArg(args.dryRun, false);
  const connectedAccountId = stringOrNull(args.connectedAccountId);

  if (connectedAccountId) {
    await assertConnectedAccountOwnership({
      client,
      entityId,
      connectedAccountId,
      toolkitSlug,
    });
  } else {
    const activeConnections = await client.getConnectedAccountsForToolkit(entityId, toolkitSlug);
    const activeCount = activeConnections.filter((account) => account.status === 'active').length;
    if (activeCount > 1) {
      throw new Error(
        `Toolkit "${toolkitSlug}" has ${activeCount} active connections for entity "${entityId}". Pass connectedAccountId to disambiguate execution.`,
      );
    }
  }

  const connected = await client.hasActiveConnection(entityId, toolkitSlug).catch((error) => {
    warnings.push(`Connection check failed: ${toErrorMessage(error)}`);
    return false;
  });
  const bypassConnectionGate = Boolean(connectedAccountId && connectedAccountId.trim().length > 0);
  if (!connected && !bypassConnectionGate) {
    return {
      toolkitSlug,
      entityId,
      query,
      connected: false,
      updated: false,
      matchedMessageCount: 0,
      message:
        'Gmail is not connected for this entity. Call get_connect_link and authenticate the Gmail account you want to update.',
      warnings,
    };
  }

  const fetchRoute = findGmailFetchRoute(toolRoutes);
  const markReadRoute = findGmailMarkReadRoute(toolRoutes);
  if (!fetchRoute) {
    throw new Error(
      'Could not find a Gmail fetch/search route for this toolkit. Expected a route like gmail_fetch_emails.',
    );
  }
  if (!markReadRoute) {
    throw new Error(
      'Could not find a Gmail batch modify route for this toolkit. Expected a route that accepts message IDs plus removeLabelIds.',
    );
  }

  const collectedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenPageTokens = new Set<string>();
  let nextPageToken: string | null = null;
  let pagesFetched = 0;
  let fetchResultSizeEstimate: number | null = null;

  while (collectedIds.length < maxMessages) {
    const fetchArgs = buildGmailFetchArgs(fetchRoute, {
      query,
      pageSize,
      pageToken: nextPageToken,
    });
    const fetchResult = await executeToolkitToolByName({
      client,
      toolRoutes,
      toolName: fetchRoute.toolName,
      args: fetchArgs,
      entityId,
      connectedAccountId,
    });
    pagesFetched += 1;

    const pageIds = extractGmailMessageIds(fetchResult);
    for (const id of pageIds) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      collectedIds.push(id);
      if (collectedIds.length >= maxMessages) break;
    }

    fetchResultSizeEstimate ??= extractResultSizeEstimate(fetchResult);
    nextPageToken = extractNextPageToken(fetchResult);
    if (!nextPageToken) break;
    if (seenPageTokens.has(nextPageToken)) {
      warnings.push(`Stopping pagination after repeated page token "${nextPageToken}".`);
      break;
    }
    seenPageTokens.add(nextPageToken);
  }

  if (collectedIds.length === 0) {
    return {
      toolkitSlug,
      entityId,
      query,
      connected: true,
      fetchRoute: fetchRoute.toolName,
      updateRoute: markReadRoute.toolName,
      dryRun,
      pagesFetched,
      matchedMessageCount: 0,
      resultSizeEstimate: fetchResultSizeEstimate,
      message: 'No matching Gmail messages found for the query.',
      warnings,
    };
  }

  if (dryRun) {
    return {
      toolkitSlug,
      entityId,
      query,
      connected: true,
      fetchRoute: fetchRoute.toolName,
      updateRoute: markReadRoute.toolName,
      dryRun: true,
      pagesFetched,
      matchedMessageCount: collectedIds.length,
      resultSizeEstimate: fetchResultSizeEstimate,
      messageIds: collectedIds,
      message: `Found ${collectedIds.length} Gmail message(s) that would be marked read.`,
      warnings,
    };
  }

  const batches = chunkStrings(collectedIds, batchSize);
  const batchResults: Array<Record<string, unknown>> = [];
  for (const batch of batches) {
    const updateArgs = buildGmailMarkReadArgs(markReadRoute, batch);
    const batchResult = await executeToolkitToolByName({
      client,
      toolRoutes,
      toolName: markReadRoute.toolName,
      args: updateArgs,
      entityId,
      connectedAccountId,
    });
    batchResults.push({
      batchSize: batch.length,
      success: isExecutionSuccessful(batchResult),
      error: extractExecutionError(batchResult),
      data: extractDataRecord(batchResult) ?? batchResult,
    });
  }

  const failedBatches = batchResults.filter((result) => result.success !== true);
  return {
    toolkitSlug,
    entityId,
    query,
    connected: true,
    fetchRoute: fetchRoute.toolName,
    updateRoute: markReadRoute.toolName,
    dryRun: false,
    pagesFetched,
    matchedMessageCount: collectedIds.length,
    resultSizeEstimate: fetchResultSizeEstimate,
    batchCount: batches.length,
    updatedMessageCount: collectedIds.length,
    batches: batchResults,
    updated: failedBatches.length === 0,
    message:
      failedBatches.length === 0
        ? `Marked ${collectedIds.length} Gmail message(s) as read for query "${query}".`
        : `Attempted to mark ${collectedIds.length} Gmail message(s) as read, but ${failedBatches.length} batch(es) failed.`,
    warnings,
  };
}

function isExecutionSuccessful(result: Record<string, unknown>): boolean {
  const successful = result.successful;
  if (typeof successful === 'boolean') return successful;
  return result.error === null || result.error === undefined;
}

function extractDataRecord(result: Record<string, unknown>): Record<string, unknown> | null {
  const data = asRecord(result.data);
  if (data) return data;
  return asRecord(result);
}

function extractExecutionError(result: Record<string, unknown>): string | null {
  const error = result.error;
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }
  if (error !== null && error !== undefined) {
    return JSON.stringify(error);
  }
  const message = result.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return null;
}

function summarizeZoomUser(user: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!user) return null;
  const fallbackName = [stringOrNull(user.first_name), stringOrNull(user.last_name)]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();
  const displayName = stringOrNull(user.display_name) ?? (fallbackName || null);
  return {
    id: stringOrNull(user.id),
    email: stringOrNull(user.email),
    displayName,
    accountId: stringOrNull(user.account_id),
  };
}

function summarizeMeeting(meeting: Record<string, unknown>): Record<string, unknown> {
  return {
    id: stringOrNull(meeting.id) ?? stringOrNull(meeting.meeting_id),
    uuid: stringOrNull(meeting.uuid),
    topic: stringOrNull(meeting.topic),
    startTime: stringOrNull(meeting.start_time),
    timezone: stringOrNull(meeting.timezone),
    status: stringOrNull(meeting.status),
    hostId: stringOrNull(meeting.host_id),
  };
}

function summarizeRecordingFile(file: Record<string, unknown>): Record<string, unknown> {
  return {
    id: stringOrNull(file.id) ?? stringOrNull(file.recording_id),
    fileType: stringOrNull(file.file_type),
    recordingType: stringOrNull(file.recording_type),
    fileExtension: stringOrNull(file.file_extension),
    fileSize: numberOrNull(file.file_size),
    status: stringOrNull(file.status),
    downloadUrl: stringOrNull(file.download_url),
    playUrl: stringOrNull(file.play_url),
  };
}

function isTranscriptFile(file: Record<string, unknown>): boolean {
  const fileType = (stringOrNull(file.file_type) ?? '').toUpperCase();
  const recordingType = (stringOrNull(file.recording_type) ?? '').toLowerCase();
  const extension = (stringOrNull(file.file_extension) ?? '').toLowerCase();
  const filename = (stringOrNull(file.file_name) ?? '').toLowerCase();

  return (
    fileType === 'TRANSCRIPT' ||
    fileType === 'CC' ||
    extension === 'vtt' ||
    recordingType.includes('transcript') ||
    filename.includes('transcript') ||
    filename.endsWith('.vtt')
  );
}

function dedupeRecordingFiles(files: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const file of files) {
    const key =
      stringOrNull(file.id) ??
      stringOrNull(file.recording_id) ??
      stringOrNull(file.download_url) ??
      JSON.stringify(file);
    byKey.set(key, file);
  }
  return Array.from(byKey.values());
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeIsoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function findGmailFetchRoute(toolRoutes: ToolRoute[]): ToolRoute | null {
  const exactCandidates = [
    'gmail_fetch_emails',
    'gmail_fetch_messages',
    'gmail_list_emails',
    'gmail_list_messages',
    'gmail_search_emails',
    'gmail_search_messages',
  ];
  for (const candidate of exactCandidates) {
    const match = toolRoutes.find((route) => route.toolName === candidate);
    if (match) return match;
  }

  return toolRoutes.find((route) => {
    const name = route.toolName;
    if (!name.startsWith('gmail_')) return false;
    if (!/(fetch|list|search)/.test(name)) return false;
    if (!/(emails|messages)/.test(name)) return false;
    const properties = getRouteProperties(route);
    return hasAnyProperty(properties, ['query', 'q']);
  }) ?? null;
}

function findGmailMarkReadRoute(toolRoutes: ToolRoute[]): ToolRoute | null {
  const exactCandidates = [
    'gmail_batch_modify_emails',
    'gmail_batch_modify_messages',
    'gmail_batch_update_emails',
    'gmail_batch_update_messages',
    'gmail_modify_email_labels',
    'gmail_modify_message_labels',
  ];
  for (const candidate of exactCandidates) {
    const match = toolRoutes.find((route) => route.toolName === candidate);
    if (match) return match;
  }

  return toolRoutes.find((route) => {
    const name = route.toolName;
    if (!name.startsWith('gmail_')) return false;
    if (!/(batch|modify|update)/.test(name)) return false;
    if (!/(emails|messages|labels)/.test(name)) return false;
    const properties = getRouteProperties(route);
    return (
      hasAnyProperty(properties, ['messageIds', 'message_ids', 'ids', 'emailIds', 'email_ids']) &&
      hasAnyProperty(properties, ['removeLabelIds', 'remove_label_ids', 'labelsToRemove', 'labels_to_remove'])
    );
  }) ?? null;
}

function buildGmailFetchArgs(
  route: ToolRoute,
  options: { query: string; pageSize: number; pageToken: string | null },
): Record<string, unknown> {
  const properties = getRouteProperties(route);
  const args: Record<string, unknown> = {};
  assignFirstKnownProperty(args, properties, ['query', 'q'], options.query);
  assignFirstKnownProperty(args, properties, ['maxResults', 'max_results', 'limit', 'pageSize', 'page_size'], options.pageSize);
  if (options.pageToken) {
    assignFirstKnownProperty(args, properties, ['pageToken', 'page_token', 'cursor', 'nextPageToken'], options.pageToken);
  }
  return args;
}

function buildGmailMarkReadArgs(route: ToolRoute, messageIds: string[]): Record<string, unknown> {
  const properties = getRouteProperties(route);
  const args: Record<string, unknown> = {};

  if (
    !assignFirstKnownProperty(
      args,
      properties,
      ['messageIds', 'message_ids', 'ids', 'emailIds', 'email_ids'],
      messageIds,
    )
  ) {
    throw new Error(`Gmail update route "${route.toolName}" does not expose a message ID array field.`);
  }

  if (
    !assignFirstKnownProperty(
      args,
      properties,
      ['removeLabelIds', 'remove_label_ids', 'labelsToRemove', 'labels_to_remove'],
      ['UNREAD'],
    )
  ) {
    throw new Error(`Gmail update route "${route.toolName}" does not expose a remove-label field.`);
  }

  assignFirstKnownProperty(args, properties, ['addLabelIds', 'add_label_ids', 'labelsToAdd', 'labels_to_add'], []);
  return args;
}

function extractGmailMessageIds(result: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  const visit = (value: unknown, depth: number): void => {
    if (depth > 4 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }

    const record = asRecord(value);
    if (!record) return;

    const directId = stringOrNull(record.messageId) ?? stringOrNull(record.id);
    if (directId && !seen.has(directId)) {
      seen.add(directId);
      ids.push(directId);
    }

    for (const key of ['messages', 'emails', 'items', 'results', 'data']) {
      if (key in record) visit(record[key], depth + 1);
    }
  };

  visit(result, 0);
  return ids;
}

function extractNextPageToken(result: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    result.nextPageToken,
    result.next_page_token,
    asRecord(result.data)?.nextPageToken,
    asRecord(result.data)?.next_page_token,
    asRecord(result.meta)?.nextPageToken,
    asRecord(result.meta)?.next_page_token,
  ];
  for (const candidate of candidates) {
    const token = stringOrNull(candidate);
    if (token) return token;
  }
  return null;
}

function extractResultSizeEstimate(result: Record<string, unknown>): number | null {
  const candidates: unknown[] = [
    result.resultSizeEstimate,
    result.result_size_estimate,
    asRecord(result.data)?.resultSizeEstimate,
    asRecord(result.data)?.result_size_estimate,
    asRecord(result.meta)?.resultSizeEstimate,
    asRecord(result.meta)?.result_size_estimate,
  ];
  for (const candidate of candidates) {
    const count = numberOrNull(candidate);
    if (count !== null) return count;
  }
  return null;
}

function chunkStrings(values: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function getRouteProperties(route: ToolRoute): Record<string, unknown> {
  return asRecord(route.inputSchema.properties) ?? {};
}

function hasAnyProperty(properties: Record<string, unknown>, candidates: string[]): boolean {
  return candidates.some((candidate) => candidate in properties);
}

function assignFirstKnownProperty(
  target: Record<string, unknown>,
  properties: Record<string, unknown>,
  candidates: string[],
  value: unknown,
): boolean {
  for (const candidate of candidates) {
    if (!(candidate in properties)) continue;
    target[candidate] = value;
    return true;
  }
  return false;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
        properties: {
          ...(tool.parameters.properties ?? {}),
          connectedAccountId: {
            type: 'string',
            description:
              'Optional Composio connected account ID. Use this when multiple active connections exist for the same toolkit/entity.',
          },
        },
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

function numberArg(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function booleanArg(raw: unknown, fallback: boolean): boolean {
  if (typeof raw !== 'boolean') {
    return fallback;
  }
  return raw;
}

function resolveEntityId(extra: unknown, request: Request, env: Env): string {
  const requestInfo = asRecord(extra)?.requestInfo;
  const mode = resolveEntityResolutionMode(env);

  const fromHeader =
    getHeaderValue(requestInfo, 'x-mcp-account-id') ??
    request.headers.get('x-mcp-account-id') ??
    getHeaderValue(requestInfo, 'x-account-id') ??
    request.headers.get('x-account-id');

  if (fromHeader && fromHeader.trim()) {
    return fromHeader.trim();
  }

  if (mode === 'header_required') {
    throw new Error(
      'Missing x-mcp-account-id header. Set COMPOSIO_ENTITY_RESOLUTION_MODE=compat to allow legacy bearer/default fallback.',
    );
  }

  const authorization =
    getHeaderValue(requestInfo, 'authorization') ?? request.headers.get('authorization');
  const bearer = authorization ? parseBearerToken(authorization) : null;
  if (bearer) return bearer;

  return env.COMPOSIO_DEFAULT_ENTITY_ID?.trim() || 'default';
}

function resolveEntityResolutionMode(env: Env): EntityResolutionMode {
  const raw = env.COMPOSIO_ENTITY_RESOLUTION_MODE?.trim().toLowerCase();
  if (raw === 'compat') {
    return 'compat';
  }
  return 'header_required';
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

async function assertConnectedAccountOwnership(params: {
  client: ComposioClient;
  entityId: string;
  connectedAccountId: string;
  toolkitSlug?: string;
}): Promise<void> {
  const { client, entityId, connectedAccountId, toolkitSlug } = params;
  const accounts = await client.getConnectedAccounts(entityId);
  const normalizedId = connectedAccountId.trim();
  const match = accounts.find((account) => account.connectionId === normalizedId);
  if (!match) {
    throw new Error(
      `connectedAccountId "${normalizedId}" does not belong to Composio user "${entityId}".`,
    );
  }
  if (toolkitSlug && match.app.toLowerCase() !== toolkitSlug.toLowerCase()) {
    throw new Error(
      `connectedAccountId "${normalizedId}" belongs to toolkit "${match.app}", expected "${toolkitSlug}".`,
    );
  }
  if (match.status !== 'active') {
    throw new Error(
      `connectedAccountId "${normalizedId}" is "${match.status}" for Composio user "${entityId}". Pass an active connection ID.`,
    );
  }
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function stripConnectedAccountArg(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === 'connectedAccountId') continue;
    out[key] = value;
  }
  return out;
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

function buildAuthConfigMap(env: Env): Record<string, string> {
  const authConfigMap = parseAuthConfigMap(env.COMPOSIO_AUTH_CONFIG_MAP);
  const airtableAuthConfigId = env.COMPOSIO_AIRTABLE_AUTH_CONFIG_ID?.trim();
  if (airtableAuthConfigId) {
    authConfigMap.airtable = airtableAuthConfigId;
  }
  const quickbooksAuthConfigId = env.COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID?.trim();
  if (quickbooksAuthConfigId) {
    authConfigMap.quickbooks = quickbooksAuthConfigId;
  }
  return authConfigMap;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

function getLangfuseLogger(env: Env): Langfuse | null {
  const publicKey = env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) return null;

  const projectName = resolveLangfuseProjectName(env);
  const host = env.LANGFUSE_HOST?.trim() || env.LANGFUSE_BASE_URL?.trim() || 'https://us.cloud.langfuse.com';
  const nextKey = `${publicKey}::${secretKey}::${host}::${projectName}`;

  if (!langfuseClient || langfuseLoggerKey !== nextKey) {
    langfuseClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
      flushAt: 1,
      flushInterval: 250,
    });
    langfuseLoggerKey = nextKey;
  }

  return langfuseClient;
}

async function emitLangfuseInvocation(
  client: Langfuse,
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
    correlationId?: string | null;
    requestId?: string | null;
  },
): Promise<void> {
  const metadata = {
    server: args.serverName,
    toolkit: args.toolkitSlug,
    tool: args.toolName,
    composioToolSlug: args.composioToolSlug,
    accountId: args.accountId,
    durationMs: args.durationMs,
    success: args.success,
    error: args.error,
    correlationId: args.correlationId ?? null,
    requestId: args.requestId ?? null,
  };
  const trace = client.trace({
    name: `mcp:${args.serverName}:${args.toolName}`,
    userId: args.accountId,
    input: args.input,
    output: args.output,
    metadata,
    tags: ['mcp', SERVER_NAME, args.toolkitSlug, args.toolName],
  });
  trace
    .span({
      name: `execute:${args.toolName}`,
      input: args.input,
      output: args.output,
      metadata,
      level: args.success ? 'DEFAULT' : 'ERROR',
      statusMessage: args.error,
    })
    .end();
  await client.flushAsync();
}

function resolveInvocationTraceContext(extra: unknown, request: Request): {
  correlationId: string | null;
  requestId: string | null;
} {
  const requestInfo = asRecord(extra)?.requestInfo;
  return {
    correlationId:
      getHeaderValue(requestInfo, 'x-correlation-id') ??
      request.headers.get('x-correlation-id'),
    requestId:
      getHeaderValue(requestInfo, 'x-request-id') ??
      request.headers.get('x-request-id'),
  };
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
