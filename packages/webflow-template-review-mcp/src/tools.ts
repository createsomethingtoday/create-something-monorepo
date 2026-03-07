import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AirtableClient } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import { TEMPLATE_REVIEW_FIELD_MAP } from './schema.js';

type ClientFactory = () => AirtableClient;

function jsonContent(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function asSuccess(data: unknown) {
  return jsonContent({ ok: true, data });
}

function asError(error: unknown) {
  if (error instanceof AirtableClientError) {
    return jsonContent(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.status ?? 500,
          details: error.details,
        },
      },
      true,
    );
  }
  if (error instanceof Error) {
    return jsonContent(
      {
        ok: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error.message,
          status: 500,
        },
      },
      true,
    );
  }
  return jsonContent(
    {
      ok: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        status: 500,
      },
    },
    true,
  );
}

export function registerTools(server: McpServer, getClient: ClientFactory): void {
  server.tool(
    'template_review_health',
    'Runtime health check for Webflow Template Review MCP and Airtable connectivity.',
    {},
    async () => {
      try {
        const health = await getClient().healthCheck();
        return asSuccess({ ...health, auth: 'Bearer token required at worker boundary.' });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_queue',
    'List template review queue using confirmed template Airtable fields.',
    {
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ limit }) => {
      try {
        const queue = await getClient().listAssetQueue(limit ?? 100);
        return asSuccess({ count: queue.length, records: queue });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_search_assets',
    'Search template assets by name so reviewers can find a specific submission without reading a broad queue slice.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ query, mode, limit }) => {
      try {
        const records = await getClient().searchAssetsByName(query, {
          mode,
          limit: limit ?? 25,
        });
        return asSuccess({
          query,
          mode: mode ?? 'contains',
          count: records.length,
          records,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_search_versions',
    'Search template Asset Versions by asset name so reviewers can locate review cycles for a specific submission directly.',
    {
      query: z.string().min(1),
      mode: z.enum(['contains', 'exact']).optional(),
      asset_limit: z.number().int().min(1).max(50).optional(),
      versions_per_asset_limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ query, mode, asset_limit, versions_per_asset_limit }) => {
      try {
        const matches = await getClient().searchVersionsByAssetName(query, {
          mode,
          assetLimit: asset_limit ?? 10,
          versionsPerAssetLimit: versions_per_asset_limit ?? 25,
        });

        return asSuccess({
          query,
          mode: mode ?? 'contains',
          asset_count: matches.length,
          version_count: matches.reduce((total, match) => total + match.versions.length, 0),
          matches,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_asset',
    'Get one template review payload by asset_id, including version history.',
    {
      asset_id: z.string().min(1),
      versions_limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ asset_id, versions_limit }) => {
      try {
        const client = getClient();
        const asset = await client.getAssetById(asset_id);
        if (!asset) {
          throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404, {
            asset_id,
          });
        }
        const versions = await client.listVersionsForAsset(asset_id, versions_limit ?? 100);
        return asSuccess({ asset, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_versions',
    'List all versions for a template asset.',
    {
      asset_id: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ asset_id, limit }) => {
      try {
        const versions = await getClient().listVersionsForAsset(asset_id, limit ?? 100);
        return asSuccess({ asset_id, count: versions.length, versions });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_version',
    'Get one template version record by version_id.',
    {
      version_id: z.string().min(1),
    },
    async ({ version_id }) => {
      try {
        const version = await getClient().getVersionById(version_id);
        if (!version) {
          throw new AirtableClientError('VERSION_NOT_FOUND', 'Template version not found.', 404, { version_id });
        }
        return asSuccess({ version });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_list_releases',
    'List available Asset Release records reviewers can link to approved template versions.',
    {
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ limit }) => {
      try {
        const releases = await getClient().listReleases(limit ?? 100);
        return asSuccess({ count: releases.length, releases });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_complete_publishing',
    'Complete the publishing checklist for a template version and attach a release using either a record id or a local-date lookup.',
    {
      version_id: z.string().min(1),
      release_record_id: z.string().optional(),
      release_date_local: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      time_zone: z.string().optional(),
      approve_version: z.boolean().optional(),
      mrp_id_overwrite: z.string().optional(),
    },
    async ({ version_id, release_record_id, release_date_local, time_zone, approve_version, mrp_id_overwrite }) => {
      try {
        if (!release_record_id && !release_date_local && !time_zone) {
          throw new AirtableClientError(
            'MISSING_RELEASE_SELECTOR',
            'Provide release_record_id, release_date_local, or time_zone so the publishing workflow can resolve a release.',
            400,
          );
        }

        const result = await getClient().completePublishing(version_id, {
          release_record_id,
          release_date_local,
          time_zone,
          approve_version,
          mrp_id_overwrite,
        });

        return asSuccess({
          updated_version: result.updatedVersion,
          updated_asset: result.updatedAsset,
          resolved_release: result.resolvedRelease,
          resolved_local_date: result.resolvedLocalDate,
          support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.publishingCompletion,
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_asset_metadata',
    'Update confirmed writable template asset fields.',
    {
      asset_id: z.string().min(1),
      template_name: z.string().optional(),
      description: z.string().optional(),
      description_short: z.string().optional(),
      description_long_html: z.string().optional(),
      website_url: z.string().optional(),
      preview_site_url: z.string().optional(),
      thumbnail_image_url: z.union([z.string().url(), z.null()]).optional(),
      thumbnail_image_secondary_urls: z.array(z.string().url()).optional(),
      carousel_image_urls: z.array(z.string().url()).optional(),
    },
    async ({ asset_id, ...input }) => {
      try {
        const updated = await getClient().updateAssetMetadata(asset_id, input);
        return asSuccess({ updated_asset: updated, support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetMetadata });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_asset_publishing',
    'Update confirmed asset-side publishing override fields for a template.',
    {
      asset_id: z.string().min(1),
      mrp_id_overwrite: z.string().optional(),
    },
    async ({ asset_id, mrp_id_overwrite }) => {
      try {
        const updated = await getClient().updateAssetPublishing(asset_id, {
          mrp_id_overwrite,
        });
        return asSuccess({ updated_asset: updated, support: TEMPLATE_REVIEW_FIELD_MAP.writeSupport.assetPublishing });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_update_version_review',
    'Update template version review fields that are confirmed writable in Airtable.',
    {
      version_id: z.string().min(1),
      review_owner: z.unknown().optional(),
      review_status: z.string().optional(),
      quality_rating: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.unknown().optional(),
      publishing_checklist: z.unknown().optional(),
      release_date: z.string().optional(),
      release_record_id: z.string().optional(),
      mrp_id_overwrite: z.string().optional(),
      reject_reason: z.string().optional(),
      rejection_feedback: z.string().optional(),
    },
    async ({
      version_id,
      review_owner,
      review_status,
      quality_rating,
      improvement_areas,
      review_feedback,
      review_checklist,
      publishing_checklist,
      release_date,
      release_record_id,
      mrp_id_overwrite,
      reject_reason,
      rejection_feedback,
    }) => {
      try {
        return asSuccess({
          updated_version: await getClient().updateVersionReview(version_id, {
            review_owner,
            review_status,
            quality_rating,
            improvement_areas,
            review_feedback,
            review_checklist,
            publishing_checklist,
            release_date,
            release_record_id,
            mrp_id_overwrite,
            reject_reason,
            rejection_feedback,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_request_changes',
    'Set a template version to changes-requested and attach review feedback.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string(),
      review_status: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
    },
    async ({ version_id, review_feedback, review_status, improvement_areas }) => {
      try {
        return asSuccess({
          updated_version: await getClient().updateVersionReview(version_id, {
            review_status: review_status ?? '📤Changes Requested',
            review_feedback,
            improvement_areas,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_approve_version',
    'Approve a template version and optionally update confirmed publishing checklist metadata.',
    {
      version_id: z.string().min(1),
      release_date: z.string().optional(),
      release_record_id: z.string().optional(),
      mrp_id_overwrite: z.string().optional(),
      publishing_checklist: z.unknown().optional(),
    },
    async ({ version_id, release_date, release_record_id, mrp_id_overwrite, publishing_checklist }) => {
      try {
        return asSuccess({
          updated_version: await getClient().updateVersionReview(version_id, {
            review_status: '✅Approved',
            release_date,
            release_record_id,
            mrp_id_overwrite,
            publishing_checklist,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_reject_version',
    'Reject a template version with reason and reviewer feedback.',
    {
      version_id: z.string().min(1),
      reject_reason: z.string(),
      rejection_feedback: z.string(),
    },
    async ({ version_id, reject_reason, rejection_feedback }) => {
      try {
        return asSuccess({
          updated_version: await getClient().updateVersionReview(version_id, {
            review_status: '❌Rejected',
            reject_reason,
            rejection_feedback,
          }),
        });
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_get_field_map',
    'Return the template review Airtable field map with confirmed and pending mappings.',
    {},
    async () => asSuccess(TEMPLATE_REVIEW_FIELD_MAP),
  );
}
