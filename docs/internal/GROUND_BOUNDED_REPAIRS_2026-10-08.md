# Ground bounded repairs — CRE-2250

Scope: command validation, failure reporting, hook isolation, and the two parser
compatibility cases reproduced during the Agency WebMCP review. No detector
promotion, broad rewrite, installed-binary replacement, release or deployment.
Base: `4582609a21b52ad641f143843b1776bb5fafd21d` on isolated branch
`codex/ground-bounded-repairs`.

## Changes and compatibility

- CLI/MCP share meaningful defaults: analyze duplicates + orphans; diff
  duplicates. Explicit empty, malformed and unknown checks are rejected.
- Add `outcome` while preserving existing `verification_status` values and MCP
  transport semantics. Analyze/diff exit 0 CLEAN, 1 FINDINGS, 2 INCOMPLETE or
  command error, 3 NOT_APPLICABLE. Incomplete required coverage takes precedence
  over findings. Legitimate no-new-file orphan skips remain explicit.
- `--advisory` preserves semantic JSON and restores exit zero only for callers
  that deliberately choose advisory behavior. Invalid commands still fail.
  The repository advisory wrapper accepts recognized semantic exit codes from
  new binaries and remains compatible with older exit-zero reports.
- Independent hook validators run when Ground is unavailable. Missing native
  checks are labeled UNEVALUATED. Missing registry validator blocks required
  registry validation. Existing duplicate/drift/legacy-prop checks remain
  advisory; lockfile/MCP/registry validation are not downgraded.
- Share Svelte script extraction across duplicate/import/export paths; ignore
  comments, quoted attributes and style content. Handle tree-sitter 0.23.2's
  import-type-generic grammar gap with a type-context AST projection that
  preserves byte/line spans and original evidence source. Reparse until recovered
  type contexts are handled; remaining syntax errors still fail.
- Update native smoke and fixture consumers to assert the new semantic exit
  contract, including backward compatibility where testing older releases.

This changes shell caller behavior for a future release. No version bump or
publication is included. Ground release provenance gates and release workflows
are unchanged. See the package README for migration details.

## Validation

Test-first RED/GREEN evidence was retained outside the repository for default
checks, semantic exits, hook isolation, parser cases, and independent-review
regressions. Final local runs used Rust 1.90.0 (one build worker) and pinned Node
22.21.1. Bootstrap verified the existing matching dependency lock; no application
build or global toolchain replacement was performed.

- Full Cargo suite: **219 passed**, zero failed; **2 pre-existing ignored doc
  examples**. Includes 12 GA calibration tests and new CLI/MCP/parser contracts.
- Relevant Node suites: **91 passed**, zero failed/skipped (hook, advisory review,
  adjudication, GA policy, public surface, adoption contracts).
- Native CLI consumer: **1 passed**.
- Existing native seeded trial, execution verifier, incremental verifier and
  native release smoke: all receipts `ready:true` (11 seeded cases, 5 execution
  checks; incremental freshness/CLI parity; language/provenance/trust smoke).
- Fresh isolated duplicate checks: unchanged main/release Tabs and MegaMenu,
  both UnifiedSearch revisions, generic import type and comment cases CLEAN.
  Malformed TypeScript remains INCOMPLETE/exit 2.
- Mixed duplicate + unsupported Python diff: finding retained, INCOMPLETE/exit 2.
  Advisory mode returns exit 0 but retains INCOMPLETE. Unknown checks and invalid
  Git baselines fail even in advisory mode.
- Shell syntax and `git diff --check` passed.

An independent reviewer inspected source and exercised the native CLI. Two
blocking findings were repaired with regressions: the old substring fallback
for script-less Svelte comments, and mixed findings/unsupported paths falsely
counting as complete. Final review: no remaining blockers in the bounded scope.

## Limits and disposition

This does not establish deployment-blocking detector precision. Svelte template
validation remains the compiler's job. Script-like strings in Svelte expressions
or nested DOM script elements remain parser boundary limitations; the README
states them explicitly. No cross-platform rebuild or full product build was run.
The local native artifacts initially report the clean base SHA because they were
built from an uncommitted candidate; the task closeout records the final commit
and an explicitly rebuilt exact-commit native artifact separately.

The requested local commit must run the tracked pre-commit hook. Its absent
release-build binary may leave native advisory checks UNEVALUATED; this must be
reported, not confused with the explicit native suite above. Independent staged
validators still run. No hook bypass, push, merge, release or deploy is authorized.

Worktree disposition: retained at
`/Users/createsomething/Documents/Codex/2026-10-08/task-2/ground-repairs`
for local review and a separately approved promotion decision.

## Approved promotion follow-up

After the local repair review, the operator authorized normal PR review, required
CI, merge, a verified versioned release, and installation on the current Mac.
Version 0.5.0 marks the CLI exit-contract change. Package manifests, the lockfile
and GA package version move together; all calibration thresholds and workflow
gates remain unchanged. Earlier scope statements above record the local-only
checkpoint, not the subsequent promotion authorization. The existing 0.4.3
installation remains a rollback reference, and its active Agency runtime will
not be replaced during concurrent release checks.

The release review also identified the published-package adoption verifier's
old exit-zero assumption. It now requires exact CLI outcome/exit pairs (CLEAN/0
for core, FINDINGS/1 for the intentional duplicate fixture), retains MCP outcome
and coverage assertions, and checks dead exports only through its existing
explicit-module calls. A regression rejects incomplete, mismatched and failed
process receipts. The Agency public instructions remain pinned to 0.4.3 pending
a separately coordinated site update; this release does not change that site.
