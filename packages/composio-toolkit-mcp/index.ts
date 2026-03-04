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
const ZOOM_TRANSCRIPT_STATUS_TOOL = 'zoom_latest_transcript_status';
const DEFAULT_ZOOM_LOOKBACK_DAYS = 7;
const ZOOM_TOOL_NAMES = {
  getCurrentUser: 'zoom_get_current_user',
  listMeetings: 'zoom_list_meetings',
  getMeetingRecordings: 'zoom_get_meeting_recordings',
} as const;

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

  const connected = await client.hasActiveConnection(composioUserId, toolkitSlug).catch((error) => {
    warnings.push(`Connection check failed: ${toErrorMessage(error)}`);
    return false;
  });

  if (!connected) {
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
    entityId,
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
      entityId,
    }).catch((error) => {
      warnings.push(`Failed to list previous Zoom meetings: ${toErrorMessage(error)}`);
      return null;
    });

    if (!listMeetingsResult) {
      return {
        toolkitSlug,
        entityId,
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
      entityId,
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
