# ADR: Workflow Runtime v1 Ownership and Compiler Handoff

Status: Accepted for v1 implementation planning; not a production activation or
deployment approval  
Date: 2026-08-25  
Linear: CRE-1854; map CRE-1853  
Decision owners: Workflow Compiler, Control Runtime, Agency activation ledger,
Substrate/Atlas projection

## Context

`@createsomething/workflow-compiler` is a deterministic, local/CI compiler. It
validates a versioned governed workflow, produces a content-hashed artifact
inventory, and can attach an Ed25519 attestation to that inventory. It does
not hold credentials, call providers, choose a model, or perform live work.

`@create-something/owned-agent-runtime` already has the correct Control run
foundation: a tenant-scoped Agency activation snapshot, exact Build
release/contract registration, optimistic concurrency, idempotent commands,
an immutable hash-chained receipt ledger, and a scheduler claim that makes a
stop or cancellation win over a late executor result. Its current executor
registry is empty, intentionally making all customer starts fail closed. It
does not yet interpret a compiled workflow, store step checkpoints, or bind an
approval to one exact step attempt.

The existing `governed_interaction_bundle` is a finite, policy-bounded
inspection IR. It deliberately forbids executable operations, arbitrary code,
ambient origins, filesystem roots, commands, and plugins. The runtime must
preserve those properties while adding authenticated execution; treating a
serialized compiled bundle as an in-process compiler value, or making Atlas or
Substrate queue projections executable, would weaken that boundary.

## Decision

Create a new public, provider-neutral package:

```text
@createsomething/workflow-runtime
```

It is the deterministic interpreter and compatibility boundary for one
verified compiler artifact. It does not own HTTP, Identity, D1, Queue, R2,
Cloudflare bindings, credential material, model selection, provider transport,
or a customer-facing operator surface. Those remain adapters in
`@create-something/owned-agent-runtime` and the owned Hub/Control path.

The runtime accepts one closed, verified artifact release, returns one of the
governed `pass`, `wait`, or `stop` dispositions for the next ready step, and
reduces the resulting evidence into deterministic state and receipt payloads.
It is not a general-purpose programming language, task queue, agent framework,
or arbitrary-code host.

### Deep-module proposal

```text
Concept: Verified governed workflow execution
Current interface: Callers must separately know compiler artifact integrity,
  interaction schema compatibility, Build release registration, activation
  scope, allowed tools/resources, queue semantics, approval behavior, receipt
  fields, and provider transport.
Problem: The compiler intentionally stops before live execution, while the
  owned runtime can admit a release but has no exact artifact interpreter.
  A future caller could otherwise recreate compatibility and policy checks or
  improvise behavior from a prompt.
Proposed interface: Verify and admit one signed runtime artifact; evaluate one
  declared ready step; return a deterministic pass/wait/stop decision and
  receipt payload. Host adapters own storage, authorization, scheduling, and
  external invocation.
Tier ownership: Database=immutable artifact identity and deterministic state
  model; Automation=manifest verification and next-step reduction;
  Judgment=declared authority, autonomy, evidence, approval, recovery, and
  compatibility policy only.
Leverage: Compiler, Control Worker, Hub, Substrate, and Atlas share one exact
  artifact identity and no caller must reinterpret workflow authority.
Locality: Schema, compatibility, and transition changes stay in the compiler
  public contract and runtime core; transport/provider changes stay in host
  adapters.
Test surface: compile a fixture, verify its artifact and signer, admit it
  through the public runtime interface, exercise pass/wait/stop and negative
  bundles, then run the existing Control repository tests through the host
  adapter.
Migration: Keep the empty exact release/contract registry as the fail-closed
  baseline. Add a compiled-workflow executor adapter only after the runtime
  artifact and activation binding verify. Rollback removes the adapter or
  deactivates its binding; no historical receipt or activation is rewritten.
```

## Compiler-to-runtime artifact contract

### New artifact, not a reinterpretation

Add `runtime-manifest.json` with schema
`workflow_runtime_manifest.v0.1` to a new explicit Control runtime target.
The manifest is a generated artifact within the existing
`workflow_artifact_manifest.v0.1` inventory. The existing outer manifest and
`workflow_artifact_attestation.v0.1` remain the integrity boundary: the
attestation signs the outer manifest, which hashes every included artifact,
including `runtime-manifest.json`.

The runtime manifest must not contain the outer manifest hash, because that
would create a circular hash dependency. The registration record carries the
outer manifest identity after independent verification.

Existing workflow-definition and compiled-bundle schema families remain
readable as documented. A workflow must migrate to an explicitly versioned
future workflow schema/runtime target before it can emit this executable host
artifact. The compiler must not silently add execution authority to historical
v0.1–v0.3 artifacts or let a v0.3 consumer reinterpret the new target.

