import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { NotionAccountRow, NotionPinRow } from './db.js';

export function registerInfoResources(server: McpServer, pinnedToolNames: string[]): void {
  server.resource(
    'operator_accounts_guide',
    'notion://operator-accounts',
    async () => ({
      contents: [
        {
          uri: 'notion://operator-accounts',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              description: 'Operator-managed Notion account bindings via Composio.',
              tools: [
                ...pinnedToolNames,
                'operator_notion_accounts',
                'operator_notion_sync',
                'operator_notion_sync_contracts',
                'operator_notion_run_sync_contract',
                'operator_notion_router',
              ],
              notes: [
                'Pinned tools resolve to configured account slugs and reject caller overrides.',
                'operator_notion_accounts supports wizard-style onboarding (workspace naming + connect-link/API-key flow).',
                'operator_notion_sync supports page-content preview/copy flows after connection.',
                'operator_notion_sync_contracts manages pairwise data-source sync contracts for Codex automations.',
                'operator_notion_run_sync_contract executes a stored contract or dry-run preview without owning schedule/cron state.',
                'operator_notion_router supports natural-language routing for onboarding and account operations.',
              ],
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.resource(
    'operator_two_way_sync_workflow',
    'notion://two-way-sync-workflow',
    async (uri) =>
      asJsonResource(uri, {
        description: 'Recommended workflow for creating a reusable two-way Notion sync contract between two managed workspaces.',
        preconditions: [
          'Both account slugs exist in operator_notion_accounts and should normally be ACTIVE before contract validation or execution.',
          'Both selected data sources use supported v1 field types only: title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status.',
          'Use operator_notion_sync for one-off page copy/preview only. Use operator_notion_sync_contracts for reusable two-way database sync.',
        ],
        recommendedSequence: [
          {
            step: 'discover-source',
            tool: 'operator_notion_sync_contracts',
            action: 'list_data_sources',
            args: { account_slug: '<source_account_slug>' },
            expectation: 'Identify the source data source id to sync from.',
          },
          {
            step: 'discover-target',
            tool: 'operator_notion_sync_contracts',
            action: 'list_data_sources',
            args: { account_slug: '<target_account_slug>' },
            expectation: 'Identify the target data source id to sync to.',
          },
          {
            step: 'inspect-source-schema',
            tool: 'operator_notion_sync_contracts',
            action: 'get_data_source_schema',
            args: { account_slug: '<source_account_slug>', data_source_id: '<source_data_source_id>' },
            expectation: 'Confirm exact source field names and types before mapping.',
          },
          {
            step: 'inspect-target-schema',
            tool: 'operator_notion_sync_contracts',
            action: 'get_data_source_schema',
            args: { account_slug: '<target_account_slug>', data_source_id: '<target_data_source_id>' },
            expectation: 'Confirm exact target field names and types before mapping.',
          },
          {
            step: 'create-contract',
            tool: 'operator_notion_sync_contracts',
            action: 'create_contract',
            args: {
              contract_slug: '<contract_slug>',
              source_account_slug: '<source_account_slug>',
              target_account_slug: '<target_account_slug>',
              source_data_source_id: '<source_data_source_id>',
              target_data_source_id: '<target_data_source_id>',
              conflict_policy: 'manual',
              propagate_create: true,
              propagate_update: true,
              propagate_archive: true,
              propagate_delete: true,
              field_mappings: [
                {
                  source_field: '<source_field>',
                  target_field: '<target_field>',
                  direction: 'bidirectional',
                },
              ],
            },
            expectation: 'Use direction=bidirectional only for fields that should sync both ways.',
          },
          {
            step: 'validate-contract',
            tool: 'operator_notion_sync_contracts',
            action: 'validate_contract',
            args: { contract_slug: '<contract_slug>' },
            expectation: 'Validation should pass with no unsupported field types or missing schemas.',
          },
          {
            step: 'preview-run',
            tool: 'operator_notion_sync_contracts',
            action: 'preview_run',
            args: { contract_slug: '<contract_slug>' },
            expectation: 'Dry-run the contract before enabling automation or live writes.',
          },
          {
            step: 'run-contract',
            tool: 'operator_notion_run_sync_contract',
            args: { contract_slug: '<contract_slug>', dry_run: false, idempotency_key: '<optional_retry_key>' },
            expectation: 'Use this for the real execution path and scheduled automations.',
          },
        ],
        notes: {
          conflictPolicies: ['manual', 'source_wins', 'target_wins'],
          deleteBehavior: 'Deletes normalize to archive behavior in v1.',
          identityModel: 'Contract execution uses mapping-table identity only in v1.',
          operatorSyncBoundary:
            'operator_notion_sync is for block/page copy flows; operator_notion_sync_contracts is the persistent database-sync surface.',
        },
      }),
  );

  server.resource(
    'operator_codex_sync_playbook',
    'notion://codex-two-way-sync-playbook',
    async (uri) =>
      asJsonResource(uri, {
        host: 'codex',
        intent: 'Enable Codex to create, validate, preview, and run a two-way sync contract with minimal prompt logic.',
        playbook: [
          'Read notion://operator-accounts and notion://two-way-sync-workflow before choosing tools.',
          'Check operator_notion_accounts(action=list_accounts) or operator_notion_accounts(action=get_status) before attempting sync setup.',
          'Discover source and target data sources before drafting any field mappings.',
          'Inspect both schemas and map only fields with compatible supported types.',
          'Default to conflict_policy=manual until the workflow is proven safe.',
          'Run validate_contract before preview_run, and preview_run before any live execution.',
          'Use operator_notion_run_sync_contract for the actual run path and scheduled automation entrypoint.',
          'When retries are possible, pass an idempotency_key to operator_notion_run_sync_contract.',
        ],
        antiPatterns: [
          'Do not use operator_notion_sync as a substitute for a reusable two-way database sync contract.',
          'Do not guess field names or property types without reading get_data_source_schema.',
          'Do not set direction=bidirectional for fields that should remain one-way or human-owned.',
          'Do not switch conflict_policy to source_wins or target_wins until preview results are understood.',
        ],
        recommendedPrompts: [
          'Create a bidirectional sync contract between <source_account_slug> and <target_account_slug>.',
          'List data sources for both accounts, inspect schemas, then draft a create_contract payload with bidirectional mappings.',
          'Validate and preview the contract before asking for live execution.',
        ],
      }),
  );
}

export function accountSnapshot(accounts: NotionAccountRow[], pins: NotionPinRow[]): Record<string, unknown> {
  return {
    accounts: accounts.map((account) => ({
      account_slug: account.account_slug,
      display_label: account.display_label,
      composio_user_id: account.composio_user_id,
      connected_account_id: account.connected_account_id,
      connection_status: account.connection_status,
      status: account.status,
      sync_enabled: Boolean(account.sync_enabled),
      last_checked_at: account.last_checked_at,
    })),
    pins: pins.map((pin) => ({ tool_name: pin.tool_name, account_slug: pin.account_slug })),
  };
}

function asJsonResource(uri: URL, value: Record<string, unknown>) {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
