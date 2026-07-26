# Control activation ledger

Agency D1 is the authoritative persistence seam for customer Control
activations. It already owns first-party account, tenant, workspace, Map,
handoff, and entitlement state. Interaction Atlas and the Control runtime are
projection consumers through `customer_control_activation_outbox`; neither may
create or rewrite an activation definition.

## Frozen activation contract

Every activation version stores:

- exact account, tenant, and workspace scope;
- exact Map row, version row, stored canvas SHA-256, accepted handoff ID, and
  Build-package handoff receipt SHA-256;
- exact Build release, manifest, canonical artifact-set, terminal acceptance
  receipt ID, and acceptance receipt SHA-256;
- policy version and SHA-256 plus sorted, de-duplicated allowed tools and
  resources;
- first-party entitlement snapshot and SHA-256, actor subject and role, status,
  timestamps, idempotency receipt, predecessor, and rollback target.

`controlActivationSourceFromBuildInspection(...)` accepts only a clean
`@create-something/delivery-schema` inspection whose Map handoff and terminal
Build decision are accepted. An Agency operator must register that inspection
as immutable `customer_control_build_evidence` before activation. The D1
repository reads the accepted handoff and exact Map version in the same tenant
scope, verifies the stored `canvas_json` hash, and requires every Build ID and
hash on the activation to match that verified evidence row. Database triggers
repeat the exact source match so a concurrent or alternate adapter fails closed.
Application and projection adapters are not granted raw D1 write access. A D1
administrator can bypass application verification by definition and remains a
privileged operational trust boundary; backfills therefore must use the same
verified registration path and normal migration review.

## Lifecycle

- `activate` creates version 1 when no current version exists.
- `supersede` creates a new immutable version and atomically makes the previous
  active or suspended version historical.
- `suspend` preserves the frozen contract and changes only bounded status facts.
- `rollback` never reactivates an old row. It creates a new version whose Map,
  Build, artifact, and policy contract exactly matches an earlier target while
  retaining the immediately preceding version as lineage.
- Runtime drift and incidents create immutable `proposed` links to either a Map
  revision or Build change request. They do not edit approved source records;
  the same incident may be linked independently to multiple activation versions.

All mutations use a tenant-scoped idempotency key and semantic command hash.
Replaying the same command returns its stored result; reusing the key for a
different command fails. D1 batches the command receipt, state transition,
activation/change record, and outbox event in one transaction. Database
triggers make a missing predecessor, rejected handoff, cross-scope source, or
incomplete transition abort the batch.

## Projection and transport boundary

Outbox payloads are immutable and SHA-256-bound. Publishing may set
`published_at` once; retrying returns the original publish receipt and cannot
replace payload or policy. The shared transport handler is the authority for
both API and MCP adapters, and the exported operation lists are parity-checked.
Authorization remains inside the ledger: every read and write requires the
first-party actor to match the scope and carry a matching allowed entitlement;
writes additionally require `agency_operator` or `account_owner`.

`GET /api/control/activations` and
`GET /api/control/activations?activation_id=...` are the authenticated read
adapter. They derive scope and entitlement from the verified first-party
session and never accept account IDs from the request. Mutation operations are
not exposed as customer HTTP actions in this slice.

This slice creates schema and code only. It does not execute a workflow,
activate a customer, enable checkout, or grant production authority.

## Verification

```bash
cd packages/agency
node --import ./test/register-sveltekit-test-loader.mjs --import tsx --test \
  test/control-activation-d1.test.ts test/control-activation-migration.test.ts \
  test/control-activation.test.ts
pnpm exec tsc --noEmit
```

The tests cover migration invariants, accepted-source enforcement, tenant
isolation, role and entitlement denial, conflicts, idempotent retries,
supersession, suspension, rollback, change proposals, projection replay, and
API/MCP parity.
