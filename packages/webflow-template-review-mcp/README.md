# Webflow Template Review MCP

Remote MCP server for Webflow Template Review workflows, scoped to Airtable `Assets` + `Asset Versions`.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
- Data policy:
  - templates-only filtering (`🆎Type = Template🏗️` in v1)
  - read/write for confirmed template asset fields
  - version review mutations are exposed but return explicit mapping errors until Airtable field IDs are verified

## Current Status

Phase 1 is intentionally conservative:

- confirmed asset reads and updates are supported
- queue and version inspection are supported
- field-map and hotspot resources are supported
- version mutation helpers (`approve`, `reject`, `request changes`) are scaffolded but blocked on verified field mappings

## Auth

Worker boundary bearer auth:

- Header: `Authorization: Bearer <MCP_API_KEY>`
- `MCP_API_KEY` is required in all environments.
- If `MCP_API_KEY` is missing, `/mcp` and `/sse` return `503` with `MISCONFIGURED`.

## Secrets / Vars

Required:

- `AIRTABLE_API_KEY` (Airtable PAT)
- `MCP_API_KEY` (worker boundary bearer token)

Optional:

- `AIRTABLE_BASE_ID` (defaults to `appMoIgXMTTTNIc3p`)
- `REVIEWER_DIRECTORY_JSON` (JSON map from hub `account_id` to reviewer identity, used by `template_review_assign_self` and reviewer resources)

## Tools

- `template_review_health`
- `template_review_list_queue`
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_get_review_context`
- `template_review_list_releases`
- `template_review_complete_publishing`
- `template_review_assign_reviewer`
- `template_review_assign_self`
- `template_review_update_asset_metadata`
- `template_review_update_version_review`
- `template_review_request_changes`
- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_get_field_map`

## Resources

- `template-review://field-map`
- `template-review://status-options`
- `template-review://queue-snapshot`
- `template-review://hotspot-groups`
- `template-review://reviewer-me`
- `template-review://reviewer-workflow`

## Worker

```bash
cd packages/webflow-template-review-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```

## Token Rotation

Rotate shared bearer token:

```bash
cd packages/webflow-template-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```
