# Tasks and context search: bounded source diagnosis

Source inspected: `611c3a263036d726eda5627d7f2ffb5200f6067d`, compared with `971bfda734ce3ea65e52abed268056554e88a5f5`. Read-only diagnosis; no client database, credentials, CTX index, runtime configuration, source refresh, ingestion or reset accessed. Synthetic fixtures used temporary directories and were removed. No production fix is claimed.

## Runtime attribution

The native CREATE SOMETHING GiGi app in this repository has `gigi_records_list` and `gigi_context_search` in `src-tauri/src/bin/gigi-mcp.rs`. Context dispatch validates the local workspace, invokes the packaged `gigi-integrations` companion with `GIGI_DATA_DIR`, then reaches `packages/gigi-integrations/src/runner.ts` and `ctx.ts`.

The separate `gigi-team/grantbot` checkout contains Brain Worker owner-task APIs (`apps/brain-worker/src/grant-brain.ts`) and a separate native runtime. Its `docs/RUNTIME-AUTHORITY.md` explicitly separates local/native tools from cloud serving authority. Its recorded September runtime receipts are historical, not current client proof. No matching `gigi_context_search` or `gigi_records_list` symbol was found in its current apps/packages search. The native tool names and error shape strongly suggest this repository's MCP, but a paraphrased task result and a `ready_for_review` status do not establish runtime identity. Task status is not a unique fingerprint.

Required attribution evidence: exact tool/server name, sanitized arguments/response, installed app version/build or MCP executable identity, and workspace identity match. Do not infer a cloud outage from a local query.

## What one saved task means in native GiGi

`domain.rs:649` lists rows from the requested entity table, constrained by `workspace_id`. For tasks it does not filter status, title or date. It returns database `count`, a bounded page (default20, maximum50), and `nextCursor`. Therefore an actual native response with count1 and nextCursor null proves one persisted task in that local workspace at that read. It does not prove there are no obligations in Gmail, Calendar, another workspace, cloud Brain, conversations, or unapproved proposals. October update time is record metadata, not evidence source synchronization ran then.

The Tasks collection (`web/app.mjs`, `collection`) renders the returned records and Load more when nextCursor exists; no hidden task status filter was found. Overview is a separate summary: active-status filtering and a five-item bound apply there (`domain.rs`, overview queries). Compare the full Tasks collection rather than Overview when accepting counts.

## Source-to-task pipeline

1. A user explicitly imports a bounded source page via `connections.import`.
2. `import-adapter.ts` maps Gmail to `interactions`, Google Calendar to `schedule`; neither maps to `tasks`.
3. `lib.rs` routes the import through `source_import::persist_page`: provider/account/workspace validation, maximum25 rows, per-record saved receipts, partial failure/retry cursor, deduplication and preserved local corrections.
4. A task is created by explicit record save or a selected imported-source proposal. Embedded chat captures the exact source snapshot and holds `gigi_records_save` for human approval (`codex.ts`). Domain source conversion creates a linked local task/gig and returns an existing target unchanged for a duplicate source.
5. Chat recommendation/prose alone is not a saved task. Connecting a source alone is not import completion. Source import completion is not task extraction. There is no unattended automatic task-population pipeline in this native path.

CTX is supporting local history, not the task database. `context.sync` exports SQLite history as `gigi-history.jsonl` with provider `gigi-local`, then explicitly imports it. Context search uses lexical search, refresh off, and a dedicated scoped data root. It does not populate tasks and does not search the operator's default CTX history or the separate cs-history tunnel.

## Exact invalid_configuration origins

`packages/gigi-integrations/src/ctx.ts` is unchanged between 971bfda and 611c3a263. The runner's context branch is also unchanged; later runner changes concern Instagram/provider handling.

The same error is produced by:

- Invalid adapter dataRoot/importRoot/sourceId (constructor; the native runner normally supplies absolute app-owned roots and no sourceId).
- Search query blank after trimming or longer than200 characters.
- Search limit outside integer1–5.
- Dedicated CTX root already nonempty without config.toml.
- Existing config.toml not byte-for-byte equal to the manual/no-automatic-sources/no-auto-upgrade policy.

A CTX subprocess lease/permission failure maps to `unavailable`, not this adapter's `invalid_configuration`; a missing executable maps to `missing_dependency`. Neither remote authentication nor an index lease error can be concluded from the reported code alone. Do not repair permissions, replace configuration, re-enroll or authenticate based on this diagnosis.

Confirmed ordinary contract gap: the MCP context schema currently advertises a generic integer limit/string query without the adapter's maximums; the resulting error also conflates invalid input and unsafe/incompatible local configuration. This can independently cause confusing invalid_configuration responses but is not established as the client's cause. Recommended bounded follow-up (requires coordination with the release owner): advertise maximum5/minimum1 and query bounds, separate input validation guidance from configuration safety rejection, and add regressions. Do not loosen scoped-root policy.

## Validation

- Existing `packages/gigi-integrations/test/ctx.test.ts`: 2/2 passed (isolated search, bounded cited snippets, staged-only imports).
- Direct `runOperation` synthetic cases: limit6; query201 characters; mismatching config.toml; nonempty root without config. All four returned exactly `{ok:false,error:{operation:"context.search",reason:"invalid_configuration"}}` before a nonexistent fixture executable could be invoked.
- No real CTX executable, source provider, client device or database used. No code changes made for this diagnosis.

## Client acceptance still required

1. Identify actual app/runtime, workspace and tool invocation; provide sanitized response fields and timestamp.
2. Within explicitly authorized client access, compare Tasks collection and native tasks list count/pagination; inspect only relevant record provenance/history and source import receipts. Do not dump private tables or credentials.
3. Check whether more tasks were actually approved/saved, merely suggested, or belong to another runtime. Compare source-page completion/failures with imported interaction/schedule counts, separately from tasks.
4. Capture context search query length, limit, and whether it fails before subprocess invocation. If inputs are valid, obtain a narrowly scoped diagnostic indicating dedicated config presence/policy match, without modifying it or reading unrelated history.
5. Confirm a synthetic approved source-to-task flow on the intended runtime and read it back in UI. This has not been done on the client's installation.

Current conclusion: native source does not support the assumption that all connected-source obligations auto-appear as tasks; no task-loss/filter defect is proven. Context failure has multiple verified local causes, and its client-specific cause remains unknown pending the bounded evidence above.

## Prepared correction after diagnosis

The candidate now advertises the existing context query/limit bounds and returns allowlisted, privacy-safe diagnostic guidance for invalid arguments versus scoped configuration rejection. It preserves `invalid_configuration` and does not change configuration, credentials, permissions or task ingestion. Synthetic regressions cover these categories and prevent raw causes/paths from appearing. This improves diagnosis; it does not establish or repair Grant’s specific failure.
