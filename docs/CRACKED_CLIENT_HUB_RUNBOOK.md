# Cracked Live Client Hub Runbook

Production runbook for the Cracked Live client-level Hub worker:

- Worker: `cs-hub-cracked`
- MCP URL: `https://cracked.mcp.createsomething.agency/mcp`
- Health URL: `https://cracked.mcp.createsomething.agency/health`
- Lane class: `client_hub`
- Host key: `cracked`
- Bearer issue scope: `operator_runtime_bearer`
- Discovery pack: `cracked-client-hub`
- Host compatibility mode: `compat`

This is a broad client hub, not a canonical partner named-lane route. Do not use this worker token as a customer-delivered managed bearer artifact.

## Deploy Contract

```bash
cd "/Users/micahjohnson/Code/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-cracked \
  --var HUB_INSTANCE_ID:cs-hub-cracked \
  --domain cracked.mcp.createsomething.agency \
  --var HUB_ACCOUNT_ID:acct_cracked_live \
  --var 'HUB_ENABLED_BUNDLES:[]' \
  --var HUB_ENABLED_SERVERS:composio-toolkit-canva,composio-toolkit-dropbox,composio-toolkit-exa,composio-toolkit-firecrawl,composio-toolkit-gmail,composio-toolkit-googledrive,composio-toolkit-googlemeet,composio-toolkit-googlesheets,composio-toolkit-notion,composio-toolkit-perplexityai,composio-toolkit-whatsapp,composio-toolkit-zoom,halfdozen-operator-notion-mcp \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_SHARED_PACK:cracked-client-hub \
  --var HUB_DISCOVERY_DEFAULT_SERVERS:composio-toolkit-canva,composio-toolkit-dropbox,composio-toolkit-exa,composio-toolkit-firecrawl,composio-toolkit-gmail,composio-toolkit-googledrive,composio-toolkit-googlemeet,composio-toolkit-googlesheets,composio-toolkit-notion,composio-toolkit-perplexityai,composio-toolkit-whatsapp,composio-toolkit-zoom,halfdozen-operator-notion-mcp \
  --var HUB_IDENTITY_MODE:compat \
  --var HUB_SESSION_RESOLVE_URL:https://id.createsomething.space/v1/mcp/sessions/resolve \
  --keep-vars
```

## Read-only Verification

```bash
pnpm mcp:hub:hardening:check
```

Expected health posture:

- `auth_required: true`
- `identity_mode: compat`
- `enabled_servers` exactly matches `HUB_ENABLED_SERVERS`
- `connected_servers` includes the same server names as `enabled_servers`
- `failed_servers: []`
- `proxy_tool_count` is greater than `0`
- `policy.quota.telemetryDbConfigured: true`
- `built_at` is present and recent

The static hardening matrix owns the `runtime`, `publicToolContract`, discovery pack, and server-list contract. Use `pnpm mcp:hub:hardening:matrix:check` to validate that repo-side contract without calling live infrastructure.

## Credential Boundary

The `CS_HUB_CRACKED_API_TOKEN` runtime bearer belongs in Infisical at `/mcp-hub/hubs` and should be treated as an operator bootstrap secret. Customer-facing managed bearer issuance should use a canonical named-lane route or a separately documented client-hub issuance flow with explicit host binding.
