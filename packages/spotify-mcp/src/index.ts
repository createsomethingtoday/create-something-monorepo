import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { jsonContent } from '@create-something/mcp-core';
import { z } from 'zod';
import type { ZodRawShape } from 'zod';

export const SERVER_NAME = 'spotify-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_RAPIDAPI_HOST = 'spotify81.p.rapidapi.com';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024;

export interface SpotifyProviderConfig {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface SpotifyServerOptions {
  getProviderConfig: () => SpotifyProviderConfig;
}

type HttpMethod = 'GET' | 'POST';

interface SpotifyToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  method?: HttpMethod;
  params: string[];
  paramAliases?: Record<string, string>;
  arrayBodyParams?: string[];
  schema: ZodRawShape;
  redactLyrics?: boolean;
}

interface ProviderRequest {
  tool: SpotifyToolDefinition;
  input: Record<string, unknown>;
  endpoint: string;
  method: HttpMethod;
  params: Record<string, string>;
  correlationId: string;
}

interface ProviderStatus {
  rapidapi_key_configured: boolean;
  rapidapi_host: string;
  base_url: string;
  timeout_ms: number;
  max_response_bytes: number;
}

const INTERNAL_ENDPOINT_DESCRIPTION =
  'Internal migration override. Use only for a known RapidAPI Spotify relative path such as /search.';

const INTERNAL_METHOD_DESCRIPTION =
  'Internal migration override. Defaults to GET; use POST only for a confirmed upstream RapidAPI endpoint.';

function requiredStringParam(description: string) {
  return z
    .preprocess((value) => (value === null || value === undefined ? '' : value), z.string().trim().min(1))
    .describe(description);
}

function optionalStringParam(description: string) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.string().trim().optional(),
    )
    .describe(description);
}

function optionalIntParam(description: string, min: number, max: number) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.coerce.number().int().min(min).max(max).optional(),
    )
    .describe(description);
}

function optionalMethodParam() {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : String(value).toUpperCase()),
      z.enum(['GET', 'POST']).optional(),
    )
    .describe(INTERNAL_METHOD_DESCRIPTION);
}

function withOverrides(schema: ZodRawShape): ZodRawShape {
  return {
    ...schema,
    _endpoint: optionalStringParam(INTERNAL_ENDPOINT_DESCRIPTION),
    _method: optionalMethodParam(),
  };
}

const idSchema = (description = 'Spotify ID or URI.') =>
  withOverrides({
    id: requiredStringParam(description),
  });

const idsSchema = (description = 'Comma-separated Spotify IDs.') =>
  withOverrides({
    ids: requiredStringParam(description),
  });

const paginatedIdSchema = (description = 'Spotify ID or URI.') =>
  withOverrides({
    id: requiredStringParam(description),
    limit: optionalIntParam('Maximum number of items to return.', 1, 100),
    offset: optionalIntParam('Zero-based result offset.', 0, 10_000),
  });

