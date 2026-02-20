# Enable Webflow App Review MCP in an Antigravity Instance

Use this guide to connect an Antigravity instance to the CREATE SOMETHING Webflow App Review MCP.

## Current MCP Endpoint

- Base URL: `https://webflow-app-review-mcp.createsomething.workers.dev`
- MCP endpoint: `https://webflow-app-review-mcp.createsomething.workers.dev/mcp`
- Health check: `https://webflow-app-review-mcp.createsomething.workers.dev/health`

## Auth Model (Important)

This server is configured for OAuth 2.1 shared-client mode.

- `client_id`: `app-review-reviewers`
- `client_secret`: shared reviewer secret (distributed securely to reviewers)
- Legacy bearer token fallback is disabled (`legacy_api_key: false`)

If Antigravity asks for "Bearer token" only, that flow will not work with current server settings.

## Antigravity Setup Steps

1. In Antigravity, open the MCP/Connectors settings for your instance.
2. Add a new remote MCP server.
3. Enter:
   - Name: `App Review MCP` (or your internal label)
   - URL: `https://webflow-app-review-mcp.createsomething.workers.dev/mcp`
4. Select OAuth 2.1 authentication (Authorization Code + PKCE if prompted).
5. Enter the shared client credentials:
   - Client ID: `app-review-reviewers`
   - Client Secret: `<shared secret>`
6. Save and run the connector authorization flow.
7. Confirm the connection by calling the MCP health tool (or equivalent test in Antigravity).

## Redirect URI Allowlist Requirement

The MCP currently enforces redirect URI host allowlisting through `SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS`.

If Antigravity uses a callback host that is not already allowed, OAuth will fail with `OAUTH_REDIRECT_URI_NOT_ALLOWED`.

To allow Antigravity callback hosts, update Worker secret:

```bash
printf '%s' 'claude.ai,<antigravity-callback-host>' | npx wrangler secret put SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS --name webflow-app-review-mcp
```

Examples:

- Single host: `antigravity.yourcompany.com`
- Wildcard host: `*.antigravity.yourcompany.com`

## Quick Validation Checklist

- `/health` returns:
  - `"oauth_mode": "shared-client-secret"`
  - `"shared_client_configured": true`
- OAuth login completes in Antigravity without redirect-uri errors.
- MCP tools are visible and callable.
- `app_review_list_queue` returns data.

## Security Notes for Reviewers

- Treat the shared client secret like a production credential.
- Store/distribute via your secret manager, not in chat or docs.
- Rotate on team changes or suspected exposure.
- Keep redirect host allowlist minimal (only known Antigravity/Claude callback domains).
