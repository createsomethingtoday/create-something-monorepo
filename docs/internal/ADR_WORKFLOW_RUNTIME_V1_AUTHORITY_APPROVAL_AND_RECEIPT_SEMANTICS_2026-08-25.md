# ADR: Workflow Runtime v1 Authority, Approval, and Receipt Semantics

- Status: Accepted for v1 implementation planning; not a production activation
  or deployment approval
- Date: 2026-08-25
- Linear: CRE-1855; map CRE-1853
- Decision owners: Control Runtime, Agency activation ledger, Identity, Hub,
  Workflow Compiler, Substrate/Atlas projection

## Context

The accepted ownership and compiler-handoff decision establishes a future
verified `workflow_runtime_manifest.v0.1`, an immutable activation binding,
and a provider-neutral runtime core. The next unresolved boundary is the
meaning of authority while a run is live: what one approval authorizes, when a
step may have had an external effect, which transition owns recovery, and what
the receipt chain must prove.

`@create-something/owned-agent-runtime` already has useful run-level Control
semantics: tenant-scoped admission against Agency activation, a frozen
activation snapshot, optimistic versioning, idempotent commands, an immutable
hash-chained receipt ledger, and a persisted running claim before execution so
an operator stop wins over a late executor result. It intentionally has no
compiled workflow interpreter, step ledger, attempt record, checkpoint, or
bound approval. Its current `approve` command only moves any
`waiting_for_approval` run back to `queued`; that is not sufficient authority
for a consequential step.

The compiler's finite `pass`, `wait`, and `stop` disposition is a key safety
boundary. It produces no credentials or external request. The host must keep
that separation: a `wait` or `stop` result cannot be transformed into a
capability call by a queue consumer, a tool adapter, an API route, or a
projection. Agency D1 remains the source of activation and entitlement truth;
Control D1 is the sole writer for execution state. Hub is the governed route
to a source system. Substrate and Atlas are read projections, never a bypass.

This decision makes those facts a closed v1 state and receipt contract before
the runtime core or D1 schema is implemented.

## Decision

The v1 runtime is a ledger-led state machine. A queue message is transport
only; it names a run, step, expected version, and idempotency identity, but it
cannot cause progress by itself. The Control D1 transaction decides whether the
message is current, persists the next intent and receipt, and only then permits
the host to make an external request.

Every capability invocation is bound to one verified artifact and one frozen
activation, and has a separate _live safety check_ before an external effect.
The frozen binding preserves historical authority after an ordinary
supersession. It does not override a subsequent suspension or revocation. If
the host cannot read the live safety fact, it fails closed before `pass`.

Approval is a durable decision receipt for one exact step attempt. It is not a
general permission, a queue lease, or an execution command. After approval,
the scheduler independently rechecks the whole binding and live safety fact
before it can dispatch the previously waiting `pass`.

### Authority and writer boundary

| State or decision                                                                 | Authoritative owner and writer                                         | Consumers / non-writers                                                                                |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Compiler artifact, outer manifest, attestation, runtime manifest                  | Compiler release pipeline and immutable artifact storage               | Runtime independently verifies; Control, Substrate, and Atlas inspect only                             |
| Trusted signer set and compatibility allowlist                                    | Reviewed runtime-policy artifact released with the runtime             | Compiler records; runtime enforces; an artifact cannot expand it                                       |
| Activation, entitlement, Map/Build/policy snapshot and suspend/revoke safety fact | Agency D1 activation ledger                                            | Runtime reads/freeze-checks; Control D1 stores immutable admission evidence; no runtime or Atlas write |
| Run, step, attempt, checkpoint, command, approval, and receipt transition         | Control D1 through one owned runtime transaction                       | Queue transports IDs; Hub reports a result; Substrate/Atlas project it                                 |
| Capability invocation and source-system effect                                    | Owning source system through a declared Hub/Control capability adapter | Runtime records intent, result, verifier, and recovery evidence; no generic transport bypass           |
| Operator/API/MCP identity                                                         | CREATE SOMETHING Identity and the Control resource policy              | API/MCP uses the same resolved actor and command handler; client headers are not authority             |
| Atlas/Map, Substrate topology/queue, Proof surface                                | Derived projection                                                     | Never authorizes or executes a runtime transition                                                      |

