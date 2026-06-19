import type { ScopedMcpServer } from '@create-something/mcp-core';

import { fieldMapResource } from '../schemas/index.js';

function asJsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function registerResources(server: ScopedMcpServer): void {
  server.resource(
    'app-reviewer-airtable-account',
    'app-reviewer-airtable://account',
    {
      description: 'Current App Reviewer Airtable MCP account policy and runtime scope. Does not expose secrets.',
      mimeType: 'application/json',
    },
    async (uri, ctx) =>
      asJsonResource(uri, {
        accountId: ctx.accountId,
        scopes: ctx.policy.scopes,
        readOnly: ctx.policy.readOnly,
        baseId: ctx.metadata.baseId,
        includeSensitiveDefault: ctx.metadata.includeSensitiveDefault === true,
      }),
  );

  server.resource(
    'app-reviewer-airtable-field-map',
    'app-reviewer-airtable://field-map',
    {
      description: 'Airtable base, table, field-id, label, and projection preset map for Assets and Asset Versions.',
      mimeType: 'application/json',
    },
    async (uri) => asJsonResource(uri, fieldMapResource()),
  );

  server.resource(
    'app-reviewer-airtable-performance-policy',
    'app-reviewer-airtable://performance-policy',
    {
      description: 'Performance guardrails for using the App Reviewer Airtable MCP without dumping large tables.',
      mimeType: 'application/json',
    },
    async (uri) =>
      asJsonResource(uri, {
        defaults: {
          maxPageSize: 100,
          defaultAssetPreset: 'summary',
          defaultVersionPreset: 'review',
          sensitiveFieldsDefault: false,
          rawFieldsDefault: false,
        },
        rules: [
          'Prefer app_reviewer_list_assets with preset=summary before fetching detailed fields.',
          'Use nextOffset to page instead of increasing page size.',
          'Use app_id, status, visibility, and search filters to reduce server-side result sets.',
          'Use include_versions on app_reviewer_get_asset only for one focused asset.',
          'Set include_sensitive=true only when credentials or internal notes are required for the review task.',
          'Set include_raw_fields=true only for schema/debugging work; normal reviewer answers should use friendly field names.',
          'Use dry_run=true on write tools to validate mutation shape without touching Airtable.',
        ],
      }),
  );

  server.resource(
    'app-reviewer-airtable-workflow',
    'app-reviewer-airtable://workflow',
    {
      description: 'Recommended App Reviewer workflow over Assets and Asset Versions.',
      mimeType: 'application/json',
    },
    async (uri) =>
      asJsonResource(uri, {
        steps: [
          'Call app_reviewer_airtable_health to verify both Airtable tables are reachable.',
          'Call app_reviewer_list_assets with narrow filters and preset=summary to find the app.',
          'Call app_reviewer_get_asset for the one app record that matters; keep include_sensitive=false unless needed.',
          'Call app_reviewer_list_asset_versions with asset_id to inspect the version history.',
          'Call app_reviewer_get_asset_version when a specific version record needs full review context.',
          'Use app_reviewer_update_asset_fields only for direct Assets metadata edits.',
          'Use app_reviewer_update_asset_version_fields for review status, reviewer, rejection reason, feedback, type, and submission datetime override.',
        ],
        tables: ['Assets', 'Asset Versions'],
        mutationPolicy:
          'This MCP has bounded write tools for Pablo’s reviewed Assets and Asset Versions fields. Formula, rollup, linked-reference, and derived summary fields are rejected with route hints. Prefer dry_run=true before production writes.',
      }),
  );
}
