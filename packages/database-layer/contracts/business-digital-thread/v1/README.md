# Business Digital Thread v1 Contract

Status: frozen prototype for `CRE-1401`; runtime implementation remains a
separate frontier.

Schema identifier: `flow.business-digital-thread.v1`

## Purpose

This contract is the durable horizontal thread for a business. It preserves
identity, authority, intent, requirements, interfaces, decisions, baselines,
delivery, verification, operations, receipts, records disposition, migrations,
and applied lessons while people, contractors, agents, vendors, tools, and
organizational structures change.

It is not an ERP, project tracker, identity token, graph renderer, audit-log
format, or storage schema. Domain systems remain authoritative for their own
records and connect through versioned adapters. Substrate owns the canonical
cross-domain identities, immutable revisions, typed links, and semantic query
rules. Topology and Atlas are projections.

## Public semantic surface

Callers should depend on five capabilities, not storage tables:

1. `reconstruct({ validAt, knownAt, scope })` returns the unique record and link
   revisions both effective at `validAt` and known at `knownAt`.
2. `trace({ from, to, asOf, direction })` returns typed, bidirectional lineage
   and reports missing required hops.
3. `analyzeChange({ changeId, asOf })` returns affected records, owners,
   authority, verification obligations, risks, downstream evidence, unresolved
   approvals, migration, and rollback.
4. `evaluateAuthority({ grantId, actorId, capability, objectId, tenantId,
actionAt, knownAt })` returns `allow` or a stable denial code with the exact
   grant and policy revisions considered.
5. `transfer({ export | import | migrate })` produces a canonical manifest,
   semantic digest, clean-import comparison, and migration receipt with loss
   accounting.

Storage engines, domain adapters, API/MCP/agent encodings, and Atlas geometry
are seams behind this surface.

## Tier ownership

| Tier       | Ownership                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database   | Canonical IDs, immutable revisions, bitemporal intervals, typed links, baselines, integrity, export/import, migration, and disposition facts.           |
| Automation | Deterministic fixture generation, reconstruction, trace, impact analysis, authority evaluation, projections, and verifier execution.                    |
| Judgment   | Requirement and interface approval, decision authority, policy selection, exceptions, retention/legal-hold choices, lesson review, and promotion gates. |

Linear owns commitments and implementation evidence, not canonical business
state. GitHub and domain tools supply versioned evidence through adapters.

## Identity and revision rules

- A canonical ID identifies one logical entity for its lifetime. Renames,
  reorganizations, and source-system replacements create new revisions or typed
  links; they do not create a new identity unless the real entity changed.
- Every immutable revision has a unique `revisionId`. Approved baselines contain
  exact revision IDs, never mutable aliases or "latest" pointers.
- Canonical IDs use `bdt:<tenant-key>:<kind>:<stable-key>`. The tenant key is a
  stable opaque identifier, not a display name.
- External IDs are namespaced adapter references. They are evidence and lookup
  aids, never canonical identity.
- A revision may `supersede` an earlier revision for a new effective state or
  `correct` an earlier revision that was recorded incorrectly. The earlier
  revision remains reconstructable at an earlier `knownAt`.

## Bitemporal semantics

Every record revision and link revision carries two half-open intervals:

- `validTime = [from, to)` states when the fact is true in the business world.
- `recordedTime = [from, to)` states when this revision is the system's known
  representation of that fact.
- `to: null` means unbounded. Equal endpoints are invalid.
- `reconstruct` requires both `validAt` and `knownAt`; callers may not silently
  use current knowledge for a historical view.
- A revision is visible only when both intervals contain their corresponding
  query time. More than one visible revision for the same canonical ID is an
  integrity failure, not a last-write-wins choice.
- A correction closes the previous revision's recorded interval and adds a new
  revision. It does not erase what the system previously knew.

This distinction prevents a later revocation, corrected requirement, or newly
discovered incident from leaking into an earlier knowledge-state reconstruction.

