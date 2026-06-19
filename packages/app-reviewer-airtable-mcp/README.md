# App Reviewer Airtable MCP

Standalone MCP for performant, read-only access to the App Reviewer Airtable `Assets` and `Asset Versions` tables.

This package is separate from `packages/webflow-app-review-mcp`. It exists to give reviewer agents and hub clients a narrow Airtable data plane without inheriting review-state write tools or governance-tracker behavior.

## Tools

| Tool | Purpose |
|------|---------|
| `app_reviewer_airtable_health` | Verify the Airtable token can read both tables. |
| `app_reviewer_list_assets` | Page through `Assets` with projection presets and server-side filters. |
| `app_reviewer_get_asset` | Fetch one asset by Airtable record id or App ID; optionally include a bounded versions page. |
| `app_reviewer_list_asset_versions` | Page through `Asset Versions`, usually filtered by `asset_id`. |
| `app_reviewer_get_asset_version` | Fetch one asset-version record by Airtable record id. |

All tools are registered as read-only and the auth policy enforces read-only tool access.

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
| Validation surfaces | typecheck, unit tests, build output, stdio startup, Worker `/health`, representative read-only tool call |
| UI validation path | none |
| Escalation rule | Stop if Airtable field IDs drift, Infisical/runtime token injection fails, or a reviewer task needs mutation privileges. |