export const SPOTIFY_TOOLS: SpotifyToolDefinition[] = [
  {
    name: 'Artist_discography_overview',
    description: 'Read a Spotify artist discography overview from RapidAPI.',
    endpoint: '/artist_discography_overview',
    params: ['id'],
    schema: idSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Track_lyrics',
    description: 'Read lyric availability and redacted lyric metadata for a Spotify track from RapidAPI.',
    endpoint: '/track_lyrics',
    params: ['id'],
    schema: idSchema('Spotify track ID or URI.'),
    redactLyrics: true,
  },
  {
    name: 'Genre_View',
    description: 'Read Spotify genre metadata from RapidAPI.',
    endpoint: '/browse/categories/{id}',
    params: ['id'],
    schema: idSchema('Spotify genre ID, URI, or slug.'),
  },
  {
    name: 'Get_playlist',
    description: 'Read Spotify playlist metadata from RapidAPI.',
    endpoint: '/playlist',
    params: ['id'],
    schema: idSchema('Spotify playlist ID or URI.'),
  },
  {
    name: 'Get_radio_playlist',
    description: 'Read a Spotify radio playlist for an entity URI from RapidAPI.',
    endpoint: '/seed_to_playlist',
    method: 'POST',
    params: ['uri'],
    paramAliases: { uri: 'seeds' },
    arrayBodyParams: ['seeds'],
    schema: withOverrides({
      uri: requiredStringParam('Spotify entity URI used to seed the radio playlist.'),
    }),
  },
  {
    name: 'Artist_appears_on',
    description: 'Read albums and compilations where a Spotify artist appears from RapidAPI.',
    endpoint: '/artist_appears_on',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Get_tracks',
    description: 'Read multiple Spotify tracks by ID from RapidAPI.',
    endpoint: '/tracks',
    params: ['ids'],
    paramAliases: { ids: 'id' },
    schema: idsSchema('Comma-separated Spotify track IDs.'),
  },
  {
    name: 'Get_albums',
    description: 'Read multiple Spotify albums by ID from RapidAPI.',
    endpoint: '/albums',
    params: ['ids'],
    paramAliases: { ids: 'id' },
    schema: idsSchema('Comma-separated Spotify album IDs.'),
  },
  {
    name: 'Get_artists',
    description: 'Read multiple Spotify artists by ID from RapidAPI.',
    endpoint: '/artists',
    params: ['ids'],
    paramAliases: { ids: 'id' },
    schema: idsSchema('Comma-separated Spotify artist IDs.'),
  },
  {
    name: 'Get_Episode',
    description: 'Read Spotify podcast episode metadata from RapidAPI.',
    endpoint: '/episodes/{id}',
    params: ['id'],
    schema: idSchema('Spotify episode ID or URI.'),
  },
  {
    name: 'User_followers',
    description: 'Read Spotify user follower data from RapidAPI.',
    endpoint: '/user_followers',
    params: ['id'],
    schema: idSchema('Spotify user ID.'),
  },
  {
    name: 'Artist_related',
    description: 'Read related artists for a Spotify artist from RapidAPI.',
    endpoint: '/artist_related',
    params: ['id'],
    schema: idSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'User_profile',
    description: 'Read Spotify user profile metadata from RapidAPI.',
    endpoint: '/user_profile',
    params: ['id'],
    schema: idSchema('Spotify user ID.'),
  },
  {
    name: 'Playlist_tracks',
    description: 'Read tracks in a Spotify playlist from RapidAPI.',
    endpoint: '/playlist_tracks',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify playlist ID or URI.'),
  },
  {
    name: 'Artist_singles',
    description: 'Read Spotify artist singles from RapidAPI.',
    endpoint: '/artist_singles',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Explore',
    description: 'Read Spotify explore/browse data from RapidAPI.',
    endpoint: '/browse/categories',
    params: ['gl', 'limit', 'offset'],
    paramAliases: { gl: 'country' },
    schema: withOverrides({
      gl: optionalStringParam('Two-letter market code, such as US.'),
      limit: optionalIntParam('Maximum number of items to return.', 1, 100),
      offset: optionalIntParam('Zero-based result offset.', 0, 10_000),
    }),
  },
  {
    name: 'Album_tracks',
    description: 'Read tracks in a Spotify album from RapidAPI.',
    endpoint: '/album_tracks',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify album ID or URI.'),
  },
  {
    name: 'Track_recommendations',
    description: 'Read Spotify track recommendations from RapidAPI.',
    endpoint: '/recommendations',
    params: ['limit', 'seed_artists', 'seed_genres', 'seed_tracks'],
    schema: withOverrides({
      limit: optionalIntParam('Maximum number of recommendations to return.', 1, 100),
      seed_artists: optionalStringParam('Comma-separated Spotify artist IDs.'),
      seed_genres: optionalStringParam('Comma-separated Spotify genre seeds.'),
      seed_tracks: optionalStringParam('Comma-separated Spotify track IDs.'),
    }),
  },
  {
    name: 'Search',
    description: 'Search Spotify catalog entities through RapidAPI.',
    endpoint: '/search',
    params: ['q', 'type', 'gl', 'limit', 'numberOfTopResults', 'offset'],
    paramAliases: { gl: 'market' },
    schema: withOverrides({
      q: requiredStringParam('Search query.'),
      type: optionalStringParam('Spotify search type, such as artists, albums, tracks, playlists, or episodes.'),
      gl: optionalStringParam('Two-letter market code, such as US.'),
      limit: optionalIntParam('Maximum number of results to return.', 1, 50),
      numberOfTopResults: optionalIntParam('Number of top results to include when supported by the provider.', 1, 10),
      offset: optionalIntParam('Zero-based result offset.', 0, 10_000),
    }),
  },
  {
    name: 'Get_Concert',
    description: 'Read Spotify concert metadata from RapidAPI.',
    endpoint: '/partner/concert',
    params: ['id'],
    schema: idSchema('Spotify concert ID.'),
  },
  {
    name: 'Album_metadata',
    description: 'Read Spotify album metadata from RapidAPI.',
    endpoint: '/album_metadata',
    params: ['id'],
    schema: idSchema('Spotify album ID or URI.'),
  },
  {
    name: 'Artist_albums',
    description: 'Read Spotify artist albums from RapidAPI.',
    endpoint: '/artist_albums',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Artist_overview',
    description: 'Read Spotify artist overview metrics from RapidAPI.',
    endpoint: '/artist_overview',
    params: ['id'],
    schema: idSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Track_credits',
    description: 'Read Spotify track credits from RapidAPI.',
    endpoint: '/track_credits',
    params: ['id'],
    schema: idSchema('Spotify track ID or URI.'),
  },
  {
    name: 'Concerts',
    description: 'Read Spotify concerts for a market from RapidAPI.',
    endpoint: '/partner/concert-locations',
    params: ['gl'],
    paramAliases: { gl: 'country' },
    schema: withOverrides({
      gl: optionalStringParam('Two-letter market code, such as US.'),
    }),
  },
  {
    name: 'Podcast_Episodes',
    description: 'Read Spotify podcast episodes from RapidAPI.',
    endpoint: '/shows/{id}/episodes',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify podcast or show ID or URI.'),
  },
  {
    name: 'Episode_Sound',
    description: 'Read Spotify episode audio metadata from RapidAPI.',
    endpoint: '/episodes/{id}',
    params: ['id'],
    schema: idSchema('Spotify episode ID or URI.'),
  },
  {
    name: 'Artist_featuring',
    description: 'Read Spotify releases where an artist is featured from RapidAPI.',
    endpoint: '/artist_featuring',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify artist ID or URI.'),
  },
  {
    name: 'Artist_discovered_on',
    description: 'Read playlists or sources where a Spotify artist is discovered from RapidAPI.',
    endpoint: '/artist_discovered_on',
    params: ['id', 'limit', 'offset'],
    schema: paginatedIdSchema('Spotify artist ID or URI.'),
  },
];