The activation snapshot frozen at admission contains the tuple accepted in the
ownership ADR: exact activation/version, scope, Build release and contract,
workflow and artifact hashes, runtime policy hash, entitlement snapshot, and
allowed tools/resources. A v1 external effect additionally requires a
live, tenant-scoped `effect_allowed` read for that activation, capability, and
scope. This read can only narrow frozen authority. It must report one of
`allowed`, `suspended`, `revoked`, or `unavailable`; unknown is not allowed.

- Ordinary **supersession** does not invalidate an admitted run. New runs use
  the newer activation; the frozen binding preserves the historical evidence
  for the old run.
- Explicit **suspension** or **revocation** prevents the next external effect
  even if a run or approval was previously admitted. The current step enters
  `blocked` or `fallback_required` with a receipt; it is never silently
  re-queued.
- A policy, artifact, contract, scope, capability, input, evidence, signer, or
  runtime compatibility mismatch fails closed before the capability adapter.

### Run state machine

Run state describes scheduler authority, not whether an in-flight owning system
might later report an effect. A late result is always retained as evidence but
cannot revive a stopped, cancelled, terminated, or blocked run.

| State                           | Meaning                                                                                       | Scheduler may dispatch an external effect?              | Legal next states                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queued`                        | Admitted work has a ready step and no current claim.                                          | No; a current claim is required first.                  | `running`, `stopped`, `cancelled`, `terminated`                                                                                                                |
| `running`                       | One Control transaction has a current scheduler claim.                                        | Only for one `pass` after all pre-effect gates persist. | `queued`, `waiting_for_approval`, `waiting_for_manual_completion`, `completed`, `failed`, `fallback_required`, `blocked`, `stopped`, `cancelled`, `terminated` |
| `waiting_for_approval`          | Exactly one open immutable approval request pauses one step.                                  | No.                                                     | `queued` on an accepted current approval; `blocked`, `terminated`, `stopped`, `cancelled`                                                                      |
| `waiting_for_manual_completion` | A declared evidence contract requires a non-agent/manual result.                              | No.                                                     | `queued` on verified matching evidence; `blocked`, `fallback_required`, `stopped`, `cancelled`, `terminated`                                                   |
| `fallback_required`             | Automatic continuation is unsafe or unavailable; a named manual or recovery path is required. | No.                                                     | `recovering`, `stopped`, `cancelled`, `terminated`                                                                                                             |
| `recovering`                    | An authorized operator or recovery adapter is reconciling declared evidence.                  | No new workflow effect.                                 | `recovered`, `fallback_required`, `failed`, `stopped`, `cancelled`, `terminated`                                                                               |
| `recovered`                     | Recovery has produced verified evidence and a checkpoint decision.                            | No; an explicit resume is required.                     | `queued` only by `resume_from_checkpoint`; `stopped`, `cancelled`, `terminated`                                                                                |
| `completed`                     | Every required checkpoint is verified and committed.                                          | No.                                                     | none                                                                                                                                                           |
| `failed`                        | A definite terminal step failure is recorded.                                                 | No.                                                     | `recovering`, `stopped`, `cancelled`, `terminated`                                                                                                             |
| `blocked`                       | Policy, evidence, compatibility, approval, or safety fact forbids continuation.               | No.                                                     | `stopped`, `cancelled`, `terminated`                                                                                                                           |
| `stopped`                       | An explicit stop wins; the run may still need source reconciliation.                          | No.                                                     | `recovering`, `cancelled`, `terminated`                                                                                                                        |
| `cancelled`                     | The work is abandoned by the operator.                                                        | No.                                                     | none                                                                                                                                                           |
| `terminated`                    | The work is irreversibly closed by policy or an operator decision.                            | No.                                                     | none                                                                                                                                                           |

`queued -> running` requires the current run version, current step version, and
an unexpired scheduler claim. Every other transition names its expected run
version and, where applicable, step/attempt/approval versions. An old queue
delivery, duplicate command, or late worker result returns the durable current
record or a conflict; it never performs another effect.

The legacy generic run `retry` endpoint is not carried into the compiled-workflow
path. V1 offers only `retry_step` and `resume_from_checkpoint`, both explicit
commands described below. Existing static-control callers retain their current
compatibility behavior until they migrate; they cannot become compiled-runtime
executors by accident.

### Step and attempt state machines

A run has a finite graph of immutable step definitions. Step state answers
which declared work is ready; an attempt records whether an external effect
may have occurred. A `wait` or `stop` creates no external attempt.

| Step state                                                                   | Legal transitions                                                                                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pending`                                                                    | `ready`, `skipped`, `cancelled`                                                                                                                |
| `ready`                                                                      | `claimed`, `stopped`, `cancelled`, `blocked`                                                                                                   |
| `claimed`                                                                    | `running`, `ready` on expired pre-effect claim, `stopped`, `cancelled`                                                                         |
| `running`                                                                    | `waiting_for_approval`, `waiting_for_manual_completion`, `succeeded`, `failed_retryable`, `failed_terminal`, `blocked`, `stopped`, `cancelled` |
| `waiting_for_approval`                                                       | `ready` only after a current accepted approval, or `blocked`, `stopped`, `cancelled`                                                           |
| `waiting_for_manual_completion`                                              | `ready` only after matching verified evidence, or `blocked`, `failed_terminal`, `stopped`, `cancelled`                                         |
| `failed_retryable`                                                           | `ready` only by explicit `retry_step`, or `blocked`, `stopped`, `cancelled`                                                                    |
| `succeeded`, `failed_terminal`, `blocked`, `stopped`, `cancelled`, `skipped` | no automatic transition; recovery records a checkpoint or starts a new authorized run                                                          |

