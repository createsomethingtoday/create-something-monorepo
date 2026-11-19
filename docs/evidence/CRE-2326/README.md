# CRE-2326 scoped graph explanation candidate

The implementation adds one read-only answer: why a Control run is blocked,
who explicitly owns the next work, and which evidence the owning host needs.
See the [operator contract](../../../packages/owned-agent-runtime/docs/control-graph.md).

## What was implemented

- Strict host registrations bind exact scope, workflow/version, runtime/artifact
  hashes, Build release, contract/policy, immutable Linear issue identity,
  canonical Substrate node, and step/action ownership.
- The D1 composition uses the existing scoped Control and verified Build/runtime
  readers. A trusted manifest authority defines the serial frontier. Repeated
  parent/proof reads reject a changing runtime view.
- Linear/Substrate source ports retain canonical IDs, revisions/digests,
  observation times, and evidence pointers. Missing/stale/conflicting source
  evidence withholds unsupported ownership claims. Actual source adapters and
  production registrations remain host configuration work.
- REST `GET /v1/control/runs/:runId/explanation` and MCP `control_run_explain`
  reuse Identity, admission, and run authorization before any graph read.
  Only the transport adds Identity provenance. Scope overrides and command
  bodies are rejected; unconfigured evidence fails closed.
- Reason and requirement semantics distinguish approval waits/expiry/rejection,
  compiled stops, redacted operator stops, ambiguous effects, recovery, running
  attempts, and terminal states. Role advice binds the exact frozen policy hash
  and remains separate from the Linear work owner. No response grants permission.

## Test-first and source verification

The transport's initial route/tool checks failed before implementation. The
signed-artifact/SQLite integration initially returned 503 from the unimplemented
reader, then passed with actual existing compiler admission, D1 scope, runtime
proof, and verified Build binding code. A proxy permits only SQL SELECT reads.

Semantic regression checks exposed three additional issues before their fixes:
approval rejection hidden by a generic stop, advice using roles from a different
policy digest, and misleading ready/execution requirements for compiled stops or
cancelled parents. Their corrected checks pass.

The 17 focused semantic checks, five registration checks, six new transport
checks, and ten existing transport regressions pass under the pinned toolchain.
The package typecheck, export lookup, formatting, prose check, and diff check also
pass. Independent final re-test details are recorded in Linear with the PR.

Independent Sol 6.1 re-ran the final package typecheck, all 191 runtime tests,
and all 17 offline graph tests successfully. It directly inspected generated
waiting, rejected, stopped, ambiguous, and completed explanations, reviewed the
complete operator guide, and found no actionable source issues. Its product
verdict passes for the candidate; its live release verdict remains held. Prose
checks passed with zero findings.

All positive runtime/read-boundary tests use synthetic fixtures. The local
integration uses real cryptographic artifact verification and actual SQLite
readers, but it does not establish a live workflow or production acceptance.
The generated example is labeled `synthetic_not_live_acceptance`.

## Actual live observations and hold

The connected Cloudflare tool inspected the production Worker configuration and
ran only read-only database inventory queries. The retained
[live inventory](live-inventory.json), observed at `2026-11-02T20:32:10.055Z`,
reports:

- Control runs: zero.
- Workflow-runtime runs: zero.
- Verified Build bindings: zero.
- Rows written and database changes: zero.

The deployed Worker had Identity issuer/audience/JWKS bindings but no optional
Template Review deployment, workflow artifact R2, or runtime queue bindings.
A separate live health GET returned 200; an anonymous proof GET returned 401.
Those observations verify availability/isolation only for the existing surface.
They do not exercise the new explanation route or authenticate an administrative
inventory as a tenant-scoped graph result.

**Real-run acceptance is held.** No authorized recorded run is available in this
environment, and the new read-only host composition has no production source
adapters or canonical case bindings configured. No activation, registration,
executor, source invocation, runtime run, credential, database migration, or
deployment was created to manufacture acceptance.

To finish, supply an existing authorized internal run and its owning host's
trusted registration, explicit canonical bindings, Identity access, and read-only
source adapters. Alternatively, scope and authorize an internal canary through
the normal owning promotion path. Verify the blocker/owner/evidence answer,
cross-tenant denial, stale/unknown behavior, and unchanged run/source state before
calling this operational.

## Quality gates and disposition

- **Functional correctness:** offline implementation checks pass; real-run
  functional acceptance is untested and blocked by the inventory above.
- **Perceptual/product quality:** actual synthetic JSON and complete operator
  instructions are reviewed independently. No graphical UI is included.
- **Release readiness:** held for live use. The candidate is suitable for draft
  code review; no production activation or deployment is claimed.

Rollback removes the optional reader/transport wiring; it needs no database or
external state reversal. Worktree disposition: preserved at
`/tmp/cre-2326-graph-control` on `codex/cre-2326-graph-control` until the recorded-run
acceptance checkpoint. CRE-2326 remains open while that checkpoint is held.
