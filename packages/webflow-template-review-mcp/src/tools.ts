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
    'template_review_update_version_review',
    'Scaffolded version review mutation endpoint. Returns a pending-mapping error until Airtable field IDs are verified.',
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
      mrp_id_overwrite: z.string().optional(),
      reject_reason: z.string().optional(),
      rejection_feedback: z.string().optional(),
    },
    async () => {
      try {
        await getClient().pendingVersionMutation('template_review_update_version_review');
        return asSuccess({});
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_request_changes',
    'Scaffolded request-changes action wrapper.',
    {
      version_id: z.string().min(1),
      review_feedback: z.string(),
      review_status: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
    },
    async () => {
      try {
        await getClient().pendingVersionMutation('template_review_request_changes');
        return asSuccess({});
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_approve_version',
    'Scaffolded approve-version action wrapper.',
    {
      version_id: z.string().min(1),
      release_date: z.string().optional(),
      mrp_id_overwrite: z.string().optional(),
      publishing_checklist: z.unknown().optional(),
    },
    async () => {
      try {
        await getClient().pendingVersionMutation('template_review_approve_version');
        return asSuccess({});
      } catch (error) {
        return asError(error);
      }
    },
  );

  server.tool(
    'template_review_reject_version',
    'Scaffolded reject-version action wrapper.',
    {
      version_id: z.string().min(1),
      reject_reason: z.string(),
      rejection_feedback: z.string(),
    },
    async () => {
      try {
        await getClient().pendingVersionMutation('template_review_reject_version');
        return asSuccess({});
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
