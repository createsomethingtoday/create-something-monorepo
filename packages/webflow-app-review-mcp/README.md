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
