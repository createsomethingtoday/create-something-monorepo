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
- Compatibility: static bearer token still works when `MCP_API_KEY` is configured

OAuth endpoints:

- `/.well-known/oauth-authorization-server`
- `/authorize`
- `/oauth/token`
- `/oauth/register`

API endpoints:

- `/mcp`
- `/sse`
- `/health`

### Claude custom connector

Use the worker base URL (for example `https://webflow-app-review-mcp.createsomething.workers.dev`).

- URL: your base MCP URL
- OAuth Client ID / Secret: leave blank to use dynamic client registration

Claude should discover OAuth metadata automatically and prompt for authorization.
