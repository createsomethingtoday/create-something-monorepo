# Durable Object cost safeguards — local review patch

Prepared 2026-10-09 on `codex/durable-object-cost-guards` from `103616f43099c6a475adb10e313e1cb36b2f2985`. No push, PR, deployment, production mutation, quota reset, or new credential provisioning occurred. Main checkout and other existing worktrees were preserved.

## Scope and priority

1. **Relay (confirmed deployed)**: finite validated 10-minute SDK-default idle timeout, keepAlive disabled, no scheduled wakeups, serial cancellable backups inside the running gateway container. Active traffic/WebSockets may still keep it running. This is an idle bound, not an account spend cap. Review `packages/relay/README.md` for availability and unsynced-data tradeoffs.
2. **Agentic executor (confirmed deployed)**: authenticated admission, singleton durable lifetime count/dollar quotas, duplicate receipts, full-task allocation before enqueue, conservative per-call reservation before provider calls, no SDK retries, wall-clock deadline, durable stop on uncertain outcomes. Adds an additive DO migration and fails closed for legacy messages/sessions. See `packages/space/workers/agentic-executor/COST_GUARDS.md`.
3. **PresenceHub (confirmed deployed)**: hibernatable sockets and persisted last 50 events, no timer. See `packages/app-governance-db/README.md`.
4. **Clearway realtime (not found under configured name in inspected account)**: no empty timer; persisted earliest-expiry alarms; hibernatable sockets; known facility/court validation before allocation/mutation; bounded cache and caller identity propagation. See its `COST_GUARDS.md`.
5. **Notion duplicate finder (class currently unbound)**: explicit page/deadline policy, bounded pagination/state, durable checkpoints and cancellation, no blind replay of uncertain writes. See its `COST_GUARDS.md`.

Live metadata from the prior audit confirmed current versions: Relay `780e5097-3f49-4f4f-b8ae-646f49a1a138`, executor `4c7cdf6f-8f4e-4ab6-9622-f3fdfba2add4`, app-governance-db `a3cd5574-0379-4401-bc85-c102fce123ac`. These receipts establish deployed bindings, not code equivalence or measured traffic. Historical usage/bill attribution and actual running-container status remain unresolved. Full audit/inventory evidence is retained outside this repository in the task workspace.

## Decisions required before deployment

Choose all required executor environment values listed in its policy document, including conservative provider prices, request limit, reservation, task and lifetime budgets/count, deadline and server credential. No business policy defaults were invented. Quotas do not reset or refund automatically. Correct tariff assumptions remain necessary; infrastructure spending and unrelated providers are outside this ledger.

Space now requires `locals.user.id`, a configured `AGENTIC_ALLOWED_SUBMITTER_IDS` comma-separated exact ID allowlist, and the same server-only `AGENTIC_ADMISSION_TOKEN`. No trusted identity-populating hook was found in the package: submission intentionally remains unavailable until that integration is selected and implemented. Never derive identity from an unverified browser header. Missing identity returns 401; missing policy returns 503. Authorized calls alone forward the credential. Same-origin checks and finite positive budget validation precede database/external work. Existing rejected submissions can leave a queued database record because insertion precedes executor admission; reconcile these records operationally.

Choose Notion page/deadline limits and eventual caller/account admission policy before binding this dormant class. Review Clearway's technical cache ceiling for intended facility size and deploy its callers with the worker. These checks do not replace existing member/payment authorization.

Validate container image integration/idle shutdown and actual Cloudflare alarm, restart, hibernation and migration behavior in an isolated environment. Rollback must preserve quota receipts and avoid returning to unauthenticated/unbounded execution. Old Relay availability behavior and old perpetual timers are not safe default rollback targets. Package documents contain detailed compatibility notes.

## Validation evidence

- Relay: 79 Vitest tests + 10 Node backup/supervisor tests pass; TypeScript and shell syntax pass.
- Executor: 15 focused regressions and strict TypeScript pass.
- Clearway/Notion: 18 focused regressions and scoped strict TypeScript pass; both Svelte checks report zero errors/warnings.
- Presence: all 30 package tests and TypeScript pass.
- Space: 6 admission/route regressions, 22 existing Workway tests and 6 search/workshop tests pass. Svelte sync/check reports zero errors/warnings. Persistent admission command: `test:agentic-admission`.
- Independent read-only source reviewer reran 48 regressions and found no remaining blocker to a local review commit. Optional follow-ups: byte-bound Presence history and stream-limit authenticated submission bodies before buffering.
- Storage/socket/provider doubles establish logic, not actual Cloudflare eviction or billing reduction.

The required fresh-worktree bootstrap was attempted but blocked by DNS access to package/toolchain hosts. No installs were performed; isolated node_modules links to preexisting installed dependencies enabled direct equivalent test/typecheck commands. `pnpm` was absent from PATH. Linear coordination was attempted but unavailable because its required API key was not configured. Ground native advisory checks are unavailable; independent commit gates must still run.

One initial executor test harness failed to intercept the SDK's captured Node fetch: a mock-only-key DNS attempt to api.anthropic.com failed ENOTFOUND. No real credentials or provider response were involved. That run was stopped; explicit Worker global fetch injection now keeps the passing tests intercepted and offline.

## Final gate outcome

Space's direct `vite build` passed using existing dependency outputs (no dependency prebuild/install). Adapter warning: `_routes.json` exceeds routing limits and drops 70 exclusion rules, causing unnecessary function invocations. This warning is outside the DO patch and merits separate cost review; no baseline build comparison was performed.

