# Half Dozen Operator Notion MCP

Composio-backed Notion MCP for operator-managed account bindings.

## Tools

- `halfdozen_notion`
- `blondish_notion`
- `operator_notion_accounts`
- `operator_notion_sync`

## Environment

Worker secrets / vars:

- `COMPOSIO_API_KEY`
- `COMPOSIO_NOTION_AUTH_CONFIG_ID`
- `MCP_API_KEY`
- `PARTNER_KEY`
- `PARTNER_CLIENT_SLUG`

Default Notion auth config ID in `worker/wrangler.toml`:

- `COMPOSIO_NOTION_AUTH_CONFIG_ID = "ac_1fYSxzK38XeT"`

## Notes

- Pinned tools resolve through `partner_auth_notion_pins` and reject caller account overrides.
- Account metadata and pins live in the agency D1 schema introduced by `0011_partner_notion_accounts.sql`.
- `operator_notion_sync` currently supports page-content preview/copy between managed accounts.

## Quality Gates

- Dispatcher contract test:
  - `pnpm --filter @create-something/halfdozen-operator-notion-mcp test:contract`
- Deploy preflight:
  - `pnpm mcp:halfdozen-operator-notion:preflight`
- Danny hub smoke:
  - `pnpm mcp:halfdozen-operator-notion:smoke`
