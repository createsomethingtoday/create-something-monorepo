import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import {
  createRuntimeDependencies,
  mergeRecentPlaylistState,
  registerPrompts,
  registerResources,
  registerTools,
  resolveRuntimeConfig,
  SERVER_NAME,
  SERVER_VERSION,
} from '../src/index.js';
import {
  resolveBraintrustProjectName,
  type PackageEnv,
} from '../src/config.js';
import type {
  PlaylistStateStore,
  PlaylistSyncLease,
  PlaylistSyncStateSnapshot,
} from '../src/types.js';

interface Env extends PackageEnv {
  MCP_OBJECT: DurableObjectNamespace;
  PLAYLIST_SYNC_STATE: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEmptyPlaylistState(playlistId: string): PlaylistSyncStateSnapshot {
  return {
    playlistId,
    recentItemKeys: [],
    recentVideoIds: [],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export class YouTubePlaylistSyncState {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  private async readSnapshot(): Promise<PlaylistSyncStateSnapshot> {
    const stored = await this.state.storage.get<PlaylistSyncStateSnapshot>('state');
    return stored ?? createEmptyPlaylistState(this.state.id.toString());
  }

  private async writeSnapshot(snapshot: PlaylistSyncStateSnapshot): Promise<void> {
    await this.state.storage.put('state', snapshot);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const requestBody =
      request.method === 'POST'
        ? ((await request.json()) as Record<string, unknown>)
        : undefined;
    const requestedPlaylistId =
      url.searchParams.get('playlistId') ??
      (requestBody && typeof requestBody.playlistId === 'string'
        ? requestBody.playlistId
        : undefined) ??
      undefined;
    const stored = await this.readSnapshot();
    const current = stored.playlistId
      ? stored
      : createEmptyPlaylistState(requestedPlaylistId ?? 'unknown-playlist');

    if (request.method === 'GET' && url.pathname === '/state') {
      return jsonResponse(current);
    }
    const body = requestBody;

    if (request.method === 'POST' && url.pathname === '/acquire') {
      const now =
        typeof body?.now === 'string' ? body.now : new Date().toISOString();
      const runId = typeof body?.runId === 'string' ? body.runId : '';
      const source = typeof body?.source === 'string' ? body.source : 'worker';
      const leaseMs =
        typeof body?.leaseMs === 'number' ? body.leaseMs : 600_000;
      const activeRun = current.activeRun;
      if (activeRun && new Date(activeRun.leaseExpiresAt).getTime() > Date.parse(now)) {
        const result: PlaylistSyncLease = {
          acquired: false,
          state: clone(current),
          activeRun: clone(activeRun),
        };
        return jsonResponse(result);
      }

      const nextState: PlaylistSyncStateSnapshot = {
        ...current,
        lastAttemptAt: now,
        activeRun: {
          runId,
          source,
          startedAt: now,
          leaseExpiresAt: new Date(Date.parse(now) + leaseMs).toISOString(),
        },
      };
      await this.writeSnapshot(nextState);
      return jsonResponse({
        acquired: true,
        state: nextState,
        activeRun: nextState.activeRun,
      } satisfies PlaylistSyncLease);
    }

    if (request.method === 'POST' && url.pathname === '/complete') {
      const now =
        typeof body?.now === 'string' ? body.now : new Date().toISOString();
      const runId = typeof body?.runId === 'string' ? body.runId : '';
      const recentItemKeys = Array.isArray(body?.recentItemKeys)
        ? body.recentItemKeys.filter((value): value is string => typeof value === 'string')
        : [];
      const recentVideoIds = Array.isArray(body?.recentVideoIds)
        ? body.recentVideoIds.filter((value): value is string => typeof value === 'string')
        : [];
      const processedAt =
        typeof body?.processedAt === 'string' ? body.processedAt : undefined;
      const summary =
        body?.summary && typeof body.summary === 'object'
          ? (body.summary as {
              created: number;
              updated: number;
              skipped: number;
              failed: number;
              cutoffApplied: boolean;
            })
          : {
              created: 0,
              updated: 0,
              skipped: 0,
              failed: 0,
              cutoffApplied: false,
            };
      const nextState = mergeRecentPlaylistState(
        {
          ...current,
          lastRunAt: now,
          lastAttemptAt: now,
        },
        {
          recentItemKeys,
          recentVideoIds,
          processedAt,
          summary,
          lastError: undefined,
          activeRun: current.activeRun?.runId === runId ? undefined : current.activeRun,
          now,
        },
      );
      await this.writeSnapshot(nextState);
      return jsonResponse(nextState);
    }

    if (request.method === 'POST' && url.pathname === '/fail') {
      const now =
        typeof body?.now === 'string' ? body.now : new Date().toISOString();
      const runId = typeof body?.runId === 'string' ? body.runId : '';
      const errorCode =
        body?.error &&
        typeof body.error === 'object' &&
        typeof (body.error as Record<string, unknown>).code === 'string'
          ? ((body.error as Record<string, unknown>).code as string)
          : 'PLAYLIST_SYNC_FAILED';
      const errorMessage =
        body?.error &&
        typeof body.error === 'object' &&
        typeof (body.error as Record<string, unknown>).message === 'string'
          ? ((body.error as Record<string, unknown>).message as string)
          : 'Playlist sync failed.';
      const nextState: PlaylistSyncStateSnapshot = {
        ...current,
        lastRunAt: now,
        lastAttemptAt: now,
        lastError: {
          code: errorCode,
          message: errorMessage,
          at: now,
        },
        activeRun: current.activeRun?.runId === runId ? undefined : current.activeRun,
      };
      await this.writeSnapshot(nextState);
      return jsonResponse(nextState);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
}

class DurableObjectPlaylistStateStore implements PlaylistStateStore {
  constructor(private readonly namespace: DurableObjectNamespace) {}

  private stub(playlistId: string): DurableObjectStub {
    return this.namespace.get(this.namespace.idFromName(playlistId));
  }

  private async request<T>(
    playlistId: string,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await this.stub(playlistId).fetch(
      `https://playlist-state${path}`,
      init,
    );
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T);
    if (!response.ok) {
      throw new Error(
        typeof (payload as { error?: string }).error === 'string'
          ? (payload as { error?: string }).error
          : `Playlist state request failed with status ${response.status}.`,
      );
    }
    return payload as T;
  }

  async getState(playlistId: string): Promise<PlaylistSyncStateSnapshot> {
    return this.request<PlaylistSyncStateSnapshot>(
      playlistId,
      `/state?playlistId=${encodeURIComponent(playlistId)}`,
    );
  }

  async acquireLease(
    playlistId: string,
    input: {
      runId: string;
      source: string;
      leaseMs: number;
      now?: string;
    },
  ): Promise<PlaylistSyncLease> {
    return this.request<PlaylistSyncLease>(playlistId, '/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        playlistId,
      }),
    });
  }

  async completeRun(
    playlistId: string,
    input: {
      runId: string;
      recentItemKeys: string[];
      recentVideoIds: string[];
      processedAt?: string;
      summary: {
        created: number;
        updated: number;
        skipped: number;
        failed: number;
        cutoffApplied: boolean;
      };
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot> {
    return this.request<PlaylistSyncStateSnapshot>(playlistId, '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        playlistId,
      }),
    });
  }

