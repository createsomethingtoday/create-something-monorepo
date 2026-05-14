# Notion API Compatibility Audit

> Status: audit checklist for packages that still use older Notion database APIs.
> Reviewed: May 14, 2026.

## Purpose

Use this checklist before changing any deployed Notion package to API version `2026-03-11`.

The goal is narrow: identify package surfaces that still depend on legacy Notion database behavior, then migrate them intentionally with package-level smoke tests. Do not convert every `database_id` string mechanically; some Notion database container operations still use database IDs, while data-source row operations should use data source IDs in newer API versions.

## Current Platform Deltas

Account for these Notion developer updates before changing package behavior:

- API version `2026-03-11` removes legacy `archived` request/response semantics
  in favor of `in_trash`, changes block append placement from `after` to
  `position`, and uses `meeting_notes` instead of `transcription`.
- The standalone TypeScript SDK is now at `@notionhq/client` `5.21.0`, with
  typed support for `blocks.meetingNotes.query()` and the `agent_id` parent
  variant. Minimum standalone SDK support for `2026-03-11` is `5.12.0`.
- `@notionhq/workers@0.3.0` still peers against `@notionhq/client@^2.2.15`.
  Keep Worker experiment packages on the compatible peer until the Workers SDK
  publishes a v5-compatible range.
- Data-source and view-query pagination now has a 10,000-result query-depth
  limit. Large sync jobs should filter by edit time, use webhooks for
  incremental changes, or split large sources.
- Pagination cursors must be treated as opaque strings. Do not parse, validate,
  or assume UUID shape.
- Views, status properties, comments, file uploads, markdown content, meeting
  notes, and Notion MCP tools have all gained new API surface in 2026. Do not
  migrate a production package by string replacement alone.
- PATs are user-scoped and now have explicit Notion API and Workers capability
  bundles. Use PATs for local/developer-owned workflows, not shared production
  auth for many users.

## Priority Packages

| Priority | Package                              | Why it matters                                           | Current signals                                                           |
| -------- | ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1        | `packages/halfdozen-gmail-sync`      | Active Half Dozen production surface                     | Older `@notionhq/client` and database query/create patterns               |
| 2        | `packages/notion-agent`              | Closest existing product concept to Notion Custom Agents | API version `2022-06-28`, `/databases/{id}/query`, `archived`             |
| 3        | `packages/quickbooks-notion-mcp`     | Local/stdout package that may become client-facing       | API version `2022-06-28`, raw `/databases` calls                          |
| 4        | `packages/notion-sync-mcp`           | Dormant, but documents the two-way sync concept          | Mixed data-source query and database create/schema naming                 |
| 5        | `packages/halfdozen-notion-mcp`      | Active fleet, already mostly data-source aligned         | Verify SDK version and `2026-03-11` trash/append semantics before bumping |
| 6        | `packages/notion-worker-experiments` | Notion-native Worker spike                               | Keep Worker SDK peer compatibility separate from standalone SDK v5 audits |

## Search Commands

```bash
rg -n "2022-06-28|2025-09-03|2026-03-11|Notion-Version|notionVersion" packages/{halfdozen-gmail-sync,notion-agent,quickbooks-notion-mcp,notion-sync-mcp,halfdozen-notion-mcp}
rg -n "databases\\.query|/databases/|database_id|data_source_id|dataSources\\.query|dataSources\\.retrieve" packages/{halfdozen-gmail-sync,notion-agent,quickbooks-notion-mcp,notion-sync-mcp,halfdozen-notion-mcp}
rg -n "\\barchived\\b|in_trash|after\\b|position" packages/{halfdozen-gmail-sync,notion-agent,quickbooks-notion-mcp,notion-sync-mcp,halfdozen-notion-mcp}
rg -n "meeting_notes|transcription|agent_id|request_status|next_cursor|start_cursor" packages/{halfdozen-gmail-sync,notion-agent,quickbooks-notion-mcp,notion-sync-mcp,halfdozen-notion-mcp,notion-worker-experiments}
```

