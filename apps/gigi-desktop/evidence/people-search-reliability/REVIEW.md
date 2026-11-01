# People search reliability review — 2026-10-20

Prepared on `codex/gigi-people-search-reliability` from released-main `e4a6654c6e496e215b17f1600873dc916719a135`. This is a local tested patch, not a published installer. The grantbot visual proposal remains on its separate branch.

## Confirmed defects and correction

1. The previous predicate used a contiguous, lowercased substring. `latasha baxter` did not match `Latasha Nicole Baxter`. The new predicate splits Unicode whitespace, folds case and canonical diacritics, and requires every token within the same contact's title, Contact field, email, phone or linked company titles. Reversed words work. No original values are rewritten. This is substring token matching, not fuzzy spelling correction or transliteration.
2. The previous correlated company subquery repeated company/relation work for each contact. The exact baseline SQL on 4,459 synthetic contacts, 200 companies and 4,459 links consumed 815,429,000 SQLite VM steps in five seconds before producing any row; the harness interrupted it. Two workspace-scoped scans now use relation endpoints and company primary keys, followed by contact matching. Final scan pair: 191,790 VM steps. The multi-query regression sequence completed in 592 ms on this host (not a user-facing latency guarantee). Both scans share one read snapshot.
3. The UI had no deadline for an unresolved native read, and the initial People load could race a later search. A shared read wrapper now bounds UI waiting at ten seconds, consumes late outcomes, cancels superseded UI waits, and guards route/workspace/query changes. Initial load, filtering and pagination use this path. Timeout gives Retry/Clear guidance and explicitly says the native read may still finish. This does not cancel SQLite work.

## End-to-end data and query trace

| Layer | Verified structure and implications |
|---|---|
| Contact schema | `src-tauri/migrations/notion_fields.json`: Contact is Title; Email and Phone are scalar fields, Company is a relation. Separate First Name/Last Name fields are unsupported and rejected by records.save. |
| Canonical name | `web/app.mjs` editor calls its top-level `title` input Name. `domain.rs` stores it in contacts.title; lists display that value, truncating only the returned preview at 120 characters. Matching uses the full stored title. No first/middle/last-name reconstruction happens. A stored Contact field can differ from title; the patch searches both, and a regression covers this supported variant. |
| Import paths | `source_import.rs` currently maps Gmail to interactions and Google Calendar to schedule, not contacts. `packages/gigi-integrations/src/import-adapter.ts` creates message/event titles. Generic records.save validates supplied title/fields and source attribution; backup restore copies a compatible same-workspace database rather than reconstructing names. The historical mechanism that populated Grant's contacts is not established by these source paths. No inferred contact import or live reimport was run. |
| Storage/indexes | Local gigi.sqlite schema v1, JSON fields and relation table, workspace/update/id index, source uniqueness and record-index foreign keys. WAL and existing five-second busy timeout. No FTS index and no schema migration in this patch. |
| Search | Nonempty records.list contact queries use the two scans. Contacts and company relations are scoped to the requested workspace. Both relation directions work; reverse duplicates cannot duplicate results. Private notes and unrelated records are not searched or returned. |
| Sort/pagination | updated_at descending, then id. All matching happens before offset/limit; count covers the full matching set. Default page20, max50. No page-local sorting/filtering. Offset pages are separate snapshots; concurrent record edits between pages may still shift positions. |
| Bridge | web/bridge.mjs passes workspace/entity/query/cursor to Tauri dispatch. Native work runs in spawn_blocking. Response stays `{items,count,limit,nextCursor}` with compact records, not searchable private field payloads. |
| UI lifecycle | 150ms debounce; captured query, route and version checks; superseded/late outcomes ignored; timeout/failure clears loading. Load-more uses the same deadline. Clear/Escape restores the full list. Detail/back retains query and existing editor protection remains. No runaway reactive loop was found. |

## Verification

- Desktop suite: 207 passed, zero failed; two installed-companion tests skipped because this run did not set GIGI_INSTALLED_MCP.
- Native suite: 100 library + 7 MCP + 1 stdio tests passed, zero failed. Initial sandboxed full run could not create test IPC; rerunning with authorized local IPC passed. No checks were weakened.
- Regression coverage: 4,459 and 5,000 contacts; company matches across four pages; last-record name/email/phone; reverse links and duplicates; workspace isolation; middle/reversed/exact names; Unicode case, decomposed accents, whitespace and NBSP; supported Contact alias; unsupported split-name fields; no private-note matches; WAL concurrent writer; bounded exclusive-lock failure and retry.
- UI harness covers unresolved deadline, late success/failure, superseded requests, route change, opening-load races, pagination races and retry.
- Native acceptance used a fresh database generated solely from repository schema and synthetic rows: 5,000 contacts, 200 companies, 5,000 links. Verified full/middle/reversed queries, Danny Morgan at record4,999, detail/back query retention, Escape restoring5,000, company filtering25 with Load more20→25, and no-results clearing loading. Closed review app afterwards. The installed app and real user records were untouched.
- Screenshots and logs: task `release-evidence/people-search/`, specifically `native-scale-middle-name.png`, `native-scale-cleared.png`, `native-scale-no-results.png`, `rust-all.log`, `desktop-all.log`, `scale-final.log`, `baseline.json`, `name-red.log`. `reproduce.py` is pinned to baseline source for repeatable old-query evidence.
- `git diff --check` passed; local debug build passed. Native review launch initially failed because /tmp is a symlink rejected by Tauri path protection; canonical /private/tmp resolved it without weakening protection.

## Limits and proposed release scope

These are confirmed code defects and synthetic/native corrections, not a verified diagnosis of every condition on Grant's machine. His actual company/link counts, lock state, build, request duration and historical import mapping remain unknown. A still screenshot cannot establish a permanent hang. The separate chat error is not proven to cause search failure. The Latasha screenshot belongs to Create Something, not necessarily Grant's workspace.

Recommend a search-only patch containing token matching, company-query scalability and UI wait/race cleanup, plus regressions. No migration, data rewrite, credentials, account changes, unrelated visual changes or new installer publication in this task. Exact release CI, packaging and live Grant acceptance remain future gates. Very large datasets still incur a full local scan per query; cancellation bounds the UI wait rather than aborting native reads.

A proposed copy of an older purported test database was rejected before execution because its provenance was not established. The completed acceptance instead used a brand-new schema-only database; no unknown dataset was copied. No current implementation blocker remains.