The normal `.husky/pre-commit` was run explicitly. Lockfile sync passed, but staged MCP coverage failed `Unexpected end of JSON input`. Reproduction: `git show :packages/clearway/src/routes/api/reservations/[id]/package.json` exits successfully with empty output; the existing gate interprets that as a manifest and JSON-parses it. No manifest exists at that location; the path contains Git pattern metacharacters. This is a gate path-handling issue, not evidence of missing MCP classification. The gate was not bypassed or modified. The reviewed patch remains staged with **no commit**. A separate small gate fix should use literal Git paths / existence checks, then rerun the gate before committing.

## Authorized gate repair follow-up

The prior commit blocker is repaired with one blob-read change: `git cat-file blob` replaces `git show` for index/HEAD reads. The CLI takes no path argument to quote, and `git --literal-pathspecs show` still returned empty success for the nonexistent bracket path. Literal blob reads preserve index-first/HEAD-fallback and every coverage requirement. Three temporary-repository CLI regressions cover a missing manifest under `[id]`, actual missing MCP coverage, and malformed JSON at a literal bracket path. Two failed before the repair; all seven existing/new gate tests passed after it. No thresholds, classifications or checks were removed.

### Required policy values and identity contract

All numeric executor environment values are nonempty numeric strings, finite and positive. Dollar allocations must be representable as positive safe-integer microdollars; reservation rounds upward and quotas downward.

| Name | Units / validated range or relationship |
| --- | --- |
| `AGENTIC_MAX_TASK_USD` | USD per task, at least call reservation and at most lifetime budget. Task input budget must lie between call reservation and this maximum. |
| `AGENTIC_LIFETIME_BUDGET_USD` | USD allocations across one durable ledger lifetime; no automatic reset/refund. |
| `AGENTIC_LIFETIME_TASK_LIMIT` | Positive safe integer distinct task admissions (1–9,007,199,254,740,991). |
| `AGENTIC_INPUT_USD_PER_MILLION` | Positive finite USD per million input tokens, approved conservative tariff including applicable overhead/surcharges. |
| `AGENTIC_OUTPUT_USD_PER_MILLION` | Positive finite USD per million output tokens, same tariff responsibility. |
| `AGENTIC_MAX_REQUEST_BYTES` | Integer bytes, 1–1,000,000, for admission and serialized model request. |
| `AGENTIC_CALL_RESERVATION_USD` | USD per call, at least `(maxRequestBytes × inputRate + 16,384 × outputRate) / 1,000,000`, at most max-task allocation. |
| `AGENTIC_SESSION_TIMEOUT_MS` | Integer milliseconds, 1–86,400,000; provider request at most remaining duration or 60,000ms. |
| `AGENTIC_ADMISSION_TOKEN` | Server-only shared credential, at least 32 characters, matching Space and executor; provision separately. |
| `AGENTIC_ALLOWED_SUBMITTER_IDS` | Space-only comma-separated allowlist of exact trusted `locals.user.id` values; nonempty. |
| `DUPLICATE_SCAN_MAX_PAGES` | Positive safe integer unique pages per scan; independent 96KiB persisted-state ceiling may terminate earlier. |
| `DUPLICATE_SCAN_MAX_DURATION_MS` | Positive safe integer milliseconds per full scan including archives; requests at most remaining deadline or 30,000ms. |

The Space identity contract requires a trusted server integration to populate `locals.user.id` from a verified user session, then exact allowlist authorization. The shared token authenticates the calling service only. Origin, when present, must match the request URL origin. Neither browser-supplied identity headers nor possession of a user-supplied ID satisfies this contract. No identity integration or production policy value was selected.

### Prioritized rollout and rollback

1. Review Relay availability/data-loss tradeoffs; stage the container image, backup cancellation and idle shutdown; promote separately only after approval. Roll back to a finite-lifecycle build, keeping scheduled wakeups disabled.
2. Configure approved executor tariffs/limits and trusted Space identity first. Test additive quota migration and caller/worker pair in an isolated environment; reconcile legacy queued/running sessions, then separately approve promotion. Preserve quota namespace/name/receipts on rollback and retain fail-closed admission; never reset or replay uncertain model work.
3. Stage PresenceHub reconnect/eviction/history delivery, then approve its release. Retain persisted history; avoid reverting to continuously resident sockets as a routine rollback.
4. Keep dormant Clearway/Notion unexposed until admission policies are reviewed. Stage Clearway callers/worker together, validate alarms/cache capacity; choose Notion limits and account quotas, validate checkpoint/cancellation. Roll back by stopping new admission in a separately approved release and reconciling outstanding state, rather than restoring perpetual timers/blind write retries.
5. Compare provider usage, container running time and Workers/DO usage after each approved deployment. Investigate Space's routing-exclusion build warning separately. No measured savings are claimed by this patch.

Final follow-up verification: independent reviewer approved the literal-path repair and independently reran all 7 gate tests. Full normal pre-commit passed lockfile synchronization and staged MCP coverage; Ground remained unavailable/advisory. Missing ancestor-manifest diagnostics are expected fallback probes and do not fail the repaired gate. Total reported passing tests across distinct listed suites: **193** (Relay 89, executor15, Clearway7, Notion11, Presence30, Space34, gate7). Independent reruns are not double-counted. The earlier no-commit gate outcome above is superseded by this successful repair and local review commit.