Only one current attempt may exist for a step version. Its lifecycle is:

```text
prepared -> dispatching -> result_observed -> verified -> committed
                    \-> effect_unknown
effect_unknown -> result_observed | proven_not_dispatched | fallback_required
prepared -> abandoned
```

- `prepared` stores the immutable parameter digest, source-system idempotency
  key, capability contract, expected run/step version, and `effect_intent`
  receipt in the same Control D1 transaction. It exists only for `pass`.
- `dispatching` is entered immediately before the declared Hub adapter call.
  A process failure, lease loss, network ambiguity, or missing response becomes
  `effect_unknown`; it is never assumed to be no effect.
- `result_observed` stores the response/evidence reference without asserting
  success. `verified` requires the declared source-system verifier and typed
  result contract. `committed` atomically advances the checkpoint, step, run,
  and receipt chain.
- `effect_unknown` may be resolved by an owning-system status query using the
  same idempotency identity. A resend is allowed only when the capability
  contract proves same-key at-most-once behavior and a verifier can reconcile
  the result. Otherwise it goes to `fallback_required`; destructive actions
  never auto-resend.
- `prepared -> abandoned` is permitted only when the ledger proves the adapter
  was not dispatched. It cannot erase the intent receipt.

### Approval contract and invalidation

When the runtime returns `wait` with an approval contract, Control creates an
immutable `ApprovalRequest` and a `wait_created` receipt in the same
transaction that puts the step and run into approval wait. The request stores:

```text
approval_id, approval_version, run_id, run_version, step_id, step_version,
attempt_id, activation_id, activation_version, scope, build_release_id,
contract_sha256, artifact_manifest_sha256, runtime_manifest_sha256,
runtime_policy_sha256, capability_id, action_id, parameter_digest,
evidence_digest, required_approver_policy, issued_at, expires_at
```

It contains digests and governed references, not secrets, raw prompts, or
unbounded provider output. `required_approver_policy` is a closed policy ID
whose evaluator uses the Control Identity subject, issuer, audience, scopes,
and required role. A client-supplied actor, role, tenant, or approval target is
never trusted.

The decision command must include `approval_id`, expected approval/run/step
versions, the exact `approved` or `rejected` decision, reason, and scoped
idempotency key. It appends an immutable `approval_decided` receipt. It never
invokes Hub or a capability.

