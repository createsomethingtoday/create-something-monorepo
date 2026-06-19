# App Reviewer Airtable MCP

Standalone MCP for performant, bounded access to the App Reviewer Airtable `Assets` and `Asset Versions` tables.

This package is separate from `packages/webflow-app-review-mcp`. It exists to give reviewer agents and hub clients a narrow Airtable data plane without inheriting governance-tracker behavior or arbitrary Airtable mutation access.

## Tools

| Tool | Purpose |
|------|---------|
| `app_reviewer_airtable_health` | Verify the Airtable token can read both tables. |
| `app_reviewer_list_assets` | Page through `Assets` with projection presets and server-side filters. |
| `app_reviewer_get_asset` | Fetch one asset by Airtable record id or App ID; optionally include a bounded versions page. |
| `app_reviewer_list_asset_versions` | Page through `Asset Versions`, usually filtered by `asset_id`. |
| `app_reviewer_get_asset_version` | Fetch one asset-version record by Airtable record id. |
| `app_reviewer_update_asset_fields` | Update allowlisted direct `Assets` metadata fields; rejects formula, rollup, and derived fields. |
| `app_reviewer_update_asset_version_fields` | Update allowlisted `Asset Versions` review fields. |

Read tools are registered as read-only. Write tools are limited to explicit allowlists and support `dry_run=true` to validate mutations without touching Airtable.

## Write Field Review

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

Pablo-listed fields that are intentionally not direct writes:

- `latest_review_status`: derived from Asset Versions. Write `review_status` on the relevant Asset Version.
- `days_in_current_review_stage` and `days_in_current_stage`: computed fields.
- `workspace_dashboard_url`, `install_url_formula`, and `app_id`: formula, lookup, or derived fields.
- `version_number`, `submission_datetime`, `asset_id`, and `asset_link`: reference or linked fields controlled by submission/version creation. Use `submission_datetime_override` only when a reviewer needs to correct display timing.

## Performance Model

- Default list calls return at most 25 records.
- Tool input caps each page at 100 records.
- Every Airtable request uses `returnFieldsByFieldId=true`.
- Every Airtable list/get call sends `fields[]` projections.
- Large or sensitive fields are excluded by default.
- Pagination returns Airtable `nextOffset`; callers should pass it back as `offset`.

Asset presets:

- `summary`: compact queue/list fields.
- `review`: review context without credentials or media-heavy fields.
- `links`: support/install/legal URLs.
- `media`: icon, carousel, and video fields.
- `sensitive`: credentials plus internal notes; use only with `include_sensitive=true`.
- `all`: all known fields; still excludes credentials unless `include_sensitive=true`.

Asset Version presets:

- `summary`: version number, type, status, reviewer, submission date, and asset link.
- `review`: summary plus rejection/review feedback fields.
- `all`: all known Asset Version fields.

## Runtime Configuration

Required:

```bash
AIRTABLE_API_KEY=pat...
MCP_BEARER_TOKEN=...
```

Optional:

```bash
AIRTABLE_BASE_ID=appMoIgXMTTTNIc3p
APP_REVIEWER_AIRTABLE_BASE_ID=appMoIgXMTTTNIc3p
APP_REVIEWER_MCP_ACCOUNT_ID=app-reviewer-airtable
APP_REVIEWER_AIRTABLE_INCLUDE_SENSITIVE_DEFAULT=false
```

Use Infisical `prod:/webflow/app-reviewer-airtable-mcp` for both secrets. `MCP_BEARER_TOKEN` protects the remote MCP endpoint; `AIRTABLE_API_KEY` is the upstream Airtable PAT used only by the runtime. Do not commit either value into repo files.

Example local run:

```bash
infisical run --env=prod --path=/webflow/app-reviewer-airtable-mcp --include-imports=true -- pnpm --filter @create-something/app-reviewer-airtable-mcp start
```

## Validation

```bash
pnpm --filter @create-something/app-reviewer-airtable-mcp typecheck
pnpm --filter @create-something/app-reviewer-airtable-mcp test
pnpm --filter @create-something/app-reviewer-airtable-mcp build
```

For Worker health:

```bash
pnpm --filter @create-something/app-reviewer-airtable-mcp build
cd packages/app-reviewer-airtable-mcp/worker
wrangler dev
curl http://127.0.0.1:8787/health
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/server.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter @create-something/app-reviewer-airtable-mcp build && pnpm --filter @create-something/app-reviewer-airtable-mcp start` |
| Smoke command | `pnpm --filter @create-something/app-reviewer-airtable-mcp typecheck && pnpm --filter @create-something/app-reviewer-airtable-mcp test && pnpm --filter @create-something/app-reviewer-airtable-mcp build` |
| Validation surfaces | typecheck, unit tests, build output, stdio startup, Worker `/health`, representative read and dry-run write tool calls |
| UI validation path | none |
| Escalation rule | Stop if Airtable field IDs drift, Infisical/runtime token injection fails, or a reviewer task needs fields outside the explicit write allowlist. |
