# Production reconciliation host composition

## Current integration constraint

ControlRunExecutor.execute returns completed, waiting_for_approval,
dependency_failed, or failed. Control process immediately persists the returned
terminal/waiting parent state. ZeroWriteWorkflowRuntimeHost independently queues
checkpoint versions after admission/transitions. A direct adapter must not
return completed merely because a checkpoint was admitted or a step was queued.

## Required owning adapter

- Resolve an exact host-owned release and source definition. Reverify signed
  bytes with RegisteredWorkflowManifestAuthority on every resolution.
- Publish the verified Agency Build relation before admitting the v2 checkpoint.
- Construct D1WorkflowRuntimeCheckpointStore in verified-build-v2 mode with the
  resolver and its approvalSurfaces port.
- Execute the bounded observation lane inside the claimed Control operation,
  advancing persisted runtime transitions until a real terminal state or bound
  approval wait. Do not launch an untracked asynchronous continuation.
- Preserve effect-intent-before-dispatch. Gateway uses verified-build-v2 proof,
  current Agency permit and final parent/runtime state query. Unknown effects
  return non-retryable failure or governed fallback, never automatic redispatch.
- Return completed only after verified terminal runtime receipts and persisted
  source evidence agree. Return waiting_for_approval only for the exact runtime
  approval surface and bound step. Control resume must verify that same binding.
- If bounded execution cannot finish in one request, introduce a separately
  reviewed persisted running/scheduled outcome and queue owner before enabling
  it. Existing executor outcomes cannot represent this safely.

## Proof obligations

The local `driveTemplateReviewRuntime` adapter now advances an admitted checkpoint
inside a claimed Control operation. It permits one declared handoff observation,
persists intent before gateway dispatch, and requires confirmed stored evidence
and a matching success receipt before returning completion. Existing running
attempts require reconciliation; they are not dispatched by a resumed driver.
Its real Control/D1 test covers healthy completion, unknown source outcome,
source discrepancy and operator stop during dispatch. This is a local legacy
fixture test, not signed v2 hosted composition or live source proof. The HTTP wait/approval/resume test now checks missing, mismatched and stale
decisions, exact HTTP/MCP replay and one observation after approval. The
production factory and signed v2 end-to-end composition remain required. The factory
must supply v2 storage/gateway, verified registration, authenticated scheduler,
and the owning receipt sink; test no-op ports must not become production defaults.

An integration test must drive real Control process and D1 checkpoint storage,
not call the gateway alone: signed accepted Build admission, persisted wait,
exact approval/resume, single observation, terminal parent/runtime agreement,
stop during dispatch, unknown effect and recovery. Source transport may be
injected for local tests but the final objective still requires authenticated
production invocation and matching API/MCP/Substrate/Atlas readbacks.

This document does not authorize or claim production activation or deployment.

## Bound approval transport

HTTP and MCP approve/reject actions accept an optional strict `runtime_approval`
tuple: step ID, approval ID, binding digest and checkpoint version. Control
requires that tuple and a configured authority for `workflow-runtime:` waits;
ordinary parent approval cannot requeue them. The tuple participates in the
parent command digest. The authority persists the authenticated runtime decision
before Control changes the parent, so a parent-write interruption can replay the
exact step decision. Parent optimistic concurrency preserves a concurrent stop.

The production resolver must supply the host for the exact registered release,
v2 storage and authenticated actor/role. Local tests use injected Identity;
this does not establish a live operator session or activate an executor.
