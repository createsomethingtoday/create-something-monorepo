# Webflow Template Review MCP

Remote MCP server for Webflow Template Review workflows, scoped to Airtable `Assets` + `Asset Versions`.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
  - `🚀Asset Releases` (`tblhLAXcJiXrkZxUL`)
- Data policy:
  - templates-only filtering (`🆎Type = Template🏗️` in v1)
  - read/write for confirmed template asset fields
  - reviewer assignment and bounded version-review writes use confirmed field mappings for `📝Review Status`, `📝Review Feedback`, and release linkage

## Current Status

Phase 1 is intentionally conservative:

- confirmed asset reads and updates are supported
- queue and version inspection are supported
- field-map and hotspot resources are supported
- reviewer assignment helpers are active
- reviewer-safe workflow helpers (`request changes`, `set review status`, `save draft feedback`, `approve`, `reject`, `update version review`) are implemented against confirmed reviewer/status field mappings
- supplemental agent-feedback writes are supported for `📝Agent Review Feedback`
- some broader write surfaces still depend on remaining field verification and policy rollout

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
- `WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL` (defaults to `https://validation-worker.createsomething.workers.dev/validate`)
- `GSAP_VALIDATION_WORKER_URL` (defaults to `https://gsap-validation-worker.createsomething.workers.dev/validateGsap`)
- `TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS` (defaults to `45000`)

## Tools

- `template_review_health`
- `template_review_get_metrics`
- `template_review_list_queue` (compact queue summaries)
- `template_review_my_queue` (compact queue summaries for the authenticated reviewer)
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_get_review_context`
- `template_review_run_published_site_validation` (read-only published-site validation; no Designer/Preview data or Airtable writes)
- `template_review_list_releases`
- `template_review_complete_publishing`
- `template_review_assign_reviewer`
- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`
- `template_review_get_field_map`
- `template_review_update_asset_metadata`
- `template_review_update_version_review`
- `template_review_approve_version`
- `template_review_reject_version`

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

## Schema Audit

Compare the checked-in template review schema contract against live Airtable metadata:

```bash
cd packages/webflow-template-review-mcp
AIRTABLE_API_KEY=... pnpm audit:schema
```

This checks:
- configured Airtable table IDs
- confirmed asset/version/release field names
- compatibility aliases used for legacy API shape
- metrics field IDs
- write field IDs

## Agent Feedback Script

Generate and save supplemental internal reviewer notes into `📝Agent Review Feedback` on `🖌️Asset Versions`:

```bash
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --dry-run
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --limit 5
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --version-id recXXXXXXXXXXXXXX --overwrite
```

Behavior:
- targets `🆕Ready for Review` rows by default
- skips rows that already have agent feedback unless `--overwrite` is set
- does lightweight same-origin page discovery from the asset `Website URL` or preview URL when available, so the draft is not limited to a single page when no sitemap exists
