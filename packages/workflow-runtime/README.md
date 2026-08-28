# CREATE SOMETHING Workflow Runtime

`@createsomething/workflow-runtime` is a provider-neutral, deterministic
reducer for a **verified** governed workflow artifact. Version `0.1.x` is the
zero-write prototype: it creates plans, records intents and decisions, and
verifies checkpoints and receipt chains. It does not contain an executor,
provider client, credential, queue consumer, or external-effect adapter.

## Boundary

The public core accepts a closed `workflow_runtime_manifest.v0.1` legacy
contract and the current `workflow_runtime_manifest.v0.2` contract, each with
its exact runtime compatibility marker and an immutable admission tuple. v0.1
retains its original `manual_fallback`-only recovery semantics; v0.2 preserves
the compiler's declared recovery mode. A prepared effect stopped under v0.1
retains its legacy `abandoned` checkpoint label, while v0.2 records
`effect_ambiguous`; both labels require a terminal receipt and never permit a
requeue. Its only executable-looking plan is
`pass`, which contains a declared capability identifier and a parameter digest;
calling that capability is deliberately outside this package. `wait`, `stop`,
and `recovery` plans do not expose a capability.

The host ports are storage, clock, identity, queue, and receipt sink. The
executor port is `never`. `ZeroWriteWorkflowRuntimeHost` therefore cannot turn
a queue delivery, approval, wait, stop, recovery, or receipt into a provider
call.

Every runtime step carries the compiler action ID that produced it. Before a
transition with an actor can enter the receipt chain, the identity port must
return that same authenticated subject; a claimed subject that differs from the
trusted identity stops before state is read or changed. Both accepted runtime
manifest versions allow a single reachable serial chain only, so exactly one
step can become ready.

## Admission order

Callers must independently verify the compiler artifact inventory and trusted
Ed25519 signer before parsing the runtime manifest. Then the core can:

1. admit the immutable activation, Build registration, and artifact hashes;
2. persist an idempotent state transition and hash-chained receipt;
3. plan a `pass`, `wait`, `stop`, or manual recovery action; and
4. fail closed when a checkpoint, receipt chain, approval binding, schema, or
   concurrency version is invalid.

`D1WorkflowRuntimeCheckpointStore`, in the owned Control runtime, is the
durable zero-write storage port. It scopes state through the parent
Control run; it is not a network route or activation path. New admissions
freeze the exact Build release ID, contract hash, runtime-policy hash, and
parsed runtime-manifest schema in `workflow_runtime_run.v0.2`; the Control
parent activation must carry the same registration values before that checkpoint
can persist.
Registration-bound `@3` receipts additionally freeze the compiler version and
the resolved step action (or `null` for a run-level event), allowing Control to
bind an approval context to its exact wait receipt without treating a queue or
projection as authority.
An owned host must additionally resolve every v0.2 checkpoint's
`runtimeManifestSha256` from a trusted manifest authority and re-verify that
exact artifact before Control D1 can persist it. The runtime hash and parsed
manifest schema are one frozen admission fact; a missing or mismatched authority
result fails closed.

## Non-goals in 0.1

- No live capability invocation, provider endpoint, credential, shell command,
  customer-data access, or automatic retry.
- No trusted-signer policy, live activation safety check, or external Hub
  adapter. Those are separate promotion gates.
- No activation, deploy, or public npm publication authority.

See [COMPATIBILITY.md](./COMPATIBILITY.md) for the exact accepted artifact and
host contract.

## Agent Legibility Contract

| Contract | Requirement |
| --- | --- |
| Entry point | `src/index.ts`, `src/runtime.ts`, and `src/checkpoint.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | Closed-manifest parser, deterministic reducer, receipt/checkpoint verifier, zero-write host, and signed compiler fixture |
| UI validation path | None — this is a library with no route, browser surface, or capability executor |
| Escalation rule | Escalate before adding an executor, provider call, live activation read, signer-policy change, queue consumer, or any external-effect path |