## `ntn` Probe Commands

Use the Notion CLI to test API assumptions before changing code.

```bash
ntn doctor
ntn datasources resolve <database-id> --notion-version 2026-03-11
ntn datasources query <data-source-id> --limit 5 --notion-version 2026-03-11
ntn api v1/users/me --notion-version 2026-03-11
ntn api "v1/pages/$PAGE_ID" -X PATCH in_trash:=false --notion-version 2026-03-11
```

Use `NOTION_API_TOKEN` only from a local secret manager or shell session. Do not commit tokens, generated response bodies with private workspace data, or verbose CLI traces.

## Migration Rules

1. Resolve database URLs into data source IDs before touching row-level APIs.
2. Keep database container operations as database operations when the API still expects `database_id`.
3. Use data-source APIs for schema/query/row creation where the SDK/API version requires it.
4. Update user-facing tool descriptions so agents ask for the right ID type.
5. Replace `archived` with `in_trash` only after the package is pinned to `2026-03-11` semantics and smoke-tested.
6. Review block append calls for `position` object compatibility before bumping the package API version.
7. Keep one package-level compatibility shim if public tool names still say `database`, but internally route to data sources.
8. Check query loops for `request_status.type === "incomplete"` when a data
   source or saved view can exceed 10,000 rows.
9. Verify Cursor/Custom Agent entry points update Linear rather than creating a
   parallel implementation queue in Notion comments.

## Package Notes

### `halfdozen-gmail-sync`

This is active production surface area. Treat migration as a compatibility change with a live smoke script.

Review:

- `@notionhq/client` version.
- `parent: { database_id }` page creates.
- `client.databases.query`.
- Worker direct-fetch Notion helpers.
- Add-on messaging that mentions database IDs.

### `notion-agent`

This package is a candidate for either retirement, migration, or reuse as a comparison point for Notion Workers Agent Tools.

Review:

- `NOTION_VERSION = "2022-06-28"`.
- Search filters constrained to `database`.
- Page parent type checks for `database_id`.
- Duplicate/archival jobs using `archived`.
- Whether the package should keep custom Cloudflare infrastructure or hand off future inside-Notion workflows to Notion Workers.

### `quickbooks-notion-mcp`

This package should not be promoted without Notion API review.

Review:

- Raw `/databases/{id}/query` calls.
- `NOTION_VERSION = "2022-06-28"`.
- Tool schemas that require `database_id`.
- Whether future client versions should use our MCP, Composio, or a Notion Worker Sync when the target is a greenfield managed database.

### `notion-sync-mcp`

This is dormant but strategically useful as prior art.

Review:

- Mixed naming: data-source queries hidden behind `databaseId` variables.
- `pages.create({ parent: { database_id } })`.
- `databases.retrieve` for schema.
- Whether a Notion Worker Sync can replace the greenfield mirror-table parts.

### `halfdozen-notion-mcp`

This package is already aligned with data sources for the active fleet.

Review before `2026-03-11`:

- `@notionhq/client` version.
- `archived` fields in page/block operations.
- `blocks.children.append` options.
- Any docs that imply old database IDs are acceptable for query/create tools.

### `notion-worker-experiments`

This package is the Notion-native Custom Agent spike.

Review:

- `@notionhq/workers` peer dependency before changing `@notionhq/client`.
- Whether each tool should remain read-only or require explicit user
  confirmation.
- Whether `context.notion` permissions should be supplied by the Custom Agent or
  by a local/hosted `NOTION_API_TOKEN`.
- Whether the hosted deploy is being run from Node.js `22+`, per Notion's Worker
  quickstart.

## Evidence Template

Record this in Linear when an audit or migration completes:

```text
Issue: CRE-___
Package:
Notion API version tested:
Commands:
- pnpm --filter <package> typecheck
- <package smoke command>
- ntn datasources resolve <database-id> --notion-version 2026-03-11
Findings:
Changes:
Residual risk:
Rollback:
```
