# Webflow Template Review MCP

Remote MCP server for Webflow Template Review workflows, scoped to Airtable template assets and asset versions.

## Scope

- Airtable Base: `appMoIgXMTTTNIc3p` (default)
- Tables (hardcoded):
- `👛Assets` (`tblRwzpWoLgE9MrUm`)
- `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
- Template-only filtering is enforced on read and write using `⚙️🆎Type (Text)`.

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
cd /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-template-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

After rotation, distribute the new token to the review team and invalidate old local client configs.

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
pnpm deploy
```

## Notes

- Computed fields are read-only (`Latest Review Status`, `Days in Current Review Stage`, `Release Date`, button/formula fields).
- Review-state writes happen on `🖌️Asset Versions` source fields.
- Field writes are allowlist-validated by table and field ID.
