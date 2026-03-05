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

## Tools

- `template_review_health`
- `template_review_list_queue`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
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

## Worker

```bash
cd packages/webflow-template-review-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```
