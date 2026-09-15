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

An integration test must drive real Control process and D1 checkpoint storage,
not call the gateway alone: signed accepted Build admission, persisted wait,
exact approval/resume, single observation, terminal parent/runtime agreement,
stop during dispatch, unknown effect and recovery. Source transport may be
injected for local tests but the final objective still requires authenticated
production invocation and matching API/MCP/Substrate/Atlas readbacks.

This document does not authorize or claim production activation or deployment.

## Approval transport integration still required

`control-worker.ts` delegates approval to `service.approve`, which currently
requeues the parent and clears `pendingApprovalKind`. It does not dispatch a
`ZeroWriteWorkflowRuntimeHost.transition` approval event. Production composition
must carry and verify the exact runtime approval ID, binding digest, step and
checkpoint version using the authenticated operator identity before resuming.
A parent approval receipt alone must never synthesize a step approval. Test the
real action route with stale and mismatched bindings as well as successful resume.
