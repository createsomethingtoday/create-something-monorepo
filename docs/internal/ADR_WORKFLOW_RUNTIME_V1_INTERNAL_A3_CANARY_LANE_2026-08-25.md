# ADR: Workflow Runtime v1 Internal A3 Canary Lane

- Status: Proposed candidate; not an activation, deployment, or canary approval
- Date: 2026-08-25
- Linear: CRE-1857; map CRE-1853
- Decision owners: named Marketplace review lead (pending acceptance), Control
  Runtime, Agency activation ledger, Identity, Hub, Substrate/Atlas projection

## Context

The Workflow Runtime core and compiler handoff are intentionally provider-neutral
and zero-write. The first internal A3 lane must therefore prove the full Control
path without treating a local compiler result, a shadow observation, or an Atlas
projection as execution authority.

`@create-something/workflow-shadow-pilot` already contains a bounded live
observation seam for the Webflow Template Review MCP. It requests only
`template-review:queue-read`, requires discovery to expose exactly
`template_review_list_queue`, and emits a sanitized receipt with a response
digest, bounded item count, and zero mutations. Its source is useful candidate
evidence, but it bypasses the future Control attempt ledger and is not an A3
executor.

The current queue response is also **not** a non-sensitive A3 input. It may
contain reviewer, feedback, site, and other queue-item fields. Keeping those
values out of shadow receipts does not change the source response's data
classification. A direct live call to this tool therefore remains shadow-only;
the A3 path needs synthetic input or a source-owned count-only/redacted
projection before any Control admission.

The Template Review source boundary was re-reviewed on 2026-08-25:

- queue-only OAuth scopes are reduced to `template-review:queue-read` in
  `packages/webflow-template-review-mcp/src/oauth-access.ts`;
- the Worker passes that scope to a one-tool allowlist in
  `packages/webflow-template-review-mcp/worker/index.ts`;
- the selected handler in `src/tools.ts` calls only
  `listAssetQueueDetailed`; its Airtable path uses list requests, not create,
  update, or delete methods; and
- unit tests prove queue-only discovery and scope reduction.

The surrounding Template Review tool file has changed since the shadow source
policy was last pinned, including tools that this lane cannot discover. The
candidate is acceptable only because the queue-only scope and Worker allowlist
remain independently enforced; a broad read-only session would not be an
equivalent substitute.

## Decision

Select a single **proposed** internal A3 candidate:

```text
Capability: template-review.queue.observe.v1
Owning system: Webflow Template Review MCP, backed by its Airtable review queue
Invocation: template_review_list_queue
Fixed parameters: status=ready_to_review, assigned=any, sort=submittedDate_desc,
  limit=5
Effect class: bounded source observation; no source mutation
Current data class: internal/restricted queue data; not eligible for direct A3
  use
A3 data rule: synthetic data or a source-owned count-only/redacted projection
  only; raw queue values are rejected before Control receipts or
  Atlas/Substrate projections
```

This decision selects an implementation target, not a direct production-source
canary. It does not name a human owner, enable an Agency activation, register
an executor, request an OAuth token, read the live queue, deploy a Control
adapter, or authorize a canary. The named Marketplace review lead must accept
operational ownership and a source owner must provide an approved synthetic or
redacted projection before any A3 observation is requested.

### Deep-module proposal

```text
Concept: Control-bound Template Review queue observation
Current interface: The shadow pilot calls the source MCP directly after
  interactive OAuth and retains only a sanitized observation receipt.
Problem: Direct OAuth observation has no frozen Agency activation, Control step
  attempt, pre-effect intent, idempotency identity, or Control-to-source proof.
  It cannot prove that an A3 result belongs to one approved runtime attempt.
Proposed interface: A Control-owned capability adapter accepts exactly one
  verified pass plan for template-review.queue.observe.v1, persists an attempt
  and effect-intent receipt, invokes the fixed queue-read contract once, obtains
  source evidence, and commits a typed checkpoint only after verification.
Tier ownership: Database=Agency activation and Control attempt/checkpoint/
  receipt ledger; Automation=Control adapter and bounded MCP invocation;
  Judgment=artifact capability, approval, retention, retry, and recovery rules.
Leverage: One adapter can later serve the compiler/runtime, Control Proof view,
  Substrate, and Atlas without making any projection or shadow CLI executable.
Locality: Runtime core remains provider-neutral and executor-free; the source
  protocol stays in its MCP package; live authority and ledger transitions stay
  in Control/Agency-owned packages.
Test surface: compiler pass/wait/stop fixtures, adapter allowlist and exact
  parameters, duplicate delivery, stop-before-dispatch, source verification,
  receipt redaction, and Control/Atlas/Substrate agreement.
Migration: Add no ambient registration. Introduce a disabled exact activation
  binding, then promote only the approved internal lane. Rollback suspends or
  revokes that binding and blocks new dispatch; it never rewrites receipts.
```