An approval is usable only when all of the following still match: its open
status and expiry, tenant and scope, run/step/attempt IDs and versions,
activation and artifact tuple, runtime policy, capability/action, parameter and
evidence digests, and approver policy. Any mismatch, expiry, duplicate with a
different semantic digest, rejection, or unavailable identity/evidence makes
the request unusable and moves the step/run to `blocked` or `terminated` with
a receipt. The scheduler repeats this validation and the live safety read
before dispatch; an accepted approval is not an execution lease.

An approval never becomes stale merely because Agency creates a newer
activation. It does become unusable when the frozen activation is suspended or
revoked, because no historical approval can expand a live safety restriction.

### Commands, concurrency, and recovery

Every mutable Control API and MCP command has the same command envelope:

```text
scope + target entity IDs + expected versions + operation + canonical semantic
payload digest + idempotency key + Identity-derived actor
```

Idempotency is scoped to tenant, actor authorization context, operation, and
target. Replaying the same key and semantic digest returns the original durable
result. Reusing a key with a different target, expected version, or payload is
a conflict. Approval commands cannot target another run/step/attempt; tenant
queries and writes are exact-scope.

`retry_step` requires a `failed_retryable` step, a declared retry policy, an
unconsumed retry budget, and either no dispatch or a source-system same-key
idempotency and verifier contract. It creates a new attempt linked to the old
one; it does not rerun earlier completed steps. `resume_from_checkpoint`
requires a verified recovery receipt, an exact checkpoint, an explicit actor,
and all normal admission/live-safety checks. Neither command can turn a
`blocked`, `cancelled`, or `terminated` compiled run back into active work.

Recovery starts from a named source-system reconciliation query or manual
evidence contract. It has no implicit compensation and no generic retry of the
whole run. A recovery that cannot prove the source-system state remains
`fallback_required`; a late result after stop/cancel/terminate remains a
receipt and may require recovery, but does not resume or complete the run.

### Receipt contract

The existing `create-something/control-run-receipt@1` remains readable for
legacy run records. The compiled-workflow ledger introduces additive
`create-something/control-run-receipt@2` records, selected by schema rather
than reinterpretation. Each v2 receipt is canonicalized and hash chained to
the prior receipt for the run; receipt insertion, hash continuity, and
immutability remain Control D1 invariants.

Every v2 receipt carries the existing receipt identity and chain pointers plus:

```text
event_type, run_id/version, step_id/version, attempt_id, checkpoint_id,
activation_id/version, scope, build_release_id, contract_sha256,
artifact_manifest_sha256, runtime_manifest_sha256, runtime_policy_sha256,
capability_id/action_id, parameter_digest, evidence_digest,
source_receipt_reference/digest, actor, verifier, outcome_class,
recovery_reference, created_at
```

The finite v1 taxonomy is:

| Event class             | Required event types                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admission and planning  | `run_admitted`, `step_ready`, `step_claimed`                                                                                                                     |
| Effect boundary         | `effect_intent`, `external_result_observed`, `result_verified`, `checkpoint_committed`, `late_result_observed`                                                   |
| Human or evidence pause | `wait_created`, `approval_decided`, `manual_evidence_recorded`                                                                                                   |
| Exception and closure   | `blocked`, `failed`, `fallback_required`, `stopped`, `cancelled`, `terminated`, `recovery_started`, `recovery_reconciled`, `recovery_completed`, `run_completed` |

Receipt tables never hold raw credentials, raw prompts, unredacted provider
errors, or secret identifiers. They hold digests, classification, and access-
controlled evidence references. The customer/operator Proof view derives a
sanitized receipt from the same immutable event; it cannot be a separate
authoritative chain.

Retention is explicit at workflow registration: each evidence contract must
name a data classification, lawful owner, retention class, deletion authority,
and customer-proof projection. The hash chain and minimum audit metadata are
preserved for the retention class; when raw evidence is removed, Control keeps
its digest, governed reference, removal reason, and disposal receipt. No
customer activation may rely on a retention class that lacks an approved data
policy. The internal A3 canary uses synthetic or non-sensitive evidence only.

### `pass`, `wait`, and `stop` execution rule