### Required manifest fields

`workflow_runtime_manifest.v0.1` is a closed schema and binds:

- its schema version and required runtime compatibility version;
- workflow ID, workflow version, definition hash, and compiler version;
- the exact compiled workflow, decision inventory, approval-surface,
  tool-contract, governed-interaction, and evaluation artifact identities;
- a finite step graph, explicit dependency order, and legal transitions;
- declared capability IDs, `systemsTouched`, typed parameter contracts, and
  evidence contracts for every executable step;
- autonomy, approval owner, receipt, stop, and recovery requirements for every
  action; and
- the exact target identifier `create-something/control-runtime.v1`.

It does not contain credentials, provider endpoints, arbitrary prompts, shell
commands, file paths, origins, native plugin references, or executable code.

### Verification and compatibility

Admission performs the following in order:

1. Load the immutable artifact prefix identified by the activation binding.
2. Verify the outer artifact inventory and every SHA-256 using
   `verifyWorkflowArtifactBundle`.
3. Verify the Ed25519 attestation against the runtime trusted-signer policy.
4. Parse the closed runtime manifest and correlated compiler artifacts.
5. Check the exact runtime manifest schema, governed-interaction schema,
   compiler contract family, capability set, operation set, and target against
   a runtime allowlist.
6. Check that the verified artifact identity equals the frozen Agency activation
   binding and the exact Build release/contract identity.
7. Return an immutable admission result or a structured fail-closed stop.

An npm version alone never establishes compatibility. Unknown schemas, unknown
fields, unsupported capability or operation IDs, unsigned/untrusted/wrong-key
artifacts, missing files, altered correlated artifacts, or mismatched
activation/Build identity stop before a run is queued.

### Signer trust and rotation

The trusted signer set is a reviewed, versioned runtime policy artifact owned
by the runtime release. It maps a stable key ID to its Ed25519 public key
fingerprint, status (`active`, `retiring`, or `revoked`), and allowed compiler
artifact schemas. A bundle never supplies its own trust root.

- Rotation adds the new key as `active`, publishes and verifies a newly signed
  artifact, then moves the old key to `retiring` only after no active
  activation references it.
- Revocation makes new registration and new step claims fail closed. Existing
  receipts remain historically verifiable with their recorded key fingerprint,
  but a revoked key cannot authorize a new external effect.
- A key-policy change is a reviewed runtime release and must be reflected in
  the activation binding; an environment variable or mutable dashboard setting
  cannot silently expand trust.

### Artifact storage and registration

For hosted execution, the release pipeline copies a successfully verified
artifact inventory into a content-addressed, write-once R2 prefix keyed by the
outer artifact manifest hash. The runtime reads only that prefix and verifies
the files again; local compiler output paths and symbolic links never become a
production runtime input.

The exact registration tuple is:

```text
activation_id
activation_version
build_release_id
contract_sha256
workflow_id
workflow_version
definition_hash
compiler_version
runtime_manifest_schema
runtime_manifest_sha256
artifact_manifest_sha256
attestation_key_id
attestation_public_key_fingerprint
artifact_prefix
runtime_policy_sha256
```

The `artifact_manifest_sha256` is the verified outer manifest hash. The
`runtime_manifest_sha256` is the hash of the verified manifest file. The
runtime stores no alternate mutable copy of this tuple.

## Ownership and writer boundary

| State or transition                                                       | Authoritative owner and writer                                     | Consumers / non-writers                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Workflow definition, compiler artifacts, outer manifest, attestation      | Compiler release pipeline and immutable artifact storage           | Runtime verifies; Atlas, Substrate, and Control inspect only                 |
| Trusted signer policy and runtime compatibility allowlist                 | Versioned runtime policy artifact, released with the runtime       | Compiler records version; runtime enforces; no bundle can expand it          |
| Build evidence and executable artifact registration                       | Agency activation ledger, through its verified Build-evidence path | Runtime reads/freeze-checks; no runtime or Atlas raw write                   |
| Activation, entitlement, Map/Build/policy snapshot                        | Agency D1 activation ledger                                        | Runtime reads the active exact version; Substrate/Atlas project it           |
| Run, step, attempt, command, approval, checkpoint, and receipt transition | Control D1 ledger through the owned runtime transaction            | Queue transports IDs only; Substrate/Atlas project; Linear tracks work       |
| Capability invocation and source-system effect                            | Owning system through the Hub/Control capability adapter           | Runtime persists intent/result evidence; no generic runtime transport bypass |
| Queue delivery                                                            | Cloudflare Queue                                                   | Not authoritative; duplicate or stale delivery cannot advance a run          |
| Topology, management queue, Atlas canvas and Proof views                  | Derived Substrate/Atlas projections                                | Never execute or mutate a runtime transition directly                        |