## Required Control contract

The Phase 5 adapter must be a Control-owned host adapter, not a method added to
`@create-something/workflow-runtime` or a reuse of the shadow OAuth CLI. For a
verified `pass` only, it must:

1. verify the compiler artifact, runtime manifest, trusted signer policy, and
   frozen Agency activation tuple;
2. atomically persist the run/step claim, one attempt ID, canonical parameter
   digest, source idempotency identity, and `effect_intent` receipt before an
   external request;
3. accept only a source-owned count-only/redacted projection for A3, with the
   fixed queue-selection parameters above, and reject a direct
   `template_review_list_queue` result that contains raw item fields;
4. record the projection result without raw queue records, credentials, or
   user identifiers; and
5. commit a checkpoint only after the declared source verifier succeeds.

`wait`, `stop`, failed admission, stale activation, an unaccepted approval, a
missing named owner, or a source-discovery mismatch have no adapter request
path. A duplicate delivery must return the same durable attempt result rather
than issue another source call. Although the source read has no business write,
the Control command still requires idempotency so the receipt chain can prove
one authorised observation attempt.

## Verifier and recovery requirements

The existing shadow receipt is not enough for A3: its response hash and item
count are useful evidence but are not bound to a Control attempt or an
authoritative source-side correlation. Before canary approval, the adapter
design must define and test a source verifier that binds all of the following:

```text
Control attempt ID + canonical request digest + exact source resource/tool +
source invocation evidence + canonical response digest/count + verifier result
```

If the source protocol cannot provide a correlation identifier, the owning
adapter must produce auditable transport evidence that is cryptographically or
transactionally bound to the Control attempt; otherwise the run remains
`effect_unknown` or `fallback_required`, not checkpointed. A provider response
alone is not a verifier.

The source query is non-mutating, so no compensating external operation exists.
Recovery is to reconcile the request/response evidence by the same attempt and
request digest. Stop, cancellation, suspension, revocation, source ambiguity,
or verifier failure blocks further dispatch and records a terminal or recovery
receipt. It never retries by turning a `wait` or `stop` into a `pass`.

## A3 promotion gates

All gates below are independent. Passing one does not imply the next.

| Gate                 | Required evidence                                                                                                              | Authority                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Candidate acceptance | Named Marketplace review lead accepts owner, data classification, manual fallback, and rollback                                | Review lead                        |
| Data minimization    | Source owner provides a synthetic fixture or count-only/redacted projection; tests reject raw queue item fields before Control | Source owner and Control Runtime   |
| Compiler/runtime     | Signed artifact and closed runtime manifest emit only the declared capability; negative `wait`/`stop` fixtures cannot dispatch | Compiler and Runtime owners        |
| Control adapter      | Additive ledger, exact idempotency, verifier, recovery, and redaction tests pass through the owned host                        | Control Runtime                    |
| Activation           | Exact internal Agency activation tuple is reviewed, then enabled through the owning immutable activation path                  | Agency activation owner            |
| Source access        | Operator completes the bounded Identity OAuth flow; resource and queue-only scope are independently verified                   | Operator and Identity              |
| Canary               | Explicit operator approval starts one bounded internal attempt; Control receipt and source verifier agree                      | Operator                           |
| Projection           | Control, Substrate, Atlas, and browser Proof views display the same run/step/attempt/receipt identities                        | Control and Atlas/Substrate owners |
| Closeout             | Linear records the verifier result, rollback disposition, and worktree disposition                                             | CRE-1857 owner                     |

Until every gate is evidenced, this lane remains a proposed selection. There is
no production activation, deployment, package publication, remote migration,
or live executor registration implied by this ADR.

## Consequences

- The current shadow pilot remains a useful source-boundary test and direct
  queue reads cannot be reclassified as an A3 canary by configuration.
- The workflow runtime stays zero-write; its `executor: never` host contract is
  preserved.
- Phase 5 has a concrete, narrow integration target and a measurable missing
  verifier requirement rather than a general "run compiled workflows" task.
- Source-policy hash refreshes may proceed only after the explicit queue-only
  boundary is re-reviewed and the generated Substrate/Atlas projection is
  current.
