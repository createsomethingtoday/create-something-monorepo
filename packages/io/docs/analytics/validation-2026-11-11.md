# CRE-2415 implementation validation · November 11, 2026

This is the implementation handoff, not independent final review or production acceptance. Parent owns the independent Sol 6.1 re-test, integration and production promotion. No children were spawned; no merge, deploy, campaign send, external dispatch, scheduler mutation or real analytics submission was performed.

Checkout: T3-managed `t3/unify-audience-scorecard`, `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a3187418-307ce015c26a4c51`. Initially behind upstream; fast-forwarded to `origin/main` `5ddf3b3a0face7b0b76f20ae1aa4ccff22251449` before implementation. The dirty original root was not used. Existing-checkout registration succeeded with CRE-2415 and recorded actual branch/path/base in Linear. Worktree disposition: retained until parent independent review and release.

## Acceptance and three gates

| Gate | Status | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed for scoped local implementation | 11 SQLite-backed regression tests; full `.io check` passed with zero Svelte errors/warnings; `.io build` passed. Actual route exercised against local synthetic fixture responses. No deployed binding, production runtime, provider or live business-outcome verification. |
| Perceptual / product quality | Passed for local rendered output | Actual `/admin/analytics` viewed in T3 browser at 320, 390 and 1440 CSS pixels; discovery/usefulness/relationship/outcomes, daily trend, source rows and limits directly viewed. Loading/error/empty/partial states inspected. Keyboard definitions, focus outline and horizontal table scroll exercised. Parent independent review remains pending. |
| Release readiness | Untested for production promotion | Review artifact only. Parent must independently re-test, review D1 runtime capability and binding configuration, merge/deploy, verify live admin authorization/no-store/source coverage, and decide acceptance. No production release claim is made. |

Database: correct shared + Learn source coverage and temporal comparisons. Automation: bounded read/report pipeline and recovery. Judgment: conservative inclusion rules, no audience-total/person/retention claim, explicit unsupported outcomes, stored-vs-fresh newsletter distinction and operator-only MCP limitations.

## Regression evidence

Before the fix, three new regressions failed against the existing implementation: weekly default, private-path redaction and separate Learn/private cache coverage. [Original failure output](evidence/regression-before.txt). A focused read-only run of the `origin/main` endpoint also independently failed `learnReads > 0`, proving the coverage bug separately from the cache-header assertion: [coverage failure](evidence/coverage-before.txt). Temporary baseline source/test copies were removed.

The retained test suite executes actual report SQL against in-memory SQLite, including:

- Learn-only activity and missing/failed/over-limit source behavior.
- Most-restrictive session filtering, prior-period contamination, noncanonical hosts, automation, credential URLs and encoded private routes.
- Equal ISO/sqlite UTC boundaries with inclusive starts and exclusive ends; EXPLAIN confirms indexed event reads without a pre-cap sort.
- Eligible versus active/total audience; once-only confirmations; historical and seed sends excluded from period sends.
- Configured tagged newsletter visits and 30-minute resource use.
- Hub, routed and downstream layers remain separate; unknown/client keys excluded; missing route table remains null.
- Admin enforcement, JSON/download no-store, reusable Markdown, provider failure stays null.

Fixtures are offline evidence. They do not establish the presence/freshness/accuracy of production data.

## Commands

All pnpm invocations used `PATH=/opt/homebrew/bin:$PATH bash scripts/ona-bootstrap-local.sh pnpm ...`, preserving repo-pinned Node/pnpm without global installation.

- `pnpm bootstrap:worktree` — passed; optional global Wrangler absent, package-local tooling available.
- `infisical run --env=prod --path=/ --include-imports=true --silent -- bash scripts/ona-bootstrap-local.sh pnpm agent:claim-worktree -- --issue CRE-2415 --register-existing --worktree "$PWD" --base origin/main` — registered this actual checkout; no new checkout created.
- `pnpm --filter @create-something/io test:analytics` — 11 passed.
- `pnpm --filter @create-something/io check` — passed including content/newsletter/search/accessibility/experiment checks and zero Svelte errors/warnings. An earlier concurrent build/check invalidated generated Canon files; rerunning sequentially passed. No unrelated source was changed to repair that race.
- `pnpm --filter @create-something/io exec svelte-check --tsconfig ./tsconfig.json --fail-on-warnings` — repeated after UI polish.
- `pnpm --filter @create-something/io build` — content guards, full package lint, Vite build and Cloudflare adapter artifact. Repeated after polish before handoff.
- `pnpm auth:retired-provider:check` — checked the unchanged first-party auth policy after adding private cache headers to existing admin auth failures.
- `pnpm ground:review -- --base origin/main` — advisory result `no_analyzable_files`: duplicate analysis failed (zero files covered), orphan check completed for two new files. TypeScript/Svelte excluded as `duplicate_analysis_incomplete`; docs/JSONC/PNG/text unsupported. This is not a passed code-review gate. Full receipt: [Ground advisory exclusions](evidence/ground-advisory.txt).

## Actual rendered observations

