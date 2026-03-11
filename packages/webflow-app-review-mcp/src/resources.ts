import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from './airtable.js';
import { APP_REVIEW_FIELD_MAP } from './schema.js';
import type { ReviewerProfile } from './reviewer-directory.js';

type ClientFactory = () => AirtableClient;
type ReviewerFactory = () => ReviewerProfile | null;

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

export function registerResources(server: McpServer, getClient: ClientFactory, getReviewer: ReviewerFactory = () => null): void {
  server.resource(
    'app-review-field-map',
    'app-review://field-map',
    {
      description: 'Airtable table/field mapping and writability contract for app review MCP.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, APP_REVIEW_FIELD_MAP),
  );

  server.resource(
    'app-review-status-options',
    'app-review://status-options',
    {
      description: 'Allowed status/type/reason values for write operations.',
      mimeType: 'application/json',
    },
    async (uri: URL) => asJsonResource(uri, APP_REVIEW_FIELD_MAP.statusOptions),
  );

  server.resource(
    'app-review-queue-snapshot',
    'app-review://queue-snapshot',
    {
      description: 'Current app-review queue snapshot (apps-only scoped).',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const queue = await getClient().listAssetQueue(100);
      return asJsonResource(uri, {
        count: queue.length,
        generatedAt: new Date().toISOString(),
        records: queue,
      });
    },
  );

  server.resource(
    'app-review-reviewer-me',
    'app-review://reviewer-me',
    {
      description: 'Current reviewer identity as resolved by the MCP runtime.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        reviewer: getReviewer(),
      }),
  );

  server.resource(
    'app-review-reviewer-workflow',
    'app-review://reviewer-workflow',
    {
      description: 'Recommended reviewer workflow for navigating the app review lane without broad mutation access.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Call app_review_list_queue to load the current app-review queue.',
          'Call app_review_get_asset to inspect one app asset and its version history.',
          'Call app_review_get_version when a specific version record needs confirmation.',
          'Use app_review_decision_support and app_review_feedback_refiner for recommendation drafting only.',
          'Until reviewer write rollout is enabled in the Hub, complete official state changes manually in Airtable.',
        ],
        notes: {
          currentReviewer: getReviewer(),
          phaseAAccess: 'read_only_evidence_lane',
          allowedWriteSurface: [
            'app_review_update_version_review',
            'app_review_set_marketplace_status',
          ],
          blockedWriteSurface: ['app_review_update_asset_metadata'],
          hostGuidance: [
            'Do not ask the reviewer to type their Airtable collaborator id.',
            'Treat reviewer identity as Hub-resolved account context, not prompt text.',
            'Keep metadata-editing behavior out of the reviewer lane unless policy expands explicitly.',
          ],
        },
      }),
  );
}