export function listSpotifyToolNames(): string[] {
  return SPOTIFY_TOOLS.map((tool) => tool.name);
}

export function createSpotifyServer(options: SpotifyServerOptions): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerSpotifyTools(server, options);
  return server;
}

export function registerSpotifyTools(server: McpServer, options: SpotifyServerOptions): void {
  for (const tool of SPOTIFY_TOOLS) {
    server.tool(tool.name, tool.description, tool.schema, async (input) => {
      const normalizedInput = normalizeInput(input);
      const request = prepareProviderRequest(tool, normalizedInput);
      return callRapidApi(request, options.getProviderConfig());
    });
  }
}

export function getSpotifyProviderStatus(config: SpotifyProviderConfig): ProviderStatus {
  const resolved = resolveProviderConfig(config);
  return {
    rapidapi_key_configured: Boolean(resolved.apiKey),
    rapidapi_host: resolved.host,
    base_url: resolved.baseUrl,
    timeout_ms: resolved.timeoutMs,
    max_response_bytes: resolved.maxResponseBytes,
  };
}

function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function prepareProviderRequest(tool: SpotifyToolDefinition, input: Record<string, unknown>): ProviderRequest {
  const endpoint = normalizeEndpoint(readOptionalString(input._endpoint) ?? tool.endpoint);
  const method = readHttpMethod(input._method) ?? tool.method ?? 'GET';
  const params = pickProviderParams(input, tool.params, tool.paramAliases);

  return {
    tool,
    input,
    endpoint,
    method,
    params,
    correlationId: crypto.randomUUID(),
  };
}

function resolveProviderConfig(config: SpotifyProviderConfig): Required<SpotifyProviderConfig> {
  const host = normalizeHost(config.host) ?? DEFAULT_RAPIDAPI_HOST;
  const baseUrl = normalizeBaseUrl(config.baseUrl) ?? `https://${host}`;

  return {
    apiKey: config.apiKey?.trim() ?? '',
    host,
    baseUrl,
    timeoutMs: config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxResponseBytes:
      config.maxResponseBytes && config.maxResponseBytes > 0 ? config.maxResponseBytes : DEFAULT_MAX_RESPONSE_BYTES,
  };
}