Agency additions for the registration tuple use the same immutable,
tenant-scoped, idempotent activation command and outbox path as the current
Control activation ledger. The runtime freezes that binding into the run at
admission. A new binding, signer, Build release, contract, policy, or artifact
identity requires a new activation version; it never edits a running or
historical activation.

The Control D1 ledger remains the only v1 writer for runtime progress. Its
existing immutable run activation snapshot, monotonic version, command
idempotency, active-concurrency constraint, and receipt hash chain are extended
for steps and checkpoints rather than duplicated in Substrate or Atlas.

## Host execution boundary

`@create-something/owned-agent-runtime` adds a
`CompiledWorkflowExecutor` adapter to the existing
`RegisteredControlWorkflowExecutor` seam. It runs one ready step per claimed
scheduler operation:

1. read the frozen activation and verified registration;
2. use `@createsomething/workflow-runtime` to verify/admit the artifact and
   reduce the next ready step;
3. persist a step-attempt claim and idempotency identity before any external
   effect;
4. on `pass`, invoke the declared capability through the Hub/owned service
   binding, validate the result, then persist the checkpoint and receipt;
5. on `wait`, persist the exact approval request and receipt without an
   executable request; and
6. on `stop`, persist the stop or fallback reason and receipt without an
   executable request.

Queue messages contain only a scoped run ID, step ID, expected version, and
idempotency identity. The Control ledger decides whether the claim is current.
Reads may retry under policy. Writes retry only with an owning-system
idempotency contract. Destructive actions do not auto-retry.

The current static empty registry remains the default until an exact verified
binding exists. Missing, malformed, incompatible, or revoked bindings resolve
to the existing governed dependency-failure/fallback path, not a prompt-based
best effort.

## Consequences

- The compiler gains a new explicit runtime-target artifact, not live
  execution. Its release and compatibility contract expands deliberately.
- The runtime core is independently testable and can become a builder-facing
  package without exposing Cloudflare credentials or Control customer state.
- The owned runtime gains a concrete executor adapter, D1 step/checkpoint
  tables, and R2 artifact reader only after the Phase 2 authority/approval
  decision is complete.
- Substrate and Atlas retain a stable projection role. The current generated
  workflow queue remains read-only until it can project the same runtime IDs
  and receipt truth.
- Activation registration becomes an explicit approval boundary; an approved
  Map/Build handoff alone never makes a workflow executable.

## Alternatives rejected

1. **Keep static executor definitions as the only workflow source.** Rejected:
   a code registration cannot prove the compiler artifact, signer, policy, or
   step graph that actually governed a run.
2. **Let the runtime import compiler private source or use an in-process frozen
   compiled bundle.** Rejected: a Cloudflare host must independently verify a
   serialized immutable release using public contracts; it cannot rely on
   compiler process identity.
3. **Use the generated Substrate workflow queue or Atlas canvas as the run
   ledger.** Rejected: both are projections and lack the activation, tenant,
   concurrency, idempotency, and receipt authority of Control D1.
4. **Store only a bundle hash in the run and load arbitrary storage at
   execution.** Rejected: a hash without a verified manifest, signer,
   compatibility result, and immutable artifact reference cannot prove what
   the runtime interpreted.
5. **Permit a runtime bundle to declare its own capabilities, endpoints, or
   trust keys.** Rejected: it would let the compiler artifact expand host
   authority rather than constrain it.

## Verification and rollback

Phase 3 must add public-interface tests that:

- compile a future explicit Control runtime-target fixture;
- verify the complete artifact inventory and a trusted Ed25519 attestation;
- admit the artifact only when all correlated schemas, capability/operation
  allowlists, signer policy, Build release, contract, and activation tuple
  match;
- reject unsigned, wrong-key, revoked, unknown-schema, altered-file,
  mismatched-artifact, unsupported-capability, and unregistered-release cases;
- prove equal inputs yield equal admission and next-step decision payloads; and
- prove `wait` and `stop` generate no executable capability invocation.

Host integration tests must retain existing tenant isolation, idempotency,
optimistic concurrency, active-concurrency, stop-wins, and receipt-chain
coverage while adding the step/checkpoint path.

Rollback disables the matching runtime registration or restores the prior
runtime host release. It never deletes the compiled artifact, activation,
command, checkpoint, or receipt history. A deployed activation with a revoked
or incompatible artifact stops before an external effect and moves through its
governed fallback/recovery path. Package publication, remote R2/D1 changes,
Cloudflare deployment, activation, and A3 canary execution remain separately
approval-gated.
