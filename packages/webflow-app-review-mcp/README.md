# Webflow App Review MCP

MCP server for Webflow App Review workflows backed by Airtable.

## Features

- App review queue listing
- Asset and version reads
- Version review updates
- Asset metadata updates with read-only routing guards
- Canonical field map and status resources

## Local usage (stdio)

```bash
cd packages/webflow-app-review-mcp
AIRTABLE_API_KEY=... node src/index.js
```

## Remote usage (Cloudflare Worker)

See `worker/` for streamable HTTP and SSE transport wiring.

### Auth model

- Primary: OAuth 2.1 (authorization code + PKCE)
- Compatibility: static bearer token is disabled by default in shared-client mode, and can be re-enabled only with `ALLOW_LEGACY_API_KEY=true` plus `MCP_API_KEY`
- Protected shared-client mode:
  - Set `SHARED_OAUTH_CLIENT_ID` and `SHARED_OAUTH_CLIENT_SECRET`
  - Dynamic client registration is disabled
  - Only the configured client ID/secret can complete OAuth token exchange
  - Optional: set `SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS` (comma-separated; supports `*.domain.com`) to constrain OAuth redirect URIs

OAuth endpoints:

- `/.well-known/oauth-authorization-server`
- `/authorize`
- `/oauth/token`
- `/oauth/register` (only when shared-client mode is not configured)

API endpoints:

- `/mcp`
- `/sse`
- `/health`

### Context-safe defaults

To reduce context-window overload in chat clients:

- `app_review_list_queue` defaults to `limit=25`
- `app_review_get_asset` and `app_review_list_versions` default to `versions_limit=25`
- Long text fields are truncated in default responses
- Sensitive asset field `credentials` is redacted by default in read/update responses

For full payloads, pass `include_full_text: true` to:

- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`

For app lookup prompts (for example, "find Webflow app"), pass `query` to `app_review_list_queue` to filter server-side and keep responses small.
For sensitive credentials, pass `include_sensitive_fields: true` to `app_review_get_asset` (only when strictly required).

### Claude custom connector

Use the worker base URL (for example `https://webflow-app-review-mcp.createsomething.workers.dev`).

- URL: your base MCP URL
- OAuth Client ID / Secret:
  - Shared-client mode: enter the shared values
  - Dynamic mode: leave blank to use dynamic client registration

Claude should discover OAuth metadata automatically and prompt for authorization.