## Typed records and links

`schema.json` closes the record-kind and link-type vocabularies for v1. Each
kind has required semantic fields; an untyped event body is invalid. The v1
families are:

- business, initiative, and party identity;
- authority grant;
- intent, requirement, interface, decision, baseline, change, and risk;
- work product, release, verification, operation, incident, and receipt;
- data product, retention policy, legal hold, disposition, and migration;
- lesson and policy.

Links are independently versioned and typed. `relationshipClass` distinguishes
participant, traceability, governance, provenance, and lifecycle links. The
30,000-participant scale requirement counts distinct canonical link IDs with
`relationshipClass: participant`, not records, audit entries, or repeated
revisions.

## Authority

Authority is never inferred from a current role or a link alone. An allowed
action requires one explicit visible `authority_grant` revision whose:

- tenant matches the action tenant;
- subject matches the actor and represented party;
- capability matches exactly or through a contract-defined namespace prefix;
- object scope selects the governed target;
- valid and recorded intervals include `actionAt` and `knownAt`;
- issuing authority and policy revisions are traceable; and
- status is active with no effective revocation or superseding denial.

Stable denial codes are `grant_missing`, `expired`, `revoked`, `wrong_tenant`,
`subject_mismatch`, `capability_mismatch`, `scope_mismatch`,
`policy_revision_missing`, and `ambiguous_grant`.

## Baselines, changes, and traceability

An approved baseline is immutable and names exact member revision IDs plus the
grants used to approve it. A proposed change cannot be approved until impact
analysis reports affected records, owners, required verification, risks,
downstream evidence, unresolved approvals, migration, and rollback.

The required bidirectional path is:

`intent -> requirement -> interface/decision -> baseline -> work product or
release -> verification -> operation -> receipt -> lesson -> applied change`

Not every requirement needs every optional node, but the verifier specification
declares the required hop alternatives and fails orphan requirements,
unverified baseline members, and evidence that cannot trace back to intent.

## Retention, legal hold, and derived proof

The contract supplies a mechanism, not a jurisdiction-specific schedule.
Production policy values require separate authority. Disposition outcomes are
`retain`, `archive`, `redact`, `delete`, `tombstone`, and
`preserve_derived_proof`.

A legal hold blocks conflicting disposition while effective. Deletion may keep
only a tombstone containing canonical identity, kind, disposition receipt, and
non-revealing integrity proof. Derived proof must not contain the deleted raw
content or a reversible transformation of it.

## Projection and adapter rules

- API, MCP, agent, and Atlas projections must report the same canonical IDs,
  as-of parameters, result digest, missing-proof states, and denial codes.
- Atlas may store local view state and geometry, but no canonical record,
  authority, baseline, or disposition decision.
- Every adapter declares its ID, version, source namespace, supported schema
  range, loss policy, and replacement strategy in the export manifest.
- CREATE SOMETHING dogfood generation must list authoritative repo-owned input
  artifacts. `inputMode: deterministic_fixture` is allowed only for verifier
  fixtures and cannot satisfy dogfood or production evidence.

## Files

- `schema.json` — closed JSON Schema for the canonical exchange artifact.
- `verifier-spec.json` — frozen fixture, semantic oracle, negative cases, and
  performance budgets.
- `performance-baseline.json` — three measured scale-probe runs and the evidence
  used to freeze the budgets.
- `examples/lifecycle-slice.json` — valid compact example covering every
  lifetime behavior required by the prototype.
- `examples/invalid-*.json` — false solutions that must be rejected.
- `scripts/verify-business-digital-thread-contract.mjs` — contract-only check
  and scale probe; it is not the Phase 3 runtime.

Run:

```bash
pnpm --filter @create-something/database-layer business-thread:contract:check
pnpm --filter @create-something/database-layer business-thread:contract:benchmark
```

The Phase 3 implementation must consume these artifacts without weakening the
fixture, semantic oracle, negative cases, or budgets.
