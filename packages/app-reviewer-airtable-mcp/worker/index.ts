import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

import type { AppReviewerAirtableEnv } from '../src/auth.js';
import { AirtableClient, AirtableClientError } from '../src/services/airtable.js';
import {
  DEFAULT_AIRTABLE_BASE_ID,
  SERVER_NAME,
  SERVER_VERSION,
  TABLE_IDS,
  assetFieldPresetSchema,
  assetSortSchema,
  versionFieldPresetSchema,
  versionSortSchema,
} from '../src/schemas/index.js';

interface Env extends AppReviewerAirtableEnv {}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Api-Key',
};

function authorizeRequest(request: Request, env: Env): Response | null {
  const expected = env.MCP_BEARER_TOKEN?.trim();
  if (!expected) {
    return jsonResponse({ error: 'MCP_BEARER_TOKEN is not configured.' }, 503);
  }

  const authorization = request.headers.get('authorization') ?? '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  const apiKey = request.headers.get('x-api-key')?.trim() ?? '';
  if (bearer === expected || apiKey === expected) return null;

  return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
    status: 401,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="app-reviewer-airtable-mcp"',
    },
  });
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function toolContent(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

function toolError(error: unknown) {
  if (error instanceof AirtableClientError) {
    return toolContent({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        status: error.status ?? 500,
        details: error.details,
      },
    });
  }
  if (error instanceof Error) {
    return toolContent({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error.message,
      },
    });
  }
  return toolContent({ ok: false, error: { code: 'UNKNOWN_ERROR', message: String(error) } });
}

async function readTool<T>(fn: () => Promise<T>) {
  try {
    return toolContent({ ok: true, data: await fn() });
  } catch (error) {
    return toolError(error);
  }
}

function clientFor(env: Env): AirtableClient {
  const apiKey = env.AIRTABLE_API_KEY?.trim() || env.AIRTABLE_PAT?.trim();
  if (!apiKey) {
    throw new AirtableClientError('MISSING_AIRTABLE_API_KEY', 'AIRTABLE_API_KEY is not configured.', 503);
  }

  return new AirtableClient({
    tokenProvider: { getAccessToken: async () => apiKey },
    baseId: env.APP_REVIEWER_AIRTABLE_BASE_ID ?? env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
  });
}

function includeSensitiveDefault(env: Env): boolean {
  return /^(1|true|yes)$/i.test(env.APP_REVIEWER_AIRTABLE_INCLUDE_SENSITIVE_DEFAULT ?? '');
}

function buildServer(env: Env): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.tool(
    'app_reviewer_airtable_health',
    'Check Airtable connectivity for the App Reviewer Assets and Asset Versions tables.',
    {},
    async () => readTool(() => clientFor(env).healthCheck()),
  );

  const listAssetsSchema = {
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.string().min(1).optional(),
    preset: assetFieldPresetSchema.optional(),
    include_sensitive: z.boolean().optional(),
    include_raw_fields: z.boolean().optional(),
    search: z.string().min(1).optional(),
    app_id: z.string().min(1).optional(),
    marketplace_status: z.string().min(1).optional(),
    latest_review_status: z.string().min(1).optional(),
    visibility: z.string().min(1).optional(),
    sort: assetSortSchema.optional(),
  };

  server.tool(
    'app_reviewer_list_assets',
    'List App Reviewer Assets with bounded pagination, field projection, and optional server-side filters.',
    listAssetsSchema,
    async (params) => {
      const parsed = z.object(listAssetsSchema).parse(params);
      return readTool(() =>
        clientFor(env).listAssets({
          limit: parsed.limit,
          offset: parsed.offset,
          preset: parsed.preset,
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(env),
          includeRawFields: parsed.include_raw_fields,
          search: parsed.search,
          appId: parsed.app_id,
          marketplaceStatus: parsed.marketplace_status,
          latestReviewStatus: parsed.latest_review_status,
          visibility: parsed.visibility,
          sort: parsed.sort,
        }),
      );
    },
  );

  const getAssetSchema = {
    asset_id: z.string().min(1).optional(),
    app_id: z.string().min(1).optional(),
    preset: assetFieldPresetSchema.optional(),
    include_sensitive: z.boolean().optional(),
    include_raw_fields: z.boolean().optional(),
    include_versions: z.boolean().optional(),
    versions_limit: z.number().int().min(1).max(100).optional(),
  };

  server.tool(
    'app_reviewer_get_asset',
    'Get one App Reviewer Asset by Airtable record id or App ID, optionally with a bounded versions page.',
    getAssetSchema,
    async (params) => {
      const parsed = z.object(getAssetSchema).parse(params);
      if (!parsed.asset_id && !parsed.app_id) {
        return toolError(new AirtableClientError('INVALID_INPUT', 'Provide either asset_id or app_id.', 400));
      }
      return readTool(() =>
        clientFor(env).getAsset({
          assetId: parsed.asset_id,
          appId: parsed.app_id,
          preset: parsed.preset,
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(env),
          includeRawFields: parsed.include_raw_fields,
          includeVersions: parsed.include_versions,
          versionsLimit: parsed.versions_limit,
        }),
      );
    },
  );

  const listVersionsSchema = {
    asset_id: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.string().min(1).optional(),
    preset: versionFieldPresetSchema.optional(),
    include_raw_fields: z.boolean().optional(),
    review_status: z.string().min(1).optional(),
    review_type: z.string().min(1).optional(),
    sort: versionSortSchema.optional(),
  };

  server.tool(
    'app_reviewer_list_asset_versions',
    'List App Reviewer Asset Versions with bounded pagination and optional asset/status/type filters.',
    listVersionsSchema,
    async (params) => {
      const parsed = z.object(listVersionsSchema).parse(params);
      return readTool(() =>
        clientFor(env).listVersions({
          assetId: parsed.asset_id,
          limit: parsed.limit,
          offset: parsed.offset,
          preset: parsed.preset,
          includeRawFields: parsed.include_raw_fields,
          reviewStatus: parsed.review_status,
          reviewType: parsed.review_type,
          sort: parsed.sort,
        }),
      );
    },
  );

  const getVersionSchema = {
    version_id: z.string().min(1),
    preset: versionFieldPresetSchema.optional(),
    include_raw_fields: z.boolean().optional(),
  };

  server.tool(
    'app_reviewer_get_asset_version',
    'Get one App Reviewer Asset Version by Airtable record id.',
    getVersionSchema,
    async (params) => {
      const parsed = z.object(getVersionSchema).parse(params);
      return readTool(() =>
        clientFor(env).getVersion(parsed.version_id, {
          preset: parsed.preset,
          includeRawFields: parsed.include_raw_fields,
        }),
      );
    },
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_NAME,
        version: SERVER_VERSION,
        baseId: env.APP_REVIEWER_AIRTABLE_BASE_ID ?? env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
        tables: TABLE_IDS,
        hasAirtableToken: Boolean(env.AIRTABLE_API_KEY || env.AIRTABLE_PAT),
        hasMcpBearerToken: Boolean(env.MCP_BEARER_TOKEN),
        endpoints: {
          mcp: '/mcp',
        },
      });
    }

    if (url.pathname === '/mcp') {
      const unauthorized = authorizeRequest(request, env);
      if (unauthorized) return unauthorized;

      const server = buildServer(env);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      return transport.handleRequest(request);
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
};
