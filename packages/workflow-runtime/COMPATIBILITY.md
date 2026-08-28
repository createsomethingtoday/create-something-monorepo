# Compatibility contract

## Accepted by `0.1.x`

| Contract                 | Exact value                                       |
| ------------------------ | ------------------------------------------------- |
| Legacy runtime manifest  | `workflow_runtime_manifest.v0.1`                  |
| Legacy compatibility     | `workflow-runtime.v0.1`                           |
| Current runtime manifest | `workflow_runtime_manifest.v0.2`                  |
| Current compatibility    | `workflow-runtime.v0.2`                           |
| Runtime target           | `create-something/control-runtime.v1`             |
| Compiler bundle identity | `compiled_workflow_bundle.v0.3`                   |
| Legacy receipt schema    | `create-something/control-run-receipt@2`          |
| Current receipt schema   | `create-something/control-run-receipt@3`          |
| Legacy run checkpoint    | `workflow_runtime_run.v0.1`                       |
| Current run checkpoint   | `workflow_runtime_run.v0.2`                       |
| Digest format            | lowercase `sha256:` followed by 64 hex characters |

The runtime parser rejects an unknown field, mismatched schema/compatibility
pair, target, digest format, dependency, step disposition, or graph cycle. It
requires exactly one initial step. v0.1 remains readable only with
`manual_fallback` recovery. v0.2 preserves the compiler's `rollback`,
`escalate`, or `manual_fallback` recovery choice. A resumed run re-verifies
every receipt hash and prior-hash link. A prepared effect stopped or cancelled
under v0.1 retains the legacy `abandoned` attempt label; v0.2 records
`effect_ambiguous`. Both labels require the matching terminal receipt and
cannot be requeued.

`workflow_runtime_run.v0.1` and its `@2` receipt chain remain readable under
their original hash semantics. Every new admission creates
`workflow_runtime_run.v0.2` with `@3` receipts and requires the closed
registration identity `{ buildReleaseId, contractSha256, runtimePolicySha256 }`
plus its parsed runtime-manifest schema. The registration policy hash must equal
the frozen activation policy hash. Each `@3` receipt repeats that identity and
the run-frozen manifest schema plus the compiler version and resolved step
action (or `null` for a run-level event). A resumed checkpoint therefore cannot
substitute a Build release, contract, policy, manifest generation, compiler, or
action without invalidating its receipt chain.

## Compiler handoff

The compiler emits the current v0.2 `runtime-manifest.json` only when a caller
supplies the separate, versioned `workflow_runtime_manifest_input.v0.1` for the
exact Control target. It can still validate a historical v0.1 artifact under
its original manual-recovery semantics. Ordinary compiler artifact writes
remain unchanged and do not gain runtime authority. The outer compiler
inventory and Ed25519 attestation must include and verify the runtime manifest
before a host admits it.

The runtime deliberately accepts an artifact identity rather than trusting an
npm version. A future runtime target, compiler bundle family, signer policy,
capability contract, or source-system adapter requires a new reviewed
compatibility decision.

## Host requirements

The host owns identity, artifact/signer verification, activation binding,
idempotency storage, queue transport, and receipt publication. It must treat a
`pass` plan as an intent that still needs its own promotion-gated capability
adapter. A `wait`, `stop`, or `recovery` plan has no executable capability and
must never be promoted into one by transport code.

Before persisting any `workflow_runtime_run.v0.2` checkpoint, an owned host
must resolve the `runtimeManifestSha256` through a trusted manifest authority
and re-verify the complete run against that exact manifest. The hash and its
parsed schema are therefore a single admission decision; an unavailable or
mismatched trusted manifest fails before Control D1 changes state.