function normalizeHost(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (url.protocol !== 'https:') {
    throw new Error('SPOTIFY_RAPIDAPI_BASE_URL must use https.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    throw new Error('_endpoint must be a relative RapidAPI path beginning with /.');
  }
  return trimmed;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readHttpMethod(value: unknown): HttpMethod | null {
  const normalized = readOptionalString(value)?.toUpperCase();
  return normalized === 'GET' || normalized === 'POST' ? normalized : null;
}

function pickProviderParams(
  input: Record<string, unknown>,
  names: string[],
  aliases: Record<string, string> = {},
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const name of names) {
    const value = input[name];
    const normalized = stringifyProviderParam(value);
    if (normalized !== null) {
      params[aliases[name] ?? name] = normalized;
    }
  }

  return params;
}

function stringifyProviderParam(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => stringifyProviderParam(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join(',');
    return joined.length > 0 ? joined : null;
  }
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

async function callRapidApi(request: ProviderRequest, config: SpotifyProviderConfig): Promise<CallToolResult> {
  let provider: Required<SpotifyProviderConfig>;

  try {
    provider = resolveProviderConfig(config);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!provider.apiKey) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: 'SPOTIFY_RAPIDAPI_KEY or RAPIDAPI_KEY is not configured.',
    });
  }

  let url: string;
  try {
    url = buildProviderUrl(provider.baseUrl, request.endpoint, request.method === 'GET' ? request.params : {});
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const headers = new Headers({
    Accept: 'application/json',
    'X-RapidAPI-Key': provider.apiKey,
    'X-RapidAPI-Host': provider.host,
    'X-CS-Correlation-ID': request.correlationId,
  });

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method === 'POST') {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(formatPostBody(request.tool, request.params));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);
  init.signal = controller.signal;

  try {
    const response = await fetch(url, init);
    const body = await readLimitedResponse(response, provider.maxResponseBytes);
    const parsed = parseProviderBody(body.text, response.headers.get('content-type'));
    const data = sanitizeProviderData(request.tool, parsed);
    const result = {
      ok: response.ok,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      method: request.method,
      status: response.status,
      correlation_id: request.correlationId,
      response_truncated: body.truncated,
      data,
    };

    return response.ok ? jsonContent(result) : toolErrorContent(result);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? `RapidAPI Spotify request timed out after ${provider.timeoutMs}ms.`
      : error instanceof Error
        ? error.message
        : String(error);

    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: message,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildProviderUrl(baseUrl: string, endpoint: string, params: Record<string, string>): string {
  const consumedParams = new Set<string>();
  const path = endpoint.replace(/\{([^}]+)\}/g, (_match, rawName: string) => {
    const name = rawName.trim();
    const value = params[name];
    if (!value) {
      throw new Error(`Missing required path parameter "${name}" for endpoint ${endpoint}.`);
    }
    consumedParams.add(name);
    return encodeURIComponent(value);
  });

  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    if (consumedParams.has(key)) continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function formatPostBody(tool: SpotifyToolDefinition, params: Record<string, string>): Record<string, string | string[]> {
  const arrayParams = new Set(tool.arrayBodyParams ?? []);
  const body: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    if (arrayParams.has(key)) {
      body[key] = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      continue;
    }
    body[key] = value;
  }

  return body;
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: await response.text(), truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - bytesRead;
      if (remaining <= 0) {
        truncated = true;
        await reader.cancel();
        break;
      }

      if (value.byteLength > remaining) {
        chunks.push(decoder.decode(value.slice(0, remaining), { stream: true }));
        bytesRead += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }

      chunks.push(decoder.decode(value, { stream: true }));
      bytesRead += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  chunks.push(decoder.decode());
  return { text: chunks.join(''), truncated };
}

function parseProviderBody(text: string, contentType: string | null): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const looksJson = contentType?.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!looksJson) return trimmed;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function sanitizeProviderData(tool: SpotifyToolDefinition, data: unknown): unknown {
  if (!tool.redactLyrics) return data;
  return {
    redacted_for_trace: true,
    redaction_policy: 'Full lyrics are omitted from MCP output and Braintrust traces.',
    data: redactLyrics(data),
  };
}

function redactLyrics(value: unknown, key = '', depth = 0): unknown {
  if (depth > 12) return '[redacted: maximum depth exceeded]';

  if (typeof value === 'string') {
    if (isLyricsKey(key) || value.length > 500) {
      return {
        redacted: true,
        original_type: 'string',
        original_length: value.length,
        reason: 'lyrics omitted from tool output and traces',
      };
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (isLyricsKey(key)) {
      return {
        redacted: true,
        original_type: 'array',
        original_items: value.length,
        reason: 'lyrics omitted from tool output and traces',
      };
    }
    return value.map((entry) => redactLyrics(entry, key, depth + 1));
  }

  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(record)) {
    redacted[entryKey] = redactLyrics(entryValue, entryKey, depth + 1);
  }
  return redacted;
}

function isLyricsKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes('lyric') || ['line', 'lines', 'text', 'words'].includes(normalized);
}

function toolErrorContent(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}
