# cs-mcp-hub-notion-bridge

Notion-friendly MCP auth bridge for Hub.

It accepts client auth that Notion supports (`Basic` or API key), resolves an account id, and forwards to the upstream Hub with:

- `Authorization: Bearer <HUB_API_TOKEN>` (optional if upstream requires it)
- `x-mcp-account-id: <resolved account>`
- `x-hub-account-id: <resolved account>`
- `x-mcp-session-token: <optional mapped token>`

## Why this exists

Notion's MCP UI often cannot provide custom headers like `X-MCP-Session-Token` or `x-mcp-account-id`.
This bridge lets you keep your existing Hub secure while giving Notion a simpler auth shape.

## Auth modes

At least one mode must be configured.

- `Basic`:
  - Username = account id (example: `acct_mj`)
  - Password = `BRIDGE_BASIC_PASSWORD`
- API key:
  - Send key via `x-api-key`, `api-key`, or `Authorization: Bearer <key>`
  - Must match `BRIDGE_API_KEY`
  - Account id comes from `x-mcp-account-id`, `x-account-id`, or `BRIDGE_DEFAULT_ACCOUNT_ID`

## Required env

- `HUB_UPSTREAM_URL` (example: `https://mj.mcp.createsomething.agency/mcp`)

## Recommended secrets

- `HUB_API_TOKEN` (if upstream Hub requires gateway token)
- `BRIDGE_BASIC_PASSWORD` and/or `BRIDGE_API_KEY`

## Optional env

- `BRIDGE_DEFAULT_ACCOUNT_ID` (fallback account id)
- `BRIDGE_SESSION_TOKENS_JSON` (JSON account->session-token map, for `session_required` upstream)
  - Example: `{"acct_mj":"ms_tok_abc123"}`

## Notion setup (Basic)

- MCP URL: your deployed bridge URL + `/mcp`
- Auth: `Basic`
- Username: `acct_mj` (or target account id)
- Password: value of `BRIDGE_BASIC_PASSWORD`
