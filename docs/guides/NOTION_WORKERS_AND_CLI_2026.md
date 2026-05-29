# Notion Workers and CLI Adoption Guide

> Status: operating guidance for CREATE SOMETHING Notion/MCP work.
> Reviewed: May 14, 2026.

## Purpose

Notion now has several developer surfaces that overlap with our MCP fleet:

| Surface                    | Best fit                                                                                                              | Use with caution when                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CREATE SOMETHING MCPs      | Cross-client governed execution, tenant routing, telemetry, policy prompts, headless agents, dual-workspace workflows | The workflow must run entirely inside a Notion Custom Agent                                |
| Notion Workers Agent Tools | Inside-Notion Custom Agent capabilities with typed inputs, structured output, and Notion-scoped permissions           | The tool needs our fleet gateway, cross-client credentials, or non-Notion runtime controls |
| Notion Workers Syncs       | Greenfield Notion-managed mirror tables from external systems                                                         | The client already owns the target database/schema                                         |
| Notion hosted MCP          | User-authorized Notion access from AI clients                                                                         | The agent is headless, needs bearer-token access, or needs our policy/telemetry layer      |
| `ntn` CLI                  | Operator probes, Worker deploy/test, data-source resolution, API-version audits, file-upload helpers                  | Runtime code should call APIs/SDKs directly                                                |

This guide does not replace `docs/COMPOSIO_PATTERNS.md`; it narrows the Notion-specific decision path.

For Agency Ops PM onboarding and client timeline workflows, pair this guide with
`docs/guides/AGENCY_OPS_PM_AGENT_NOTION_REVIEW_2026.md`.

## May 2026 Platform Notes

The updated Notion developer docs make Workers and Custom Agents a first-party
inside-Notion extension path. This is additive to our MCP fleet, not a blanket
replacement.

Important changes:

- The Developer portal now manages connections, Notion Workers, and personal
  access tokens.
- PATs are user-scoped bearer tokens with separate Notion API and Workers
  capability bundles. Use them for local scripts, CLI workflows, Worker
  development, and trusted user-owned tools; do not use them as a multi-user
  product auth model.
- Workspace admins can view, revoke, and, on supported plans, restrict PAT
  creation. This makes PAT use operationally acceptable for internal
  development, but still not suitable for shared client production automation.
- A Notion Worker is a hosted Node/TypeScript program that can register syncs,
  Custom Agent tools, and webhooks from one exported `Worker` instance.
- Worker Custom Agent tools receive `context.notion`. When a tool is called by a
  Notion Custom Agent, Notion authenticates that client with the Custom Agent's
  permissions. Syncs, webhooks, local tests, and `ntn workers exec` need an
  explicit `NOTION_API_TOKEN`.
- Notion now documents Custom Agent integrations that can hand coding work to
  Cursor from a Notion page, task, or comment. Treat that as a Notion-native
  interface for starting work, while Linear remains this repo's source of truth
  for tracked implementation state.
- The May 2026 changelog added `POST /v1/blocks/meeting_notes/query`,
  `agent_id` page/block parents, and `@notionhq/client` `5.21.0` support for
  those standalone SDK types.

Compatibility note: `@notionhq/workers@0.3.0` currently peers against
`@notionhq/client@^2.2.15`. Keep Worker experiment packages on that compatible
peer until the Workers SDK publishes support for the standalone SDK v5 line.
For non-Worker packages that opt in to Notion API `2026-03-11`, use
`@notionhq/client` `5.12.0+`, and prefer the current `5.21.0` line when touching
meeting notes, `agent_id` parents, views, comments, or newer schema types.

## Tier Mapping

| Three-tier layer | Notion surface                                                                  | CREATE SOMETHING posture                                |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Database         | Data sources, Worker Sync managed databases, `context.notion` reads             | Verify data-source IDs and current schema before writes |
| Automation       | Worker Agent Tools, Sync `execute`, webhooks, our MCP tools                     | Keep tools narrow and typed; prefer structured outputs  |
| Judgment         | Custom Agent tool descriptions, read-only/write hints, our MCP prompts/policies | Treat descriptions and tool hints as policy artifacts   |

## When To Use Each Path

