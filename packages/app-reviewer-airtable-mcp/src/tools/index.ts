import { jsonContent } from '@create-something/mcp-core';
import type { AccountContext, ScopedMcpServer } from '@create-something/mcp-core';
import { z } from 'zod';

import { AirtableClient, AirtableClientError } from '../services/airtable.js';
import {
  CAPABILITIES_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  REJECTION_REASON_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  REVIEW_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
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

async function writeTool<T>(fn: () => Promise<T>) {
  try {
    return jsonContent({ ok: true, data: await fn() });
  } catch (error) {
    return asError(error);
  }
}

const collaboratorRefSchema = z.object({
  id: z.string().min(1).describe('Airtable collaborator id.'),
});

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

const updateAssetFieldsSchema = {
  asset_id: z.string().min(1).describe('Airtable Assets record id to update.'),
  dry_run: z.boolean().optional().describe('Validate and return the planned field names without writing to Airtable.'),
  include_sensitive: z.boolean().optional().describe('Return sensitive fields such as credentials after the update. Defaults false.'),
  include_raw_fields: z.boolean().optional().describe('Return raw Airtable field-id keyed payloads after the update.'),
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
  latest_review_status: z.enum(REVIEW_STATUS_OPTIONS).optional().describe('Read-only summary; write review_status on an Asset Version instead.'),
  days_in_current_review_stage: z.number().optional().describe('Read-only computed field.'),
  workspace_dashboard_url: z.string().optional().describe('Read-only formula field.'),
  app_id: z.string().optional().describe('Read-only derived field.'),
  install_url_formula: z.string().optional().describe('Read-only formula field; write install_url instead.'),
};

const updateVersionFieldsSchema = {
  version_id: z.string().min(1).describe('Airtable Asset Versions record id to update.'),
  dry_run: z.boolean().optional().describe('Validate and return the planned field names without writing to Airtable.'),
  include_raw_fields: z.boolean().optional().describe('Return raw Airtable field-id keyed payloads after the update.'),
  review_type: z.union([z.enum(REVIEW_TYPE_OPTIONS), z.null()]).optional(),
  reviewer: z.union([collaboratorRefSchema, z.null()]).optional(),
  review_status: z.union([z.enum(REVIEW_STATUS_OPTIONS), z.null()]).optional(),
  rejection_reason: z.union([z.enum(REJECTION_REASON_OPTIONS), z.null()]).optional(),
  review_feedback: z.union([z.string(), z.null()]).optional(),
  submission_datetime_override: z.union([z.string().datetime(), z.null()]).optional(),
  version_number: z.union([z.string(), z.number()]).optional().describe('Read-only reference field.'),
  submission_datetime: z.string().optional().describe('Read-only canonical submission timestamp; use submission_datetime_override.'),
  days_in_current_stage: z.number().optional().describe('Read-only computed field.'),
  asset_id: z.string().optional().describe('Read-only linked/rollup relationship.'),
  asset_link: z.string().optional().describe('Read-only linked relationship.'),
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

  server.tool(
    'app_reviewer_update_asset_fields',
    'Update allowlisted Assets fields from Pablo’s App Reviewer field list. Formula, rollup, and derived fields are rejected with route hints.',
    updateAssetFieldsSchema,
    async (params, ctx) => {
      const parsed = z.object(updateAssetFieldsSchema).parse(params);
      const client = clientFor(ctx);
      const mutation = {
        app_name: parsed.app_name,
        app_capabilities: parsed.app_capabilities,
        client_id: parsed.client_id,
        visibility_status: parsed.visibility_status,
        relationships_status: parsed.relationships_status,
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
          includeSensitive: parsed.include_sensitive ?? includeSensitiveDefault(ctx),
          includeRawFields: parsed.include_raw_fields,
        });
      });
    },
    { readOnly: false },
  );

  server.tool(
    'app_reviewer_update_asset_version_fields',
    'Update allowlisted Asset Versions review fields. Reference, linked, and computed version fields are rejected with route hints.',
    updateVersionFieldsSchema,
    async (params, ctx) => {
      const parsed = z.object(updateVersionFieldsSchema).parse(params);
      const client = clientFor(ctx);
      const mutation = {
        review_type: parsed.review_type,
        reviewer: parsed.reviewer,
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
    { readOnly: false },
  );
}
