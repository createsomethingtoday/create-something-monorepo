# Webflow App Review MCP

Remote MCP server for Webflow App Review workflows, scoped to Airtable `Assets` + `Asset Versions`.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
- Data policy:
  - apps-only filtering (`Capabilities`, `Client ID`, `APP ID`, `Visibility`)
  - read/write for approved fields
  - computed/lookup fields are read-only

## Auth

Worker boundary bearer auth:

- Header: `Authorization: Bearer <MCP_API_KEY>`
- Configure with:
  - `wrangler secret put MCP_API_KEY`
- `MCP_API_KEY` is required in all environments.
- If `MCP_API_KEY` is missing, `/mcp` and `/sse` return `503` with `MISCONFIGURED`.

## Secrets / Vars

Required:

- `AIRTABLE_API_KEY` (Airtable PAT)
- `MCP_API_KEY` (worker boundary bearer token)

Optional:

- `AIRTABLE_BASE_ID` (defaults to `appMoIgXMTTTNIc3p`)
- `REVIEWER_DIRECTORY_JSON` (JSON map from hub `account_id` to reviewer identity, used by reviewer resources and write attribution payloads)

## Tools

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`
- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`
- `app_review_get_field_map`

## Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://queue-snapshot`
- `app-review://reviewer-me`
- `app-review://reviewer-workflow`

## Prompts

- `app_review_decision_support`
- `app_review_feedback_refiner`

## Canonical Mappings

- `Icon image` -> `🖼️Thumbnail Image`
- `Payment times` -> `ℹ️💲Payment Types`
- `relationships status` -> `👤Relationship Owner`

## Development

```bash
pnpm --filter=@create-something/webflow-app-review-mcp build
pnpm --filter=@create-something/webflow-app-review-mcp test
node packages/webflow-app-review-mcp/dist/index.js
```

## Worker

```bash
cd packages/webflow-app-review-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```

## Token Rotation

Rotate shared bearer token:

```bash
cd packages/webflow-app-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

Distribute the new token to the app review team and invalidate prior copies operationally.