### Use Our MCPs

Use existing MCP packages when the workflow needs any of these:

- Multiple workspaces or clients in one operating surface.
- Fixed client schemas or existing client-owned Notion databases.
- Headless agent execution from Codex, Cursor, Claude, Dify, or OpenAI Agents.
- CREATE SOMETHING telemetry, metering, bearer-token governance, or policy prompts.
- Non-Notion source-of-truth routing, such as Substrate canonical with Notion as a view.

Current examples:

- `packages/halfdozen-notion-mcp`
- `packages/halfdozen-gmail-sync`
- `packages/halfdozen-operator-notion-mcp`
- `packages/quickbooks-notion-mcp`

### Use Notion Workers Agent Tools

Use Agent Tools when the product should be available directly inside a Notion Custom Agent.

Good examples:

- Read a page or data source through `context.notion`.
- Validate a Notion page against a policy artifact.
- Look up client/project/package status from Substrate.
- Summarize an Agency Ops engagement for PM review.
- Flag stale milestones, missing evidence, or open blockers.
- Create a Linear issue from a Notion task after user confirmation.
- Run a preflight before a Notion write.

Implementation rules:

- Keep tool keys stable and specific.
- Put operational boundaries in the description.
- Use `j` schemas and `.describe()` on every input field.
- Return structured JSON, and add `outputSchema` for predictable output.
- Set `hints: { readOnlyHint: true }` for read-only tools.
- Assume write tools trigger Custom Agent confirmation by default.
- Do not expose broad "operate workspace" style tools.
- Prefer read-only tools for PM onboarding until the related Notion page and
  Linear evidence model is stable.
- For write tools, include an explicit user-confirmation boundary in the
  description and return structured evidence that can be copied into Linear.

Local test flow:

```bash
cd packages/notion-worker-experiments
ntn workers exec summarizePage --local -d '{"pageId":"<page_id>"}'
ntn workers exec appendPolicyNote --local -d '{"pageId":"<page_id>","heading":"Example","note":"Needs review","sourceUrl":null}'
LINEAR_API_KEY="$LINEAR_API_KEY" ntn workers sync trigger linearIssuesSync --local --preview
infisical run --env=prod --path=/ --include-imports=true -- env PATH="$HOME/.local/bin:$PATH" LINEAR_SYNC_PAGE_SIZE=2 ntn workers sync trigger linearIssuesSync --local --preview --no-dotenv
```

Hosted flow:

```bash
cd packages/notion-worker-experiments
ntn login
pnpm --filter @create-something/notion-worker-experiments build
ntn workers deploy --name create-something-linear-sync --local-build
ntn workers env set "LINEAR_API_KEY=$LINEAR_API_KEY"
ntn workers env set "LINEAR_TEAM_KEY=${LINEAR_TEAM_KEY:-CRE}"
ntn workers env set "LINEAR_SYNC_PAGE_SIZE=100"
ntn workers sync trigger linearIssuesSync --preview
ntn workers sync trigger linearIssuesSync
ntn workers exec summarizePage -d '{"pageId":"<page_id>"}'
ntn workers runs list
```

### Use Notion Workers Syncs

Use Syncs for greenfield Notion-managed mirror tables.

Good examples:

- External package registry -> Notion managed database.
- Substrate read model -> Notion managed "Agency Ops View".
- Agency Ops health index -> Notion managed PM review database.
- Public dataset or partner feed -> Notion managed database.
- Linear issues -> Notion managed PM review database when Linear remains the
  executable coordination source of truth.

Avoid Syncs for current client-owned schemas until Notion supports syncing into existing databases. As of the reviewed docs, Syncs create and manage their own databases.

Sync design rules:

- Declare `worker.database()` with `type: "managed"`.
- Choose a stable `primaryKeyProperty` tied to the external source ID.
- Use `replace` for small full datasets or backfills.
- Use `incremental` for large datasets or source APIs with cursors/change feeds.
- Start batch sizes around 100 records.
- Keep deletes explicit in `incremental` mode.
- Use `schedule: "manual"` for experiments.
- Use CLI preview before committing writes.
- Use a backfill-plus-delta pair when an upstream system needs both fast updates
  and an operator-triggered repair path. The docs now explicitly show
  `incremental` scheduled syncs paired with manual `replace` backfills.
