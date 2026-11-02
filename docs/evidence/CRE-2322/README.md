# CRE-2322 offline graph pilot evidence

Implemented the approved offline execution-evidence graph in
[scripts/graph-engineering](../../../scripts/graph-engineering/README.md).
The pilot projects a signature-verified compiler artifact and a consistency-checked
runtime export, with separately labeled Symphony review evidence. It has no
execution, approval, retry, source-write, or network port.

## Acceptance and verification

Builder and independent Sol 6.1 reviewer each ran:

- `pnpm graph:evidence:test`: 17 checks passed, including actual CLI subprocesses.
- `pnpm --filter @createsomething/workflow-runtime test`: 29 tests passed,
  including serial-only graph validation and receipt/checkpoint invariants.
- `node --test packages/database-layer/test/ontology.test.mjs`: 13 tests passed,
  including root-change digests/impact and relation vocabulary parity.

Commands used the repository-pinned Node 22.23.4/pnpm 9.15.0 toolchain through
`bash scripts/ona-bootstrap-local.sh`. Both compiler and runtime type checks
also passed. Formatting and `git diff --check` passed.

The CLI tests verified identical output for identical inputs/key, unchanged source
and key bytes, rejection without partial stdout, and real export projection with
filesystem writes and child-process spawning denied by Node permissions.
Adversarial cases cover the trusted signer, tampered artifacts/state, exact
artifact bindings, unknown input fields, scope mismatch, missing explicit joins,
conflicting identities, duplicate observations, freshness, attempts, and approval
waits. Independent probes additionally rejected standalone redacted proof JSON
and missing receipt task references.

The reviewer found one operator-documentation issue: the required-field table
omitted `schemaVersion`. The builder added its exact required value and verified
the corrected table. The final README prose check passed with zero findings.
No behavior changed after the independent functional re-test.

## Quality gates

- **Functional correctness: passed for offline synthetic evidence.** Owning
  compiler/runtime verification is exercised. No live runtime or external effect
  was tested.
- **Perceptual/product quality: passed for the CLI and operator instructions.**
  Actual JSON output was inspected, and the independent reader finding was fixed.
  No visual UI or graphical graph viewer was built or assessed.
- **Release readiness: passed for the local prototype and review handoff.** Scope
  is isolated and a targeted CI workflow is included. Hosted CI results and PR
  promotion are recorded in Linear separately; this report does not claim them.

## Current baseline and limits

The earlier ontology finding concerned an older dirty checkout. Fresh
`origin/main` at `10930f7f5` already preserved roots and included the relevant
regressions. This change verifies that fix rather than implementing it again.
Unrelated changes in the original checkout were preserved.

Runtime hash-chain consistency is not export authenticity; the graph explicitly
labels the raw runtime export `unattested_offline_export`. Symphony evidence is
`schema_validated`. Scope remains `caller_declared_not_authenticated`.
Cross-system bindings are explicit digest-bound declarations. The
`runtime_to_substrate` connection remains unresolved. No hosted adapter, scheduler,
fork/join migration, runtime command, Atlas writeback, or production deployment is
included.

Rollback removes the pilot scripts, package commands, navigation link, and CI
workflow. No external state or database schema changed.

Worktree disposition: preserved at `/tmp/create-something-graph-evidence` on
`codex/graph-evidence-pilot` until PR review completes.