| Runtime disposition                          | Required Control write                                                                                             | Capability call                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `pass`                                       | Current step claim, immutable `effect_intent`, attempt identity, and all gates in one committed ledger transaction | Exactly one declared Hub adapter call after the transaction succeeds |
| `wait` with approval contract                | Bound `ApprovalRequest`, wait state, and `wait_created` receipt                                                    | Never                                                                |
| `wait` with manual-evidence contract         | Wait state and `wait_created` receipt                                                                              | Never                                                                |
| `wait` without one of those closed contracts | `blocked` receipt                                                                                                  | Never                                                                |
| `stop`                                       | `blocked` or explicit stopped state and receipt                                                                    | Never                                                                |

There is no executable request type for `wait` or `stop` in the public runtime
core, queue payload, Control API/MCP tool, or Hub adapter. Type boundaries and
negative tests enforce the distinction; a consumer must be unable to obtain a
capability invocation from either disposition.

## Consequences

- Phase 3 can build one deterministic reducer and receipt payload model without
  choosing policy at runtime. Phase 4 gets additive `steps`, `attempts`,
  `approvals`, `checkpoints`, command-target, and receipt-reference tables.
- The Control API/MCP contract gains exact target/version fields and explicit
  step retry/recovery commands. A loose run-level approval label and generic
  compiled-run retry are insufficient and must not be adapted silently.
- Agency needs a narrow, auditable activation safety read for suspension and
  revocation. Its absence blocks `pass`; it does not justify treating a frozen
  snapshot as permanently live authority.
- Hub adapters require declared idempotency, result-schema, verifier, and
  destructive-retry metadata. A provider response alone is not a committed
  checkpoint.
- Atlas and Substrate can project the exact run, step, attempt, approval,
  checkpoint, and receipt IDs once Control persists them. They remain unable to
  issue execution or approval authority.

## Required Phase 3-5 verification matrix

| Scenario             | Required proof                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legal transitions    | Table-driven reducer tests cover every table edge and reject every omitted edge.                                                                                         |
| Approval binding     | Stale run/step/attempt version, expired request, changed artifact/policy/input/evidence, wrong role, wrong tenant, and duplicate-different command fail before dispatch. |
| Dispositions         | `wait` and `stop` fixtures expose no capability request; `pass` cannot dispatch without its committed intent receipt.                                                    |
| Concurrency          | Duplicate/out-of-order Queue delivery and concurrent process claims create at most one attempt/effect identity.                                                          |
| Stop and late result | Stop/cancel/terminate wins over a late success; it records reconciliation evidence but never advances another step or completes the run.                                 |
| Effect ambiguity     | Crash after intent or dispatch enters `effect_unknown`; only a source verifier or proven same-key idempotency resolves it; destructive writes do not auto-retry.         |
| Activation           | Supersession preserves the frozen run; suspension/revocation/unavailable safety read blocks the next `pass`.                                                             |
| Receipts             | Hash chain, immutable v1/v2 schema discrimination, redaction, retention/disposal, and sanitized Proof projection all verify.                                             |
| Surface agreement    | Every reading surface returns the same run, step, and receipt IDs with terminal evidence from the Control ledger; none creates alternate truth.                          |

## Alternatives rejected

1. **Treat a run-level approval kind as sufficient.** Rejected: it cannot
   prove the approved step, attempt, inputs, evidence, activation, or policy.
2. **Let a frozen activation ignore later suspension or revocation.** Rejected:
   historical reproducibility must not become permanent live authority.
3. **Retry a whole workflow after any failure.** Rejected: it can repeat a
   previous external effect and makes source-system truth unrecoverable.
4. **Infer an absent external effect after a transport failure.** Rejected:
   uncertainty must be reconciled, not guessed away.
5. **Allow a queue, Atlas, or Substrate projection to resume a run.** Rejected:
   they do not own Control's versions, approval binding, or source-system
   authority.
6. **Store raw evidence in the receipt chain for convenience.** Rejected:
   immutable ledgers require least-data receipts and governed evidence access.

## Implementation boundary

This ADR authorizes deterministic schemas, reducer fixtures, zero-write
prototype work, and additive migration design under the existing goal. It does
not authorize a remote migration, Worker deployment, package publication,
executor registration, Agency activation change, customer data use, or an A3
production canary. Those remain separate approval and promotion gates.
