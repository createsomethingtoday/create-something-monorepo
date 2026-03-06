import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { NotionAccountRow, NotionPinRow } from './db.js';

export function registerInfoResources(server: McpServer): void {
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
                'halfdozen_notion',
                'blondish_notion',
                'operator_notion_accounts',
                'operator_notion_sync',
                'operator_notion_router',
              ],
              notes: [
                'Pinned tools resolve to configured account slugs and reject caller overrides.',
                'operator_notion_accounts supports wizard-style onboarding (workspace naming + connect-link/API-key flow).',
                'operator_notion_sync supports page-content preview/copy flows after connection.',
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
