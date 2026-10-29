# Cloudflare Patterns

## MCP Server Domains

MCP servers use a two-tier subdomain convention: `{service}.mcp.{property-domain}`.

### Naming Convention

- **Subdomain**: `{service}.mcp.{domain}` — the `mcp.` prefix groups all MCP servers and reserves the namespace for a future gateway/discovery endpoint
- **Custom domain**: Configured via `[[routes]]` in `wrangler.toml` with `custom_domain = true`

### CREATE SOMETHING Account (`9645bd52e640b8a4f40a3a55ff1dd75a`)

| Worker Name | Production URL | Package |
|---|---|---|
| `schedule-mcp` | `schedule.mcp.createsomething.agency` | `packages/schedule-mcp/` |
| `substrate-mcp` | `substrate.mcp.createsomething.agency` | `packages/substrate-mcp/` |
| `three-tier-framework-mcp` | `framework.mcp.createsomething.agency` | `packages/three-tier-framework-mcp/` |
| `outerfields-pcn-mcp` | `outerfields.mcp.createsomething.agency` | `packages/agency/clients/outerfields/mcp-remote/` |
| `notion-sync-mcp-worker` | `notion-sync.mcp.createsomething.agency` *(pending)* | `packages/notion-sync-mcp/` |

### WORKWAY Account (`5c3e9cf4d55ce171b844fad0931607f9`)

| Worker Name | Production URL | Package |
|---|---|---|
| `halfdozen-gmail-sync-mcp` | `gmail.mcp.workway.co` | `packages/halfdozen-gmail-sync/` |
| `halfdozen-youtube-sync-mcp` | `youtube.mcp.workway.co` | `packages/half-dozen-youtube-sync/` |
| `quickbooks-notion-mcp` | `quickbooks.mcp.workway.co` | `packages/quickbooks-notion-mcp/` |
| `halfdozen-notion-mcp` | `createsomething-notion.mcp.workway.co` | `packages/halfdozen-notion-mcp/` — Half Dozen ↔ CREATE SOMETHING client Notion |
| `system-studio-notion-mcp` | `system-studio-notion.mcp.workway.co` | same package, `wrangler.system-studio.toml` — System Studio ↔ HD Client Notion |

**Half Dozen MCP URL pattern** (use for new Half Dozen MCPs):

- **Base URL:** `https://{service}.mcp.workway.co`
- **Service subdomain:** Short, lowercase name (e.g. `notion`, `gmail`, `youtube`, `zoom`, `quickbooks`). Omit the `halfdozen-` prefix.
- **MCP endpoint:** `https://{service}.mcp.workway.co/mcp` (Streamable HTTP). Optional: `/sse` (SSE), `/` (health JSON).
- In `wrangler.toml`: `pattern = "{service}.mcp.workway.co"` with `custom_domain = true`.

### Adding a New MCP Server

1. Add a `[[routes]]` block to your `wrangler.toml`:
   ```toml
   [[routes]]
   pattern = "{service}.mcp.{domain}"
   custom_domain = true
   ```
2. The domain zone (e.g., `createsomething.agency`) must be active in the same Cloudflare account
3. Cloudflare auto-creates DNS records on `wrangler deploy`
4. All MCP workers support both `/mcp` (Streamable HTTP) and `/sse` (SSE) transports

### Client-Facing Aliases

Some MCP servers have secondary client-facing domains managed via the Cloudflare Dashboard:
- `mcp.outerfields.io` → `agency-outerfields-mcp` (alias for `outerfields.mcp.createsomething.agency`)

### DNS Prerequisites

Custom domains require the zone to be active in the same Cloudflare account as the worker. Verify before deploying:
- `createsomething.agency` — CREATE SOMETHING account
- `workway.co` — WORKWAY account