T3 browser automation controlled the actual local SvelteKit admin route. A temporary loopback-only hook supplied synthetic JSON from `readWeeklyScorecard` fixtures, blocked local analytics ingestion and simulated outages/loading. That hook was restored to the production Identity/admin implementation before final validation. No fixture/auth bypass was committed. The server and owned browser tabs were closed afterward.

The first rendered pass found repeated long definitions obscuring comparisons and existing mobile navigation clipping. Definitions now live in labeled native disclosures, tables keep current/prior counts together, and the existing admin navigation wraps on narrow widths. The 320px table is intentionally horizontally scrollable; focused ArrowRight changed its scroll offset to 40px with a visible outline. The empty period displays explicit no-activity copy. A failed response displays Retry; after restoring fixture availability, Retry recovered populated data without zero substitution. Source gaps remain visible even when other reads succeed.

The supplied `/tmp/cs-analytics-review-20261111/analytics-review.html` was inspected with its recorded-session view; it established the separation of visit/session measurements and paired periods, not the old live admin layout. Three distinct Mobbin static images were inspected; citations and design translations are in the [operator runbook](weekly-review.md). No reference screenshots/assets were retained.

Saved screenshots below are **local synthetic fixtures**, not live audience evidence:

- [Desktop overview, 1440px](evidence/fixture-desktop.png)
- [Mobile navigation and controls, 390px](evidence/fixture-mobile.png)
- [Partial coverage and keyboard-scrolled table, 320px](evidence/fixture-partial.png)
- [Relationship snapshot](evidence/fixture-relationship.png)
- [Daily context](evidence/fixture-daily.png)
- [Source status rows](evidence/fixture-sources.png)
- [Loading](evidence/fixture-loading.png), [error](evidence/fixture-error.png), [empty](evidence/fixture-empty.png)

## Remaining gaps / rollback

Scheduler bookings and accepted map/workflow artifacts are unavailable pending safe owning aggregate contracts. No booking count is inferred from browser events or schedule-mcp D1. No client analytics are introduced. MCP reports operator-key activity only, with overlapping raw layers and tests/retries explicitly limited. Cloudflare visits, Substack reads and provider evidence are not ingested or summed with first-party sessions. Newsletter delivery is stored ledger evidence; fresh provider readback remains in the existing dedicated workflow.

D1 has no per-binding SQL read-only grant. New LMS/telemetry bindings are server-only; the report exposes fixed read queries, never arbitrary SQL, records, credentials or database selection. Parent should review that runtime capability boundary before promotion. Sources exceeding 20,000 traffic events across the two periods are unavailable rather than sampled. Session contamination checks cover observed windows/source only.

Rollback is a focused commit revert through review and redeployment of the previous .io artifact/config. Remove the added LMS/telemetry bindings if retained in target configuration. No data, consent, campaigns, tracking identifiers or scheduler state were mutated. CRE-2415 must remain open until parent release/live verification.


## Parent integration checkpoint

The initial builder handoff above is preserved as evidence of its scope. Parent integration subsequently restored safe acquisition categories and country context, added explicit booking-intent sessions, and integrated the scheduler's provider-free named service-binding receipt contract. Parent regression checks caught and fixed omitted delivery/prospects/mcp-access private routes. New tests retain first-view source attribution, referrer redaction, lookalike-host handling, scheduler result validation/unavailable behavior, and intent-versus-committed booking separation.

The report reader was executed with read-only Cloudflare D1 adapters against the actual shared, Learn and operator telemetry production sources for both 7- and 30-day windows. All three source reads succeeded and all five properties appeared. Raw events/credentials were not logged or committed; the private aggregate snapshots remain in local review artifacts. This is live source-read evidence, not verification of the deployed .io report or scheduler RPC.

Parent inspected the actual local Svelte route with captured aggregate responses at desktop and 390px, including source context, country disclosure, focus outline, no page overflow, failure and Retry recovery. Temporary loopback-only QA hooks blocked local analytics ingestion and were restored before checks. Horizontal keyboard scrolling needs independent re-test; a browser-driver ArrowRight attempt did not advance the new acquisition table. No production auth bypass or credentials were added. The live admin browser currently requires sign-in.

Scheduler runtime regressions and the final combined artifact still require independent review and production promotion/readback. Production is not complete at this checkpoint. Worktree disposition: retained until review and release verification.


## Independent final Sol 6.1 review

The independent reviewer found one P2 accuracy bug: two approved campaign landings in one session shared only the first landing's resource-use window. Parent demonstrated the regression, retained a test, and corrected it to keep each campaign's first landing before unioning qualifying session IDs. The reviewer independently reproduced resourceUse changing from 0 to 1 and reran all 15 analytics tests and eight scheduler reporting runtime tests successfully. No remaining blocking findings were reported.

The reviewer exercised the actual local route at 320 and 1440px, including loading, empty, partial, 503 and Retry recovery. No page overflow occurred. Native ArrowRight scrolled the acquisition comparison region to 80px after normal animation, with visible focus. No keyboard source change was required. The temporary loopback QA hook was restored byte-for-byte, and the owned server/tab were closed.

Functional and perceptual gates passed for local output. Release readiness remains pending deployed bindings, production RPC and authenticated .io readback; no production pass is inferred from these tests. Worktree disposition: retained until production verification.
