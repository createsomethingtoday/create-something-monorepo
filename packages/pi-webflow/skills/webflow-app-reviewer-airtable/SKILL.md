---
name: webflow-app-reviewer-airtable
description: Webflow App Reviewer Airtable workflow for Assets and Asset Versions. Use when an agent needs to search, read, triage, or update Webflow App Reviewer Airtable records through the App Reviewer Airtable MCP.
---

# Webflow App Reviewer Airtable

Use this skill when working with the App Reviewer Airtable MCP for Webflow app review data in the `Assets` and `Asset Versions` tables.

## Tool Choice

Use the narrowest reviewer surface that owns the state:

| Need | Use |
|------|-----|
| App metadata, marketplace status, credentials, URLs, imagery, payment fields, Asset Versions | App Reviewer Airtable MCP |
| Official app-review actions, reviewer assignment, governance findings, richer workflow policy | Webflow App Review MCP |
| Customer conversation, public replies, private notes, ticket status | Webflow Zendesk MCP |

Do not treat this MCP as generic Airtable access. It exposes only the App Reviewer `Assets` and `Asset Versions` tables and only allows the write fields listed below.

## App Reviewer Airtable MCP

Remote server:

```text
https://app-reviewer-airtable-mcp.createsomething.workers.dev/mcp
```

Infisical reference:

```text
prod:/webflow/app-reviewer-airtable-mcp
```

Auth is bearer-header MCP transport auth. Never expose or paste Airtable PATs, MCP bearer tokens, Infisical secret values, credentials fields, or raw secret screenshots in messages, docs, tickets, or comments.

## Read Workflow

1. Start with `app_reviewer_airtable_health` if runtime reachability is unknown.
2. Use `app_reviewer_list_assets` with `preset=summary` plus filters before fetching details.
3. Use `app_reviewer_get_asset` for one focused asset by `asset_id` or `app_id`.
4. Use `app_reviewer_list_asset_versions` after the `asset_id` is known.
5. Use `app_reviewer_get_asset_version` when a specific version needs full review context.

Prefer exact Airtable record IDs, App IDs, and current tool output over memory. Use pagination cursors instead of broad table dumps.

## Performance Rules

- Keep list calls bounded; page with `nextOffset`.
- Prefer projection presets before `preset=all`.
- Use `include_sensitive=true` only when credentials or internal notes are required for the task.
- Use `include_raw_fields=true` only for schema debugging or field-contract work.
- Do not ask for raw tables or unbounded Airtable exports.

## Write Workflow

Use `dry_run=true` before a live write whenever validating field shape, planning a mutation, or operating from incomplete context.

Asset metadata dry run:

```json
{
  "asset_id": "recXXXXXXXXXXXXXX",
  "marketplace_status": "1️⃣Upcoming🆕",
  "dry_run": true
}
```

Asset Version review dry run:

```json
{
  "version_id": "recXXXXXXXXXXXXXX",
  "review_status": "🏃🏾In Review",
  "review_feedback": "Reviewer-facing note or feedback.",
  "dry_run": true
}
```

Only perform a live write when the user explicitly asks for the mutation or the workflow policy clearly authorizes it. After writing, report the record ID, fields changed, and whether sensitive fields were excluded from the response.

## Writable Fields

`app_reviewer_update_asset_fields` can write:

- `marketplace_status`
- `app_name`, `app_capabilities`, `client_id`, `visibility_status`, `relationships_status`
- `features_text`, `notes`, `credentials`
- `description_short`, `description_long_html`, `install_url`
- `categories_record_ids`
- `icon_image_url`, `icon_image_alt_text`, `carousel_image_urls`, `carousel_image_alt_text`
- `payment_times`
- `demo_video_url`, `privacy_policy_url`, `terms_and_conditions_url`, `website_url`, `support_email_or_url`, `preview_site_url`, `promo_video_url`

`app_reviewer_update_asset_version_fields` can write:

- `review_type`
- `reviewer`
- `review_status`
- `rejection_reason`
- `review_feedback`
- `submission_datetime_override`

## Read-Only Or Routed Fields

Do not write these directly:

| Field | Reason | Route |
|-------|--------|-------|
| `latest_review_status` | Derived from Asset Versions | Write `review_status` on the relevant Asset Version |
| `days_in_current_review_stage` | Computed rollup/formula | Read only |
| `days_in_current_stage` | Computed stage-age field | Read only |
| `workspace_dashboard_url` | Formula/derived field | Read only |
| `install_url_formula` | Formula field | Write `install_url` instead |
| `app_id` | Lookup/derived field | Read only |
| `version_number` | Reference field controlled by submission/version creation | Read only |
| `submission_datetime` | Canonical submission timestamp | Use `submission_datetime_override` only when needed |
| `asset_id`, `asset_link` | Linked/rollup relationship | Read only |

If a tool rejects a write as read-only, follow the returned route hint instead of widening the mutation.

## Evidence Rules

For any non-trivial answer or mutation, keep evidence explicit:

- Asset record ID and App ID, when known
- Asset Version record ID, when known
- Tool calls used
- Fields read or written
- Whether `dry_run=true` was used
- Whether sensitive fields were requested or excluded
- Any read-only-field route used

If evidence is incomplete, ask for the missing identifier or perform a read-only lookup before writing.
