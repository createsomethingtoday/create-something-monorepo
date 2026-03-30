# Webflow Template Admin MCP

Remote MCP server for admin-scoped Webflow Template Review workflows, backed by Airtable `Assets`, `Asset Versions`, and `Asset Releases`.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
  - `🚀Asset Releases` (`tblhLAXcJiXrkZxUL`)
- Data policy:
  - templates-only filtering (`🆎Type = Template🏗️`)
  - admin-safe access to the same read and mutation surfaces as the template review lane
  - explicit reviewer-directory-backed assignment for any reviewer, not just self-assignment

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
- `REVIEWER_DIRECTORY_JSON` (JSON map from hub `account_id` to reviewer identity, used for directory-backed assignment and reviewer-aware resources)

## Tools

The admin server intentionally keeps the template-review tool names so hosts can reuse the same workflow logic against a separate endpoint.

- `template_review_health`
- `template_review_list_reviewers`
- `template_review_get_metrics`
- `template_review_list_queue`
- `template_review_my_queue`
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_get_review_context`
- `template_review_list_releases`
- `template_review_assign_reviewer`
- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`
- `template_review_get_field_map`
- `template_review_update_asset_metadata`
- `template_review_update_asset_publishing`
- `template_review_update_version_review`
- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_complete_publishing`

## Admin Assignment

`template_review_assign_reviewer` supports:

- `reviewer_account_id`: preferred admin selector, resolved through `REVIEWER_DIRECTORY_JSON`
- `review_owner`: raw Airtable collaborator selector for fallback/manual use
- `review_owner: null`: clear the current assignment

## Resources

- `template-review://field-map`
- `template-review://status-options`
- `template-review://queue-snapshot`
- `template-review://hotspot-groups`
- `template-review://reviewer-me`
- `template-review://reviewer-directory`
- `template-review://reviewer-workflow`
- `template-review://admin-workflow`
- `template-review://host-playbook`

## Development

```bash
pnpm --filter @create-something/webflow-template-admin-mcp build
pnpm --filter @create-something/webflow-template-admin-mcp test
node packages/webflow-template-admin-mcp/dist/index.js
```

## Worker

```bash
cd packages/webflow-template-admin-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```

## Token Rotation

```bash
cd packages/webflow-template-admin-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

## Schema Audit

```bash
cd packages/webflow-template-admin-mcp
AIRTABLE_API_KEY=... pnpm audit:schema
```
