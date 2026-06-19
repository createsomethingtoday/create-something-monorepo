import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

import type { AppReviewerAirtableEnv } from '../src/auth.js';
import { AirtableClient, AirtableClientError } from '../src/services/airtable.js';
import type { AssetFieldsUpdateInput, VersionFieldsUpdateInput } from '../src/services/airtable.js';
import {
  CAPABILITIES_OPTIONS,
  DEFAULT_AIRTABLE_BASE_ID,
  MARKETPLACE_STATUS_OPTIONS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  SERVER_NAME,
  SERVER_VERSION,
  TABLE_IDS,
  VISIBILITY_OPTIONS,
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

async function writeTool<T>(fn: () => Promise<T>) {
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

  const collaboratorRefSchema = z.object({
    id: z.string().min(1),
  });

  const updateAssetFieldsSchema = {
    asset_id: z.string().min(1),
    dry_run: z.boolean().optional(),
    include_sensitive: z.boolean().optional(),
    include_raw_fields: z.boolean().optional(),
    app_name: z.union([z.string(), z.null()]).optional(),
    app_capabilities: z.union([z.enum(CAPABILITIES_OPTIONS), z.null()]).optional(),
    client_id: z.union([z.string(), z.null()]).optional(),
    visibility_status: z.union([z.enum(VISIBILITY_OPTIONS), z.null()]).optional(),
    relationships_status: z.union([collaboratorRefSchema, z.null()]).optional(),
    features_text: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    credentials: z.union([z.string(), z.null()]).optional(),
    description_short: z.union([z.string(), z.null()]).optional(),
    description_long_html: z.union([z.string(), z.null()]).optional(),
    install_url: z.union([z.string().url(), z.null()]).optional(),
    categories_record_ids: z.union([z.array(z.string().min(1)), z.null()]).optional(),
    icon_image_url: z.union([z.string().url(), z.null()]).optional(),
    icon_image_alt_text: z.union([z.string(), z.null()]).optional(),
    carousel_image_urls: z.union([z.array(z.string().url()), z.null()]).optional(),
    carousel_image_alt_text: z.union([z.string(), z.null()]).optional(),
    payment_times: z.union([z.array(z.string().min(1)), z.null()]).optional(),
    demo_video_url: z.union([z.string().url(), z.null()]).optional(),
    privacy_policy_url: z.union([z.string().url(), z.null()]).optional(),
    terms_and_conditions_url: z.union([z.string().url(), z.null()]).optional(),
    website_url: z.union([z.string().url(), z.null()]).optional(),
    support_email_or_url: z.union([z.string(), z.null()]).optional(),
    preview_site_url: z.union([z.string().url(), z.null()]).optional(),
    promo_video_url: z.union([z.string().url(), z.null()]).optional(),
    marketplace_status: z.union([z.enum(MARKETPLACE_STATUS_OPTIONS), z.null()]).optional(),
    latest_review_status: z.enum(REVIEW_STATUS_OPTIONS).optional(),
    days_in_current_review_stage: z.number().optional(),
    workspace_dashboard_url: z.string().optional(),
    app_id: z.string().optional(),
    install_url_formula: z.string().optional(),
  };

  server.tool(
    'app_reviewer_update_asset_fields',
    'Update allowlisted Assets fields from Pablo’s App Reviewer field list. Formula, rollup, and derived fields are rejected with route hints.',
    updateAssetFieldsSchema,
    async (params) => {
      const parsed = z.object(updateAssetFieldsSchema).parse(params);
      const client = clientFor(env);
      const mutation: AssetFieldsUpdateInput = {
        app_name: parsed.app_name,
        app_capabilities: parsed.app_capabilities,
        client_id: parsed.client_id,
        visibility_status: parsed.visibility_status,
        relationships_status: parsed.relationships_status as AssetFieldsUpdateInput['relationships_status'],
        features_text: parsed.features_text,
        notes: parsed.notes,
        credentials: parsed.credentials,
        description_short: parsed.description_short,
        description_long_html: parsed.description_long_html,
        install_url: parsed.install_url,
        categories_record_ids: parsed.categories_record_ids,
        icon_image_url: parsed.icon_image_url,
        icon_image_alt_text: parsed.icon_image_alt_text,
        carousel_image_urls: parsed.carousel_image_urls,
        carousel_image_alt_text: parsed.carousel_image_alt_text,
        payment_times: parsed.payment_times,
        demo_video_url: parsed.demo_video_url,
        privacy_policy_url: parsed.privacy_policy_url,
        terms_and_conditions_url: parsed.terms_and_conditions_url,
        website_url: parsed.website_url,
        support_email_or_url: parsed.support_email_or_url,
        preview_site_url: parsed.preview_site_url,
        promo_video_url: parsed.promo_video_url,
        marketplace_status: parsed.marketplace_status,
        latest_review_status: parsed.latest_review_status,
        days_in_current_review_stage: parsed.days_in_current_review_stage,
        workspace_dashboard_url: parsed.workspace_dashboard_url,
        app_id: parsed.app_id,
        install_url_formula: parsed.install_url_formula,
      };

      return writeTool(async () => {
        if (parsed.dry_run) {
          const prepared = client.prepareAssetFieldsUpdate(mutation);
          return {
            dryRun: true,
            assetId: parsed.asset_id,
            wouldWrite: {
              fieldIds: prepared.fieldIds,
              fieldLabels: prepared.fieldLabels,
              fieldCount: prepared.fieldCount,
            },
          };
        }

        return client.updateAssetFields(parsed.asset_id, mutation, {
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(env),
          includeRawFields: parsed.include_raw_fields,
        });
      });
    },
  );

  const updateVersionFieldsSchema = {
    version_id: z.string().min(1),
    dry_run: z.boolean().optional(),
    include_raw_fields: z.boolean().optional(),
    review_type: z.union([z.enum(REVIEW_TYPE_OPTIONS), z.null()]).optional(),
    reviewer: z.union([collaboratorRefSchema, z.null()]).optional(),
    review_status: z.union([z.enum(REVIEW_STATUS_OPTIONS), z.null()]).optional(),
    rejection_reason: z.union([z.enum(REJECTION_REASON_OPTIONS), z.null()]).optional(),
    review_feedback: z.union([z.string(), z.null()]).optional(),
    submission_datetime_override: z.union([z.string().datetime(), z.null()]).optional(),
    version_number: z.union([z.string(), z.number()]).optional(),
    submission_datetime: z.string().optional(),
    days_in_current_stage: z.number().optional(),
    asset_id: z.string().optional(),
    asset_link: z.string().optional(),
  };

  server.tool(
    'app_reviewer_update_asset_version_fields',
    'Update allowlisted Asset Versions review fields. Reference, linked, and computed version fields are rejected with route hints.',
    updateVersionFieldsSchema,
    async (params) => {
      const parsed = z.object(updateVersionFieldsSchema).parse(params);
      const client = clientFor(env);
      const mutation: VersionFieldsUpdateInput = {
        review_type: parsed.review_type,
        reviewer: parsed.reviewer as VersionFieldsUpdateInput['reviewer'],
        review_status: parsed.review_status,
        rejection_reason: parsed.rejection_reason,
        review_feedback: parsed.review_feedback,
        submission_datetime_override: parsed.submission_datetime_override,
        version_number: parsed.version_number,
        submission_datetime: parsed.submission_datetime,
        days_in_current_stage: parsed.days_in_current_stage,
        asset_id: parsed.asset_id,
        asset_link: parsed.asset_link,
      };

      return writeTool(async () => {
        if (parsed.dry_run) {
          const prepared = client.prepareVersionFieldsUpdate(mutation);
          return {
            dryRun: true,
            versionId: parsed.version_id,
            wouldWrite: {
              fieldIds: prepared.fieldIds,
              fieldLabels: prepared.fieldLabels,
              fieldCount: prepared.fieldCount,
            },
          };
        }

        return client.updateVersionFields(parsed.version_id, mutation, {
          includeRawFields: parsed.include_raw_fields,
        });
      });
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