- Use `Schema.relation()` and `Builder.relation()` only between Worker-managed
  databases. Existing client-owned relation fields should stay on the direct
  Notion API/MCP path until Worker Syncs can target those schemas.
- Keep Notion/Linear reconciliation review-only at first. Linear remains the
  engineering source of truth, Notion remains the PM/operator layer, and the
  Linear Issues sync remains a read model for comparison. Reconciliation output
  should create or suggest PM review items before any system mutates status
  fields across tools.
- For the current Agency Ops prototype, use
  `pnpm --filter @create-something/notion-worker-experiments reconcile:agency-ops -- --live --snapshot-out ./agency-ops-snapshot.json`
  to export a live PM snapshot, then run against `--input` for repeatable
  review. Use `--write-suggestions` only after inspecting the report; it should
  create review-only `Tasks / Actions` rows and skip duplicate action titles.

Operator flow:

```bash
ntn workers sync trigger <sync-key> --preview
ntn workers sync status <sync-key> --no-watch
ntn workers sync state get <sync-key>
ntn workers sync state reset <sync-key>
ntn workers runs logs <run-id>
```

## `ntn` CLI Operator Checklist

Install and auth:

```bash
curl -fsSL https://ntn.dev | bash
ntn --version
ntn login
ntn doctor
```

Important environment variables:

| Variable                     | Use                                        |
| ---------------------------- | ------------------------------------------ |
| `NOTION_API_TOKEN`           | Override keychain auth for API/CLI probes  |
| `NOTION_API_VERSION`         | Pin API-version probes for a shell/script  |
| `NOTION_WORKSPACE_ID`        | Avoid interactive workspace prompts        |
| `NOTION_WORKERS_CONFIG_FILE` | Select a non-default `workers.json`        |
| `NOTION_KEYRING=0`           | Use file-based auth instead of OS keychain |

Never log or paste tokens. Avoid verbose diagnostic output in shared artifacts unless it has been reviewed for secrets.

### API Probes

Use `ntn api` to check an endpoint without building a temporary script. It adds auth and `Notion-Version` headers.

```bash
ntn api v1/users/me --notion-version 2026-03-11
ntn api v1/search filter:='{"property":"object","value":"data_source"}' page_size:=10
ntn api "v1/pages/$PAGE_ID" -X PATCH in_trash:=false --notion-version 2026-03-11
ntn api ls --json
ntn api v1/comments --docs -X POST
```

Use `--data` or stdin JSON for larger request bodies.

### Data-Source Resolution

When a client gives a Notion database URL or old database ID, resolve it before using newer code that expects a data source ID.

```bash
ntn datasources resolve <database-id> --notion-version 2026-03-11
ntn datasources query <data-source-id> --limit 10 --notion-version 2026-03-11
```

### File Uploads

Use the CLI for one-off file upload probes and runbooks. Runtime code should use API calls directly.

```bash
ntn files create < ./report.pdf
ntn files create --external-url https://example.com/image.png
ntn files list
ntn files get <upload-id>
```

## Worker Package Conventions

For repo-local experiments:

- Keep Notion Worker experiments under `packages/notion-worker-experiments`.
- Keep Notion-native examples separate from Cloudflare Worker MCP packages.
- Do not add production deploy scripts at the repo root until a Worker is promoted.
- Use `ntn workers exec --local` before any hosted deploy.
- Store secrets with `ntn workers env set`, not in repo files.
- Use `.env.example` only for names and comments.
- For `packages/notion-worker-experiments`, deploy with `--local-build`; the
  package build emits a bundled Worker file because Notion's cloud builder does
  not have the monorepo root TypeScript config and hosted runs do not reliably
  resolve pnpm workspace transitive dependency symlinks.
- Notion's Worker quickstart now lists Node.js `22+` and npm `10+` as
  prerequisites. The repo package can still typecheck under the monorepo's
  current toolchain, but hosted Worker deploy tests should run from a Node 22
  shell before promotion.

## Client And Agent Posture

