# Webflow Template Review MCP

Remote MCP server for Webflow Template Review workflows, scoped to Airtable template assets and asset versions.

## Scope

- Airtable Base: `appMoIgXMTTTNIc3p` (default)
- Tables (hardcoded):
- `👛Assets` (`tblRwzpWoLgE9MrUm`)
- `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
- Template-only filtering is enforced on read and write using `⚙️🆎Type (Text)`.

## Security

Primary auth is OAuth 2.1 (authorization code + PKCE) with optional legacy bearer fallback.

OAuth endpoints:

- `/.well-known/oauth-authorization-server`
- `/authorize`
- `/oauth/token`
- `/oauth/register` (only when shared-client mode is not configured)

Protected MCP endpoints:

- `/mcp`
- `/sse`

Public endpoints:

- `/`
- `/health`

Worker secrets/env:

- `AIRTABLE_API_KEY` (required)
- `MCP_API_KEY` (required for legacy bearer fallback)
- `SHARED_OAUTH_CLIENT_ID` (recommended for Claude/Desktop shared-client mode)
- `SHARED_OAUTH_CLIENT_SECRET` (recommended; can match `MCP_API_KEY`)
- `SHARED_OAUTH_CLIENT_NAME` (optional)
- `SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS` (optional comma-separated allowlist)
- `AIRTABLE_BASE_ID` (optional, defaults to `appMoIgXMTTTNIc3p`)
- `ALLOW_LEGACY_API_KEY=true` (set in `wrangler.toml` by default for Codex compatibility)

## Token/Client Rotation

Rotate the shared bearer token:

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-template-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

Set/update shared OAuth client values (Claude Desktop):

```bash
pnpm exec wrangler secret put SHARED_OAUTH_CLIENT_ID
pnpm exec wrangler secret put SHARED_OAUTH_CLIENT_SECRET
```

When using shared-client mode, `SHARED_OAUTH_CLIENT_SECRET` can be the same value as `MCP_API_KEY`.

## MCP Interface

### Tools

- `template_review_health`
- `template_review_list_queue`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_update_review_form`
- `template_review_update_asset_metadata`
- `template_review_request_changes`
- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_get_field_map`

### Resources

- `template-review://field-map`
- `template-review://status-options`
- `template-review://queue-snapshot`

### Prompts

- `template_review_decision_support`
- `template_review_feedback_refiner`

## Local (stdio)

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-template-review-mcp
AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=appMoIgXMTTTNIc3p pnpm start
```

## Worker deploy

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-template-review-mcp/worker
pnpm install
pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler secret put AIRTABLE_API_KEY
pnpm exec wrangler secret put SHARED_OAUTH_CLIENT_ID
pnpm exec wrangler secret put SHARED_OAUTH_CLIENT_SECRET
pnpm deploy
```

## Notes

- Computed fields are read-only (`Latest Review Status`, `Days in Current Review Stage`, `Release Date`, button/formula fields).
- Review-state writes happen on `🖌️Asset Versions` source fields.
- Field writes are allowlist-validated by table and field ID.
