# Compatibility contract

## Accepted by `0.1.x`

| Contract                 | Exact value                                       |
| ------------------------ | ------------------------------------------------- |
| Runtime manifest         | `workflow_runtime_manifest.v0.1`                  |
| Runtime compatibility    | `workflow-runtime.v0.1`                           |
| Runtime target           | `create-something/control-runtime.v1`             |
| Compiler bundle identity | `compiled_workflow_bundle.v0.3`                   |
| Receipt schema           | `create-something/control-run-receipt@2`          |
| Run checkpoint           | `workflow_runtime_run.v0.1`                       |
| Digest format            | lowercase `sha256:` followed by 64 hex characters |

The runtime parser rejects an unknown field, schema, target, digest format,
dependency, step disposition, or graph cycle. It requires exactly one initial
step. A resumed run re-verifies every receipt hash and prior-hash link.

## Compiler handoff

The compiler may emit `runtime-manifest.json` only when a caller supplies the
separate, versioned `workflow_runtime_manifest_input.v0.1` for the exact
Control target. Ordinary compiler artifact writes remain unchanged and do not
gain runtime authority. The outer compiler inventory and Ed25519 attestation
must include and verify the runtime manifest before a host admits it.

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
