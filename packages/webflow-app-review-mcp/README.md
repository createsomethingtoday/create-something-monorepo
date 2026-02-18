# Webflow App Review MCP

Remote MCP server for Webflow App Review workflows, scoped to Airtable app assets and asset versions.

## Scope

- Airtable Base: `appMoIgXMTTTNIc3p` (default)
- Tables (hardcoded):
- `👛Assets` (`tblRwzpWoLgE9MrUm`)
- `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
- Apps-only filtering is enforced on read and write.

## Security

Worker endpoints `/mcp` and `/sse` require:

- `Authorization: Bearer <MCP_API_KEY>`

Public endpoint `/` is health/info only.

Secrets (Worker):

- `MCP_API_KEY`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID` (optional, defaults to `appMoIgXMTTTNIc3p`)

## Token Rotation

Rotate the shared bearer token with Wrangler secrets:

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

After rotation, distribute the new token to the review team and invalidate old local client configs.

## MCP Interface

### Tools

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`
- `app_review_get_field_map`

### Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://queue-snapshot`

### Prompts

- `app_review_decision_support`
- `app_review_feedback_refiner`

## Local (stdio)

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp
AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=appMoIgXMTTTNIc3p pnpm start
```

## Worker deploy

```bash
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp/worker
pnpm install
pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler secret put AIRTABLE_API_KEY
pnpm deploy
```

## Notes

- Computed fields are read-only (`Latest Review Status`, `Days in Current Review Stage`, `Workspace Dashboard URL`, `APP ID`).
- Review-state writes are routed to `🖌️Asset Versions` source fields.
- Field writes are allowlist-validated by table and field ID.