| Surface                                     | Recommended posture                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| CREATE SOMETHING Agency Ops PM              | Pilot read-only Custom Agent tools for page summaries, engagement health, stale milestone review, and policy/evidence checks. |
| Half Dozen production Notion workflows      | Keep Cloudflare Worker/MCP architecture until package-level `2026-03-11` audits and smoke tests are done.                     |
| Client-owned Notion schemas                 | Prefer our MCPs or direct API scripts; avoid Worker Syncs because they manage their own databases today.                      |
| Greenfield client PM/read-model dashboards  | Consider Worker Syncs when Notion can own the mirror database and `replace` backfills are acceptable.                         |
| Human-operated Notion AI tasks              | Use Notion Custom Agents plus narrow Worker tools; route implementation tracking back to Linear.                              |
| Headless or cross-client agents             | Use CREATE SOMETHING MCPs/Hubs, not Notion Custom Agents, so policy, secrets, telemetry, and tenant routing stay centralized. |
| Commodity Notion access in external AI apps | Use Notion hosted MCP or Composio when the task is generic and user-authorized, not when we need policy artifacts/resources.  |

## Compatibility Audit Targets

Before moving older packages to Notion API `2026-03-11`, inspect these packages:

| Package                                   | Current concern                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/notion-agent`                   | Uses `2022-06-28`, `/databases/{id}/query`, `parent.database_id`, and `archived`                  |
| `packages/halfdozen-gmail-sync`           | Uses old SDK/API version patterns for Notion database writes                                      |
| `packages/quickbooks-notion-mcp`          | Uses `2022-06-28`, `/databases`, and `database_id` inputs                                         |
| `packages/notion-sync-mcp`                | Partially uses data sources, but still has `database_id` naming and create/schema paths to review |
| `packages/half-dozen-youtube-sync`        | Uses old SDK/API version patterns for Notion database writes                                      |
| `packages/halfdozen-zoom-sync`            | Uses legacy direct-fetch Notion version and database IDs                                          |
| `packages/halfdozen-zoom-transcript-sync` | Uses legacy direct-fetch Notion version and database IDs                                          |

Audit checklist:

- API version pins: `2022-06-28`, `2025-09-03`, `2026-03-11`.
- SDK version: minimum `@notionhq/client` `5.12.0` for `2026-03-11`; prefer
  `5.21.0+` for new standalone SDK work.
- Worker SDK peer constraints: do not force SDK v5 into `@notionhq/workers`
  packages until the Worker SDK peer range supports it.
- Database/query paths: `databases.query` vs `dataSources.query`.
- Parent fields: `database_id` vs `data_source_id` for page creation.
- Trash fields: `archived` vs `in_trash`.
- Block append positioning: use the `position` object instead of legacy `after`.
- Search filters: `database` vs `data_source`.
- Query pagination: treat `next_cursor` as opaque and check for incomplete
  query status when the result set may exceed Notion's 10,000-result query
  depth limit.
- Any prompt/tool descriptions that still ask users for database IDs when the tool expects data source IDs.

## Source Docs

- Notion Workers overview: https://developers.notion.com/workers/get-started/overview
- Agent Tools: https://developers.notion.com/workers/guides/tools
- Syncs: https://developers.notion.com/workers/guides/syncs
- Worker Notion API client: https://developers.notion.com/workers/guides/api-client
- Worker secrets: https://developers.notion.com/workers/guides/secrets
- Worker webhooks: https://developers.notion.com/workers/guides/webhooks
- Worker SDK: https://developers.notion.com/workers/reference/sdk
- CLI overview: https://developers.notion.com/cli/get-started/overview
- CLI command reference: https://developers.notion.com/cli/reference/commands
- CLI API requests: https://developers.notion.com/cli/guides/api-requests
- CLI data sources: https://developers.notion.com/cli/guides/data-sources
- CLI file uploads: https://developers.notion.com/cli/guides/file-uploads
- Personal access tokens: https://developers.notion.com/guides/get-started/personal-access-tokens
- Notion MCP overview: https://developers.notion.com/guides/mcp/overview
- Custom Agent Cursor connection: https://developers.notion.com/guides/agents/connect-cursor-to-custom-agent
- Changelog: https://developers.notion.com/page/changelog