  async failRun(
    playlistId: string,
    input: {
      runId: string;
      error: {
        code: string;
        message: string;
      };
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot> {
    return this.request<PlaylistSyncStateSnapshot>(playlistId, '/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        playlistId,
      }),
    });
  }
}

function createWorkerRuntimeDependencies(env: Env) {
  return createRuntimeDependencies(env, {
    playlistStateStore: new DurableObjectPlaylistStateStore(env.PLAYLIST_SYNC_STATE),
    playlistStateStoreKind: 'durable-object',
  });
}

export class YouTubeTranscriptNotionMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, SERVER_NAME, undefined, {
        apiKey: this.env.BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
        projectId: this.env.BRAINTRUST_PROJECT_ID,
      });
    }

    const runtime = createWorkerRuntimeDependencies(this.env);
    registerResources(this.server, runtime);
    registerTools(this.server, runtime);
    registerPrompts(this.server);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.MCP_BEARER_TOKEN?.trim()) {
    return true;
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] === env.MCP_BEARER_TOKEN;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }, null, 2), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="mcp"',
      ...CORS_HEADERS,
    },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const runtimeConfig = resolveRuntimeConfig(env);

    if (request.method === 'OPTIONS') {
      return preflight();
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!isAuthorized(request, env)) {
        return unauthorized();
      }
      return withCors(
        await YouTubeTranscriptNotionMCP.serve('/mcp').fetch(request, env, ctx),
      );
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!isAuthorized(request, env)) {
        return unauthorized();
      }
      return withCors(
        await YouTubeTranscriptNotionMCP.serve('/sse').fetch(request, env, ctx),
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const runtime = createWorkerRuntimeDependencies(env);
      const playlist = await runtime.playlistService.getStatus();
      return json({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        displayName: runtimeConfig.displayName,
        description: runtimeConfig.description,
        directProviderMode: runtimeConfig.directProviderMode,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
        },
        capabilities: {
          supadataConfigured: Boolean(env.SUPADATA_API_KEY),
          directTranscript: true,
          browserFallbackConfigured: Boolean(env.STEEL_API_KEY),
          notionConfigured: Boolean(env.NOTION_API_KEY),
          playlistListingConfigured: Boolean(env.YOUTUBE_DATA_API_KEY),
          scheduledPlaylistConfigured: Boolean(
            runtimeConfig.playlist.defaultPlaylistId &&
              (runtimeConfig.playlist.defaultPlaylistDatabaseId || runtimeConfig.defaultDatabaseId),
          ),
          defaultDatabaseConfigured: Boolean(runtimeConfig.defaultDatabaseId),
          bearerProtectionEnabled: runtimeConfig.security.bearerProtectionEnabled,
        },
        security: runtime.serverInfo.security,
        transcript: runtime.transcriptService.getStatus(),
        notion: runtime.notionService.getStatus(),
        playlist,
        configWarnings: runtimeConfig.configWarnings,
      });
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const runtimeConfig = resolveRuntimeConfig(env);
    if (!runtimeConfig.playlist.defaultPlaylistId) {
      console.log('[youtube-transcript-notion-mcp] scheduled sync skipped: no default playlist configured');
      return;
    }

    if (!env.YOUTUBE_DATA_API_KEY?.trim()) {
      console.log('[youtube-transcript-notion-mcp] scheduled sync skipped: YOUTUBE_DATA_API_KEY is not configured');
      return;
    }

    const runtime = createWorkerRuntimeDependencies(env);

    try {
      const result = await runtime.playlistService.syncPlaylist({
        playlistId: runtimeConfig.playlist.defaultPlaylistId,
        maxItems: runtimeConfig.playlist.maxSyncItems,
        maxScanItems: runtimeConfig.playlist.maxScanItems,
        automation: true,
      });
      console.log(
        `[youtube-transcript-notion-mcp] scheduled playlist sync completed for ${result.playlistId}: created=${result.created} updated=${result.updated} failed=${result.failed}`,
      );
    } catch (error) {
      console.error(
        `[youtube-transcript-notion-mcp] scheduled playlist sync failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
};
