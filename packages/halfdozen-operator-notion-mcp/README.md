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
- `CONFIG_DB` points to `create-something-db` (`a74e70ae-6a94-43da-905e-b90719c8dfd2`)

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

### Vault-aware script options

Both scripts support Infisical scoping flags:

- `INFISICAL_ENV` (default `prod`)
- `INFISICAL_PATH` (default `/`)
- `INFISICAL_PROJECT_ID` (optional)
- `INFISICAL_INCLUDE_IMPORTS` (default `true`)
