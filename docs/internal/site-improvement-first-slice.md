# Site-improvement foundation review

Local-only implementation started from `origin/main`
`33fcc0fd2335b04dfca6d860372db46cd4c43030` in sparse worktree
`/Users/micahjohnson/Documents/Codex/2026-10-06/task-4/site-improvement-worktree`,
branch `codex/site-improvement-first-slice-20261006`. The sparse checkout is
about 1.5 MiB. Unrelated source-checkout work was neither copied nor changed.

## Scope and ownership

- Database: experiment/adapter definitions, typed local records, evaluation
  evidence and append-only decisions. No persistent database was introduced.
- Automation: four pure public functions for validation, assignment, evidence
  joining/deduplication/evaluation and decision-history append. No IO or actuation.
- Judgment: exact bounded recipes, site consent/permission boundaries, outcome
  authority, a predeclared evidence plan and human review. No automatic winner.

The private `packages/site-improvement` core has no runtime dependencies or
framework/global-browser imports. The Agency adapter is an unused fixture with
all activation gates off. Its two copy variants share the same destination,
heading, layout, offer facts and terms. IO/LTD test adapters prove different
outcome contracts; LTD comprehension cannot be inferred from a click.

The earlier task-directory architecture packet was inspected at a different
source SHA. Current origin/main has a newer Agency hero (`Keep your tools
working.`), with a single primary action backed by
`agencyCoreMessaging.workflowMappingSessionHref`. The implementation fixture
uses that source and does not reuse the earlier two-button draft. This is
source reconciliation, not confirmation of the current deployed baseline.

## Validation and capacity

Cleanup was authorized and performed by another task. This task rechecked
6.24 GiB free and 46% memory free before creating the sparse worktree. No
installs, heavy builds, cleanup, service provisioning, public experiment,
production tracking, push or merge were performed.

An initial version of the core and disabled Agency fixture passed a focused
source-only TypeScript check with the existing repository compiler. Following
small refinements and adding the regression source, final type validation and
runtime tests require their own recorded result; the earlier compiler result
must not be presented as validation of subsequent edits.

Free storage subsequently fell to about 5.06 GiB, leaving about 64 MiB above
the required reserve. Additional Node validation processes were paused while
the reserve was that close. The evidence file records the final commands,
results and worktree disposition. A test source file is not a passing test run.

## Review limits and remaining gates

This is a fixture foundation. No live cookies, storage, rendering integration,
event emission or statistical inference are implemented. Receipt authority is
a trusted adapter input: the core cannot authenticate a server or attest that
an evidence reference is real. Native TS source exports have not been built
or published as a runtime JS package.

Before live integration: confirm Agency baseline/qualification, IO discovery
versus use, and LTD operating-library comprehension; resolve study duration,
attribution window, evidence thresholds and guardrails; review the server
consent/assignment receipt and measurement projection protocol; validate
cache rollback before lookup; retain Canon copy/accessibility/motion checks.
Scheduler client notifications remain diagnostic. External traffic remains
unverified. Raw contact data and readiness answers do not belong in analytics.

The existing Canon processor does not verify per-statement batch success
flags before aggregate updates, and server conversion IDs are freshly
generated. Do not infer accepted durable experiment measurement from prepared
event counts. Those are later adapter validation concerns, not changes in this slice.

Tracked implementation ownership belongs in Linear per repository guidance.
No external coordination write was made under the explicit local-only boundary.
This document is technical review evidence, not an alternate task queue.
