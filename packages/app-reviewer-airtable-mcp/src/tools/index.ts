import { jsonContent } from '@create-something/mcp-core';
import type { AccountContext, ScopedMcpServer } from '@create-something/mcp-core';
import { z } from 'zod';

import { AirtableClient, AirtableClientError } from '../services/airtable.js';
import {
  assetFieldPresetSchema,
  assetSortSchema,
  versionFieldPresetSchema,
  versionSortSchema,
} from '../schemas/index.js';

function clientFor(ctx: AccountContext): AirtableClient {
  return new AirtableClient({
    tokenProvider: ctx.tokenProvider,
    baseId: typeof ctx.metadata.baseId === 'string' ? ctx.metadata.baseId : undefined,
  });
}

function includeSensitiveDefault(ctx: AccountContext): boolean {
  return ctx.metadata.includeSensitiveDefault === true;
}

function asError(error: unknown) {
  if (error instanceof AirtableClientError) {
    return jsonContent({
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
    return jsonContent({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error.message,
      },
    });
  }
  return jsonContent({ ok: false, error: { code: 'UNKNOWN_ERROR', message: String(error) } });
}

async function readTool<T>(fn: () => Promise<T>) {
  try {
    return jsonContent({ ok: true, data: await fn() });
  } catch (error) {
    return asError(error);
  }
}

const listAssetsSchema = {
  limit: z.number().int().min(1).max(100).optional().describe('Maximum records for this page. Default 25, maximum 100.'),
  offset: z.string().min(1).optional().describe('Airtable pagination cursor from a previous nextOffset.'),
  preset: assetFieldPresetSchema.optional().describe('Field projection preset. Default summary. Use review/detail only when needed.'),
  include_sensitive: z.boolean().optional().describe('Include sensitive fields such as credentials. Defaults false unless runtime opts in.'),
  include_raw_fields: z.boolean().optional().describe('Also return raw Airtable field-id keyed payloads for selected fields.'),
  search: z.string().min(1).optional().describe('Server-side search across app name, app id, and client id.'),
  app_id: z.string().min(1).optional().describe('Exact App ID filter.'),
  marketplace_status: z.string().min(1).optional().describe('Exact Marketplace Status filter.'),
  latest_review_status: z.string().min(1).optional().describe('Exact Latest Review Status filter.'),
  visibility: z.string().min(1).optional().describe('Exact Visibility filter.'),
  sort: assetSortSchema.optional().describe('Server-side Airtable sort. Default app_name_asc.'),
};

const getAssetSchema = {
  asset_id: z.string().min(1).optional().describe('Airtable Assets record id, for example recXXXXXXXXXXXXXX.'),
  app_id: z.string().min(1).optional().describe('Exact app id when the Airtable record id is not known.'),
  preset: assetFieldPresetSchema.optional().describe('Asset field projection preset. Default review.'),
  include_sensitive: z.boolean().optional().describe('Include sensitive fields such as credentials. Defaults false unless runtime opts in.'),
  include_raw_fields: z.boolean().optional().describe('Also return raw Airtable field-id keyed payloads for selected fields.'),
  include_versions: z.boolean().optional().describe('Also include a bounded Asset Versions page for this asset.'),
  versions_limit: z.number().int().min(1).max(100).optional().describe('Version records to include when include_versions is true.'),
};

const listVersionsSchema = {
  asset_id: z.string().min(1).optional().describe('Airtable Assets record id to list versions for.'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum records for this page. Default 25, maximum 100.'),
  offset: z.string().min(1).optional().describe('Airtable pagination cursor from a previous nextOffset.'),
  preset: versionFieldPresetSchema.optional().describe('Field projection preset. Default review.'),
  include_raw_fields: z.boolean().optional().describe('Also return raw Airtable field-id keyed payloads for selected fields.'),
  review_status: z.string().min(1).optional().describe('Exact Review Status filter.'),
  review_type: z.string().min(1).optional().describe('Exact Review Type filter.'),
  sort: versionSortSchema.optional().describe('Server-side Airtable sort. Default version_number_desc.'),
};

const getVersionSchema = {
  version_id: z.string().min(1).describe('Airtable Asset Versions record id, for example recXXXXXXXXXXXXXX.'),
  preset: versionFieldPresetSchema.optional().describe('Field projection preset. Default review.'),
  include_raw_fields: z.boolean().optional().describe('Also return raw Airtable field-id keyed payloads for selected fields.'),
};

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'app_reviewer_airtable_health',
    'Check Airtable connectivity for the App Reviewer Assets and Asset Versions tables.',
    {},
    async (_params, ctx) => readTool(() => clientFor(ctx).healthCheck()),
    { readOnly: true },
  );

  server.tool(
    'app_reviewer_list_assets',
    'List App Reviewer Assets with bounded pagination, field projection, and optional server-side filters.',
    listAssetsSchema,
    async (params, ctx) => {
      const parsed = z.object(listAssetsSchema).parse(params);
      return readTool(() =>
        clientFor(ctx).listAssets({
          limit: parsed.limit,
          offset: parsed.offset,
          preset: parsed.preset,
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(ctx),
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
    { readOnly: true },
  );

  server.tool(
    'app_reviewer_get_asset',
    'Get one App Reviewer Asset by Airtable record id or App ID, optionally with a bounded versions page.',
    getAssetSchema,
    async (params, ctx) => {
      const parsed = z.object(getAssetSchema).parse(params);
      if (!parsed.asset_id && !parsed.app_id) {
        return asError(new AirtableClientError('INVALID_INPUT', 'Provide either asset_id or app_id.', 400));
      }

      return readTool(() =>
        clientFor(ctx).getAsset({
          assetId: parsed.asset_id,
          appId: parsed.app_id,
          preset: parsed.preset,
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(ctx),
          includeRawFields: parsed.include_raw_fields,
          includeVersions: parsed.include_versions,
          versionsLimit: parsed.versions_limit,
        }),
      );
    },
    { readOnly: true },
  );

  server.tool(
    'app_reviewer_list_asset_versions',
    'List App Reviewer Asset Versions with bounded pagination and optional asset/status/type filters.',
    listVersionsSchema,
    async (params, ctx) => {
      const parsed = z.object(listVersionsSchema).parse(params);
      return readTool(() =>
        clientFor(ctx).listVersions({
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
    { readOnly: true },
  );

  server.tool(
    'app_reviewer_get_asset_version',
    'Get one App Reviewer Asset Version by Airtable record id.',
    getVersionSchema,
    async (params, ctx) => {
      const parsed = z.object(getVersionSchema).parse(params);
      return readTool(() =>
        clientFor(ctx).getVersion(parsed.version_id, {
          preset: parsed.preset,
          includeRawFields: parsed.include_raw_fields,
        }),
      );
    },
    { readOnly: true },
  );
}
