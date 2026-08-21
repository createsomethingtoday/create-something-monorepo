# @create-something/symphony

Linear-backed orchestration runtime for Codex workers.

Symphony watches a workflow definition, queries Linear for ready work, creates isolated workspaces, starts Codex-backed workers, and reports progress back to the tracker. It is the repo-local automation loop behind commands such as:

```bash
pnpm symphony:code-quality
pnpm symphony:code-quality:once
pnpm symphony:policy
```

## Core Flow

1. Load a workflow file from `automation/symphony/**/WORKFLOW.md`.
2. Validate dispatch config from the workflow frontmatter.
3. Query Linear through the tracker client.
4. Prepare or reuse an isolated workspace.
5. Start an agent worker and stream status events.
6. Preserve completed worker evidence and the workspace for an independent completion decision.

Generic workflows default to `completion.mode: evidence_only` with a non-active, non-terminal `completion.handoff_state` of `In Review`. A successful worker comments a structured handoff, leaves Linear non-terminal, preserves the workspace, and enters an observable `awaiting_completion` state that suppresses redispatch. Symphony persists that state and its handoff payload beside workspace metadata, restores it before candidate dispatch after a process restart, and resumes interrupted Linear delivery within the same three-attempt bound; each failed attempt is persisted before backoff. Workflow reloads cannot change the completion mode, tracker, or workspace owner captured for an already-dispatched worker. If marker persistence fails, Symphony moves the issue to the configured Linear handoff state and restores that project-and-label-scoped fallback into reconciliation after a restart; if both durable paths fail, daemon dispatch halts and `--once` exits nonzero. Unreadable or mismatched markers also fail closed. Long-running services reconcile terminal handoffs and clean their workspaces without requiring a restart. An exhausted handoff remains non-terminal, suppressed, and visible with its last error. The temporary `worker_exit_legacy` mode retains the old auto-completion behavior only as an explicit migration escape hatch, ignores the unused handoff-state constraint, and emits a gate-bypass warning.

## Canonical Completion Gate

`CanonicalHarnessGate` is the evidence-to-done boundary for canonical harness
runs. It computes eligibility from a strict v1 receipt, verifies that the run
directory resolves beneath the evidence root, and publishes the result through
an atomic no-clobber hard link to
`output/canonical-agent-harness/runs/<run_id>/receipt.v1.json`, then reads and
revalidates that exact persisted receipt immediately before calling the
tracker's terminal completion seam. It also re-resolves the receipt's Linear
identifier through the tracker and requires the authoritative issue ID to match
the completion request before that mutation.

The gate requires source diff or verified no-op evidence, direct results for
every acceptance criterion, lane-appropriate stage receipts, independent
read-only review plus rollback proof for A2/A3, and matching promotion and live
proof for A3.
A4 is never eligible for autonomous completion. Unknown fields, caller-supplied
eligibility, unresolved actionable findings in any lane, issue-identity
mismatches, path escapes, duplicate run receipts, corrupt receipts, and tampered
computed fields all fail closed without a tracker mutation.

Stage evidence uses Symphony's existing `multi-agent-evidence-receipt.v1`
contract directly. The gate binds each receipt to the canonical run, Linear
issue, and expected role, and treats a nonzero verification command as a failed
stage even if its reported status says `passed`.

The gate and schema are exported as `@create-something/symphony/canonical-harness-gate`
and `@create-something/symphony/canonical-harness-receipt-schema`. Existing
workflow routing remains evidence-only until the canonical router adopts this
gate in its owning migration.

## Executor Routing v0.1

Symphony exports a strict, provider-neutral executor decision and receipt from
`@create-something/symphony/executor-routing-contract`. The paired contracts
bind one Linear issue and run to the selected candidate, approved fallbacks,
authority, data boundary, budget, exact executor identity, acceptance evidence,
and landed cost. `verify_executor_routing_pair` prevents a receipt from naming
an executor that was not selected or approved as a fallback.

`next_executor_routing_action` is the deterministic relationship algorithm. It
turns a valid decision plus the latest bound receipt into one bounded action:
execute the selected candidate, accept, evaluate a shadow challenger, execute
or request an approved fallback, escalate, or block. The function cannot add a
provider, widen authority, increase budget, or promote a challenger.

Candidate lists are options, not parallel agent dispatch. A1 base work uses one
selected executor; fallbacks run sequentially after failure. A0 duplicates a
run only for sampled baseline-plus-shadow comparisons. A2/A3 use separate
worker, reviewer, and integrator sessions because those lanes require
independent evidence.

The current policy keeps native Codex as the production default. OpenRouter is
restricted to approved A0 shadow comparisons with Responses compatibility,
zero-data retention, provider/model allowlists, and a positive spend cap.
Direct Z.AI Coding Plan is ineligible while its documented coding endpoints do
not expose the Responses protocol Codex custom providers require. See
`docs/policies/v1/policy.executor-routing.v1.md` for the trigger table and
provider boundary.

## Agent Legibility Contract

| Field               | Value                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point         | `packages/symphony/src/cli.js`, `packages/symphony/src/orchestrator.js`, `packages/symphony/src/tracker/linear.js`, `packages/symphony/src/canonical-harness-gate.js`, `packages/symphony/src/executor-routing-contract.js` |
| Boot command        | `node src/cli.js ../../automation/symphony/code-quality/WORKFLOW.md --once`                                                                                                                                                 |
| Smoke command       | `pnpm check && pnpm test`                                                                                                                                                                                                   |
| Validation surfaces | node syntax check output, node test output, executor routing decision/receipt schema, canonical receipt schema and persisted receipt, Linear tracker events, worker workspace metadata                                      |
| UI validation path  | none                                                                                                                                                                                                                        |
| Escalation rule     | stop if Linear issue state, workspace cleanup behavior, or Codex worker status cannot be reconciled with the workflow file and tracker evidence                                                                             |

## Development

```bash
pnpm --filter @create-something/symphony check
pnpm --filter @create-something/symphony test
```

Run a workflow once from the repo root:

```bash
pnpm symphony:code-quality:once
```

Run the contract-native reviewed pilot against one exact active Linear issue:

```bash
pnpm agent:loop-pilot:reviewed:check -- --issue CRE-1154 --json
pnpm agent:loop-pilot:reviewed -- --issue CRE-1154 --json
```

Set `SYMPHONY_CODEX_COMMAND` to an account-authenticated app-server command when
the ambient `codex` binary is not the runtime you intend to exercise. Explicit
app-server errors and failed turn completions fail the reviewed run.

The reviewed path starts separate worker, reviewer, and integrator Codex
sessions in one isolated workspace. The reviewer receives a read-only sandbox,
and repository fingerprints before and after review must match. The command
preserves the workspace, writes an aggregate receipt under
`output/agent-loop-pilot/`, and comments Linear without marking the issue done.

Use Infisical for Linear credentials when running against live work:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm symphony:code-quality:once
```
