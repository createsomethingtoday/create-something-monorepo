# Compiler capability and source request binding

## Verified incompatibility

The compiler's `stepFromDecision` emits `${targetSystemId}:${toolName}` (or
`workflow:${workflowId}:${actionId}`) and hashes `{actionId, toolContract}` as the
capability parameter digest. The handoff prototype instead uses
`template-review.handoff.observe.v1` and a hash of
`{schema: 'template-handoff-request@1', assetId, versionId}`.

These are different contracts. The prototype's passing local tests do not
establish that a signed compiler artifact can dispatch through the gateway.
Do not edit a signed manifest, weaken admission, or reinterpret its digest.

## Required host relation

Add an immutable, versioned Control source-binding relation keyed by run and
step. Bind the verified Build relation and exact compiled capability ID/digest
to the fixed source tool/resource, exact asset/version IDs and separately
computed request digest. Publication must validate the admitted manifest and
fixed host registration, occur before effect intent, and be forbidden after
dispatch. The source permit continues to authorize the actual request digest.

The driver, gateway, evidence store and unified proof reader must consume the
same relation. Historical prototype evidence retains its existing semantics;
new compiled-source evidence needs an explicit version boundary. The source
relation must be included in immutable proof, not reconstructed from whichever
configuration happens to be running when proof is read.

This relation does not establish original submission UUID correlation. The
owning ingestion must still persist that UUID; heuristic asset/version lookup
cannot supply it.

## Next verifier

Migration `0016_control_runtime_source_bindings.sql` and
`D1WorkflowRuntimeSourceBindings` now implement the local immutable relation.
Publication requires an unexecuted v2 checkpoint under a live parent and a
matching verified Build. Publisher/readback independently verify the signed
capability and recompute the concrete request hash. The signed admission test
covers distinct hashes, replay, mismatched capability/pair, tenant isolation and
SQL update/delete/replace rejection. Gateway, evidence and unified proof now have explicit mapped-source paths.
Migration0017 versions mapped evidence separately, requires the request and
attempt to match the immutable relation, and rejects legacy evidence writes for
mapped steps. The driver and factory consume the mapping; proof includes it
before observation and alongside stored evidence. Signed fixture evidence
readback rejects a compiler digest substituted for the request digest. The local signed observation dispatch now passes through createTemplateReviewHost,
real Control/D1, strict v2 storage, source permit and mapped gateway. It invokes
the injected source once, produces matching terminal runtime/Control proof and
replays without another call. Signed approval/stop/unknown cases remain required.

Generate and sign a real compiler workflow with an approval step followed by
the observation tool. Register its accepted Build, compose the strict v2 host,
persist the source relation, then drive Control through wait, exact approval,
one source observation and matching terminal proof. Reject a changed compiled
capability, request pair, mapping, activation or source digest before dispatch.
Retain stop, late evidence, unknown outcome and approval replay coverage.

`template-review-host.ts` is tested locally but remains unenabled in the Worker.
The signed local test covers an approval gate, exact decision/replay, single
observation, source loss and late stop. Source and Identity are injected.
The host uses D1VerifiedWorkflowRuntimeReceiptSink to independently verify
the immutable ledger receipts committed with each checkpoint. It does not
introduce a second writer. WorkflowRuntimeQueue verifies checkpoint versions
and parent state, defers early approval wakes, and drops stale messages; its
consumer resumes the signed local workflow without duplicate dispatch. Actual
Cloudflare delivery, initial-parent scheduling, crash-safe wake publication and
real Identity integration remain required before production promotion.

## Wake and Identity integration checkpoint

D1WorkflowRuntimeWakeReconciler rebuilds initial and continuation notifications
from durable queued state under the exact frozen activation. Signed tests
discard an approval wake and resume from ledger reconciliation without another
source call. Admission notifications are held until the source binding is
published. workflowRuntimeIdentity checks the verified context's scope, subject,
approval policy/role and scheduler activation; tests still supply fixture contexts.
Worker JWT resolver wiring, actual queue delivery and periodic scheduling remain
required, along with live production verification.
