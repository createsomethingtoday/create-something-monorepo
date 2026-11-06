# Explain a Control run through its evidence

The read-only graph query explains why a run is waiting or blocked, identifies its
explicitly bound work owner, and lists the evidence the owning host still needs.
It never grants execution or approval authority.

This is an implementation candidate for CRE-2326. **Real-run acceptance is
blocked:** the live runtime database inventory on 2026-11-02 returned zero Control
runs, zero workflow-runtime runs, and zero verified Build bindings. The deployed
Worker also lacked the optional workflow host bindings. No activation, executor
registration, source call, or runtime run was created for this work.

## Read boundary

When an owning host configures an explanation reader, clients can use:

```text
GET /v1/control/runs/{runId}/explanation
MCP control_run_explain {"run_id":"<existing-run-id>"}
```

Both paths resolve the existing first-party Identity bearer credential and
admission checks, then call the same tenant-scoped Control run service before
reading any graph evidence. The request supplies only the run ID. Scope comes
from verified account, tenant, and workspace claims. Query overrides, unsupported
methods/bodies, and unknown MCP arguments are rejected.

An anonymous request returns 401. Missing and out-of-scope runs share an opaque
404 response. Unconfigured, inconsistent, or changing evidence returns
`control_explanation_unavailable` with HTTP 503. MCP preserves its existing
JSON-RPC framing. Re-read after temporary unavailability; do not substitute an
offline JSON proof or repair hashes to make an explanation appear valid.

The default deployed entrypoint does not configure this new reader. Importing
the factory or deploying the transport alone does not provision its sources or
create a usable graph. Wiring a real internal case remains a separate, recorded
host-configuration checkpoint.

## Configure the owning host

Use `createD1ControlGraphExplanationReader` beside `createControlRunWorker`.
The factory creates the existing scoped D1 run reader and verified Build/runtime
proof reader. It requires these host-owned inputs:

- The runtime database and a trusted manifest authority that verifies the exact
  registered compiler artifact. No caller-supplied manifest enters this path.
- `RegisteredControlGraphBindings`, containing explicit scope, workflow version,
  artifact/runtime digests, Build release, contract/policy hashes, immutable Linear
  issue ID and identifier, canonical Substrate node ID, and step/action owner IDs.
- Read-only Linear and Substrate source adapters. Their `find` methods accept the
  exact scope and bound ID and return scoped observations with evidence pointers,
  observation times, and source revision or snapshot digest. These ports must be
  implemented by the owning authenticated sources; arbitrary JSON and broad
  administrative reads are not substitutes. This change does not provision those
  adapters, credentials, or production bindings.
- A fixed approval-policy-to-role map and its exact `approvalPolicySha256`.
  Role advice is withheld if the hash differs from the run's frozen policy.
- A clock and positive `maximumAgeMs` for source observations.

Supply the resulting reader as the worker's `explanations` dependency. This
composition has no executor, queue, registration writer, approval handler, or
source-write method. It can be installed independently of the optional Template
Review execution host. Do not enable that execution host merely to read evidence.

Host bindings are declarations of relationships, not observations of source
state. Registrations reject unknown fields, conflicting identities, malformed
digests/IDs, and duplicate step bindings. Every lookup matches the complete
frozen identity. Returned Linear/Substrate observations must match both their
scope and registered canonical IDs. A matching title or issue label is
insufficient to create a join.

## Understand the answer

`create-something/control-graph-explanation@1` includes the parent and runtime
versions, the serial frontier's step/action/recovery contract, a reason code,
work owner, required actor roles, evidence requirements, explicit relationships,
source links, receipt digests, and unresolved facts.

The direct reader labels scope `scoped_control_reader`. Only the authenticated
transport adds `identity_and_scoped_control_reader`, after the run service
authorizes the read. The two labels must not be interchanged by an export client.

The reader resolves the manifest from the trusted digest authority and traverses
its actual serial dependencies. It does not guess execution order from array
position. It repeats both Control and proof reads after source lookup and rejects
changed versions or content, so the response does not combine different runtime
states. It retains the exact Build binding and receipt hashes.

Important outcomes:

| Reason                           | Meaning                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| `pending_approval`               | The exact bound approval decision is missing.                             |
| `approval_expired`               | The old approval request cannot support continuation.                     |
| `approval_rejected`              | Verified approval evidence records a rejection.                           |
| `run_stopped`                    | Control records a stop; its free-text cause remains redacted.             |
| `compiled_stop`                  | The compiled policy explicitly stops this step; owner review is required. |
| `effect_reconciliation_required` | An effect is ambiguous; automatic retry is not advised.                   |
| `recovery_review_required`       | The owner must evaluate the declared recovery contract.                   |
| `awaiting_capability_evidence`   | A running/prepared attempt lacks terminal verification evidence.          |
| `ready_for_host_evaluation`      | The serial frontier is ready for evaluation by its owning host.           |

Terminal parent states retain their terminal labels and have no active frontier
or next work owner. An ambiguous effect still requires reconciliation even if
the parent has stopped or cancelled; a stop does not undo an external effect.

The work owner comes from a fresh Linear observation matching an explicit
step/action ownership binding. It is shown only when the canonical Substrate
observation is also current. A stale/missing source, unassigned issue, or owner
conflict leaves `nextOwner` unknown. Role advice comes separately from the exact
host approval policy. A work owner is not automatically an approver.

The result preserves current/stale/unknown source states. `unresolved` names
missing joins, unavailable sources, unknown roles, and owner conflicts. Declared
relationship edges carry the binding digest; source links retain their revision,
snapshot digest, read time, and evidence pointer. No `permitted: true`, executable
capability parameters, credential, raw source payload, free-text outcome, or
operator subject is returned. `authorization` is always `owning_host_required`.

## Verify the candidate

After `pnpm bootstrap:worktree`, build the existing compiler/runtime dependencies:

```bash
pnpm graph:evidence:build
pnpm --filter @create-something/owned-agent-runtime check
pnpm --filter @create-something/owned-agent-runtime test
```

Use `bash scripts/ona-bootstrap-local.sh` before these commands if the pinned
`pnpm` is not on your shell path. The package suite includes the strict binding
registry, explanation semantics, authenticated transport boundary, and a
signed-artifact/SQLite integration with read-only database access. This is
synthetic qualification, not live recorded-run acceptance.

## Finish live acceptance

Use one already authorized internal workflow and recorded run. Its owning host
must supply the exact trusted registration, Identity scope, graph binding,
authenticated read adapters, and approval-policy mapping. Then verify:

1. An authorized read returns the expected blocker, bound owner, and exact
   missing evidence, with no unresolved source joins.
2. A different tenant cannot read or infer the run.
3. Stale or unknown observations withhold unsupported ownership claims.
4. The query leaves run versions, receipts, activations, and external sources
   unchanged.

The current live inventory cannot satisfy the first condition because no recorded
run exists. Creating an internal canary, activating a workflow, registering an
executor, or issuing new access requires its owning authorization and promotion
path. The administrative inventory only establishes availability; it does not
test the scoped graph query or establish a customer's runtime evidence.

Rollback removes the explanation reader and transport wiring. No database
migration or external state reversal is required.
