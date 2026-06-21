import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from './airtable.js';
import { APP_REVIEW_FIELD_MAP } from './schema.js';

type ClientFactory = () => AirtableClient;

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

export function registerResources(server: McpServer, getClient: ClientFactory): void {
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
    'app-review-governance-finding-schema',
    'app-review://governance-finding-schema',
    {
      description: 'Airtable schema contract for app-review governance/transparency findings.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        table: APP_REVIEW_FIELD_MAP.tables.governanceFindings,
        fields: APP_REVIEW_FIELD_MAP.governanceFindings.fieldNames,
        writable: APP_REVIEW_FIELD_MAP.governanceFindings.writable,
        statusOptions: {
          category: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingCategory,
          status: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingStatus,
          priority: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingPriority,
        },
      }),
  );

  server.resource(
    'governance-database-finding-schema',
    'governance://finding-schema',
    {
      description: 'Neutral Airtable schema contract for the Webflow Governance & Transparency findings database.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        table: APP_REVIEW_FIELD_MAP.tables.governanceFindings,
        fields: APP_REVIEW_FIELD_MAP.governanceFindings.fieldNames,
        writable: APP_REVIEW_FIELD_MAP.governanceFindings.writable,
        statusOptions: {
          category: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingCategory,
          status: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingStatus,
          priority: APP_REVIEW_FIELD_MAP.statusOptions.governanceFindingPriority,
        },
        tools: {
          list: 'governance_database_list_findings',
          get: 'governance_database_get_finding',
          create: 'governance_database_create_finding',
          update: 'governance_database_update_finding',
        },
      }),
  );

  server.resource(
    'app-review-governance-findings-snapshot',
    'app-review://governance-findings-snapshot',
    {
      description: 'Current app-review governance/transparency findings snapshot.',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const findings = await getClient().listGovernanceFindings({ limit: 100 });
      return asJsonResource(uri, {
        count: findings.length,
        generatedAt: new Date().toISOString(),
        findings,
      });
    },
  );

  server.resource(
    'governance-database-findings-snapshot',
    'governance://findings-snapshot',
    {
      description: 'Current Webflow Governance & Transparency findings database snapshot.',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const findings = await getClient().listGovernanceFindings({ limit: 100 });
      return asJsonResource(uri, {
        count: findings.length,
        generatedAt: new Date().toISOString(),
        findings,
      });
    },
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
    'app-review-database-workflow',
    'app-review://database-workflow',
    {
      description: 'Neutral workflow for navigating app review and governance Airtable records.',
      mimeType: 'application/json',
    },
    async (uri: URL) =>
      asJsonResource(uri, {
        steps: [
          'Call app_review_list_queue to load the current app-review queue.',
          'Use app_review_list_queue.assigned to inspect assigned, unassigned, or all records without binding to a reviewer session.',
          'Call app_review_get_asset to inspect one app asset and its version history.',
          'Call app_review_get_version when a specific version record needs confirmation.',
          'Call app_review_get_review_context before any write to confirm the current asset/version state.',
          'Use app_review_decision_support and app_review_feedback_refiner for recommendation drafting only.',
          'Use app_review_list_governance_findings and app_review_get_governance_finding to inspect cross-app policy, docs, platform, and transparency findings.',
          'Use app_review_governance_finding_capture, then app_review_create_governance_finding or app_review_update_governance_finding, to capture Slack/Zendesk/docs findings into the tracking hub.',
          'Use app_review_save_draft_feedback, app_review_set_review_status, app_review_request_changes, app_review_approve_version, or app_review_reject_version only when the operator has authorized the Airtable write.',
        ],
        notes: {
          accessMode: 'neutral_airtable_database_surface',
          writeSurface: [
            'app_review_save_draft_feedback',
            'app_review_set_review_status',
            'app_review_request_changes',
            'app_review_approve_version',
            'app_review_reject_version',
            'app_review_create_governance_finding',
            'app_review_update_governance_finding',
          ],
          blockedWriteSurface: [
            'app_review_update_version_review',
            'app_review_set_marketplace_status',
            'app_review_update_asset_metadata',
          ],
          hostGuidance: [
            'Do not require a reviewer session or reviewer account mapping.',
            'Do not register Airtable base or table URLs as separate MCP servers.',
            'Use explicit record IDs and fields for Airtable writes.',
            'Keep broad metadata-editing behavior operator-gated unless policy expands explicitly.',
          ],
        },
      }),
  );
}
