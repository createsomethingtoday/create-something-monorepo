# ADR: Business Digital Thread v1 Boundary

Status: Accepted for local prototype implementation
Date: 2026-07-23
Linear: CRE-1401
Decision owners: Database Layer / Substrate architecture

## Context

CREATE SOMETHING has strong present-day topology, product-specific versioning,
tenant-scoped execution, immutable receipts, and API/MCP/agent projections. The
lifetime-control audit found no single contract that preserves business
identity, authority, requirements, interfaces, baselines, rationale, evidence,
retention, migration, and learning across five to ten years of organizational
and tooling change.

Adding timestamps to current topology, storing untyped audit events, or drawing
a hand-authored success graph would preserve the gap. Each forces callers to
interpret history and authority independently and cannot prove clean import,
historical knowledge state, or disposition behavior.

## Decision

Adopt `flow.business-digital-thread.v1` as a deep, vendor-neutral contract owned
by `@create-something/database-layer`.

The canonical artifact is a closed set of typed immutable record revisions and
typed link revisions under stable business and tenant roots. Every revision has
valid-time and recorded-time intervals. The semantic interface is limited to
reconstruction, trace, change impact, authority evaluation, and
export/import/migration. Storage layout and all external representations are
adapters.

### Ownership boundaries

- Substrate owns canonical IDs, revisions, bitemporal relationships, baselines,
  integrity, receipts, disposition facts, and query semantics.
- Topology derives current and historical diagnostics. It is not the record of
  history.
- Atlas renders and navigates the canonical artifact. Local canvas state may
  contain geometry and operator view state only.
- Control governs proposals, authority decisions, execution, exceptions,
  verification, and receipts against exact record revisions.
- Linear owns commitments, status, implementation ownership, and evidence
  links. It does not own business-thread state.
- GitHub, CRM, ERP, HR, finance, procurement, identity, and other tools retain
  domain ownership behind versioned adapters.

### Temporal decision

Use bitemporal, half-open intervals. A historical query always supplies both
the business-effective time (`validAt`) and the knowledge time (`knownAt`).
Corrections and supersessions add revisions and close recorded intervals; they
never rewrite history. Overlapping visible revisions for one canonical ID fail
integrity checks.

### Baseline and authority decision

Approved baselines bind exact immutable revision IDs. Authority is an explicit
record with tenant, subject, represented party, capability, object scope,
issuer, policy revision, valid interval, recorded interval, and revocation
state. Current roles, current tokens, link existence, or UI visibility cannot
substitute for a grant.

### Retention decision

The v1 contract implements retention classes, legal holds, disposition facts,
tombstones, and non-revealing derived proof. It deliberately does not choose a
jurisdiction-specific schedule. Immutable evidence is subject to explicit
disposition behavior; "append only" is not permission for indefinite raw-data
retention.

## Deep-module test

Deleting this boundary would distribute temporal selection, authority checks,
trace rules, baseline membership, retention conflict handling, migration loss
accounting, and semantic comparison across API, MCP, agent, Atlas, and every
domain adapter. Keeping the boundary local therefore removes substantial
caller knowledge and earns its interface.

## Alternatives rejected

1. Extend present topology records with timestamps. Rejected because inventory
   status is not bitemporal truth, controlled baselines, or historical
   authority.
2. Use an append-only generic event log. Rejected because untyped events do not
   establish required context, link semantics, current-state resolution, or
   disposition behavior.
3. Make Atlas the canonical graph. Rejected because geometry and view state are
   projections and cannot own tenant isolation or business truth.
4. Adopt one domain vendor's schema. Rejected because a five-to-ten-year thread
   must survive vendor and tool replacement.
5. Copy a heavyweight aerospace process. Rejected because NASA controls are a
   reference for control questions, not a mandate for process or terminology.

## Consequences

- Phase 3 must implement one canonical semantic module before adding new
  projection-specific endpoints.
- Existing topology and management contracts remain available during migration.
- Adapters must make loss and unsupported fields explicit.
- Historical queries are slightly more demanding because `knownAt` is required;
  this is intentional protection against future-state leakage.
- Runtime performance and storage choices remain open so long as the frozen
  semantic oracle and budgets pass.

## Verification and rollback

`packages/database-layer/contracts/business-digital-thread/v1/verifier-spec.json`
is the decision's executable acceptance boundary. The contract checker must
accept the lifecycle example, reject all declared false solutions, validate the
fixed 30,000-participant scale probe, and preserve the frozen budgets.

Rollback during Phase 3 means removing the new adapter and continuing to serve
the existing read-only topology and management surfaces. Rollback must not
rewrite any v1 canonical artifact already produced; it must export it with its
schema and integrity manifest for later recovery.

Production promotion, customer data, external mutation, retention schedules,
and deployment remain separately approval gated.
