# Hub Policy Promotion Checklist (2026-03-15)

Use this checklist when deciding whether a Hub-adjacent policy can move from `draft` to `active`.

## Scope

This checklist covers the policies most directly tied to Hub discovery, execution, entitlement, credential delivery, and partner-managed access:

- `policy.hub-route-authorization.v1`
- `policy.service-tier-entitlement.v1`
- `policy.partner-auth-governance.v1`
- `policy.mcp-credential-delivery.v1`
- `policy.tenant-tool-exposure.v1`
- `policy.cross-workspace-sync-governance.v1`
- `policy.policy-lifecycle-governance.v1`

## Common Promotion Gate

A policy should be treated as `active` only when all of the following are true:

1. Approval record and change rationale exist, per `policy.policy-lifecycle-governance.v1`.
2. The publication path completed the required review flow:
   - Loom task
   - draft PR
   - Review 1
   - Review 2
   - human-applied `publish-approved`
   - merge to `main`
   - post-merge verification
3. The markdown and JSON artifacts under `docs/policies/v1/` exist and pass `policy:artifacts:check`.
4. If the policy is runtime-backed, compiled artifact integrity exists:
   - `policy_engine`
   - `policy_polar`
   - `policy_hash`
   - `compiler_version`
   - `fallback_ir_json`
5. If the policy is runtime-backed, the generated bundle under `docs/policies/generated/` has been rebuilt and committed.
6. If the policy is enforced through the OSO publish path, the active manifest has been published.
7. Human-readable status, machine-readable status, and runtime manifest state do not contradict each other.

## Current State (2026-03-15)

- Runtime-backed active manifest bundle exists for:
  - `policy.hub-route-authorization.v1`
  - `policy.service-tier-entitlement.v1`
  - `policy.partner-auth-governance.v1`
  - `policy.mcp-credential-delivery.v1`
  - plus other authz policies already listed in `docs/policies/generated/mcp-authz-manifests.v1.json`
- The starter artifacts in `docs/policies/v1/` for those runtime-backed policies now match the active runtime manifest state.
- `policy.tenant-tool-exposure.v1` is still draft-only and is not part of the generated active authz manifest bundle.
- `policy.cross-workspace-sync-governance.v1` is still draft-only.
- `policy.policy-lifecycle-governance.v1.md` and `policy.policy-lifecycle-governance.v1.json` now both say `active`.

## Per-Policy Checklist

### `policy.hub-route-authorization.v1`

Current state:

- Runtime-backed manifest is already `active`.
- Starter markdown and JSON artifacts now match the active runtime manifest state.

Needed for full promotion alignment:

1. Confirm the approval record and change rationale that justify the already-active runtime manifest.
2. Keep `packages/mcp-authz/src/policies.ts` and `docs/policies/generated/mcp-authz-manifests.v1.json` aligned.
3. Keep the human-readable and starter machine-readable artifacts aligned with runtime state, or explicitly document that the generated manifest is the canonical active artifact if they diverge again.
4. Verify publish output if OSO is the live enforcement plane.

### `policy.service-tier-entitlement.v1`

Current state:

- Runtime-backed manifest is already `active`.
- Starter markdown and JSON artifacts now match the active runtime manifest state.

Needed for full promotion alignment:

1. Confirm approval evidence for the current active manifest.
2. Keep the runtime registry, generated manifest bundle, and policy hash aligned.
3. Keep the catalog artifacts aligned or document why the generated manifest is the authoritative active surface if they diverge again.
4. Verify that entitlement gating remains reflected in live publish output and post-merge checks.

### `policy.partner-auth-governance.v1`

Current state:

- Runtime-backed manifest is already `active`.
- Starter markdown and JSON artifacts now match the active runtime manifest state.

Needed for full promotion alignment:

1. Confirm approval evidence for partner-admin and named-lane governance.
2. Keep the runtime registry, generated manifest bundle, and publish path aligned.
3. Keep the catalog artifacts aligned or document why the generated manifest is the authoritative active surface if they diverge again.
4. Retain evidence for consent, review traceability, and publish verification.

### `policy.mcp-credential-delivery.v1`

Current state:

- Runtime-backed manifest is already `active`.
- Starter markdown and JSON artifacts now match the active runtime manifest state.

Needed for full promotion alignment:

1. Confirm approval evidence for credential-delivery enforcement.
2. Keep the runtime registry, generated manifest bundle, and publish path aligned.
3. Keep the catalog artifacts aligned or document why the generated manifest is the authoritative active surface if they diverge again.
4. Retain delivery-audit and verification evidence for the promoted state.

### `policy.tenant-tool-exposure.v1`

Current state:

- Draft-only policy.
- Not present in the generated active authz manifest bundle.
- A generated routing artifact now exists at `docs/policies/generated/tenant-tool-exposure-routing.v1.json`, compiled from `config/mcp-hub/routing.json`.
- The Hub runtime now consumes that generated artifact for tenant allow-server, allow-tag, allow-access-type, and allow-prefix filtering in the visible-route path.
- The generated artifact currently covers server allowlists, tag allowlists, access-type allowlists, tool-prefix allowlists, tenant key aliases, and routed alias recommendation plans with skipped-candidate reasons.
- Named-lane tenants can now hide generic write/destructive/control-plane routes while still exposing read and reconnect surfaces, which partially constrains broad raw provider catalogs until a stricter workflow target-scope model exists.
- The generated artifact and remote broker still do not implement provider candidate failover execution, precise workflow target-scope constraints, or a publish flow.
- Pending OAuth candidate handling now exists only at the routed-alias recommendation layer; it is still not a full execution-time policy surface for direct proxy tools.

Needed before promotion:

1. Decide whether the generated routing artifact is the final enforcement surface:
   - keep it as a compiled/queryable control-plane artifact, or
   - move the policy into a runtime authz manifest in `packages/mcp-authz`
2. Close the current coverage gaps between the draft policy statements and the generated runtime artifact.
3. Add publish and verification steps for the chosen enforcement surface.
4. Record approval evidence and post-merge verification.
5. Only then change the policy from `draft` to `active`.

### `policy.cross-workspace-sync-governance.v1`

Current state:

- Draft-only policy.
- There is partial runtime evidence in the repo:
  - `packages/meetings/src/index.ts` already provides queue processing, bounded retry, DLQ behavior, and a reprocess endpoint
  - `packages/halfdozen-zoom-sync/src/lib/db.ts` and `src/resources/status.ts` provide run-history and status resources
- The current examples do not yet establish one canonical compiled or published policy surface for governed cross-workspace sync, and the Zoom Clips example uses run-level status rather than the fuller per-record sync ledger described by the policy.

Needed before promotion:

1. Define the actual governed job surface for sync execution, replay, and evidence.
2. Bind the policy to real runtime artifacts, not only prose.
3. Establish a publish or verification path for that runtime surface.
4. Keep the policy `draft` until those runtime bindings exist.

### `policy.policy-lifecycle-governance.v1`

Current state:

- Markdown and starter JSON both say `active`.

Needed before the repo can claim consistency:

1. Record the approval evidence and change rationale that support the active lifecycle state.
2. Clarify whether docs-only lifecycle policy JSON is expected to mirror active state directly or remain a starter artifact while another promoted record is authoritative.

## Operational Steps

For runtime-backed authz policies, the working sequence is:

1. Update the runtime registry in `packages/mcp-authz/src/policies.ts`.
2. Rebuild generated artifacts with `scripts/compile-authz-manifests.ts`.
3. Commit the outputs under `docs/policies/generated/`.
4. Publish active manifests with `scripts/publish-authz-policy.ts` when OSO publication is required.
5. Run `scripts/policy-artifact-check.mjs`.
6. Record review and verification evidence in Loom/PR.

For the tenant-routing control-plane artifact, the working sequence is:

1. Update `config/mcp-hub/routing.json`.
2. Rebuild the generated routing artifact with `scripts/compile-tenant-routing-artifact.mjs`.
3. Commit `docs/policies/generated/tenant-tool-exposure-routing.v1.json`.
4. Redeploy or restart the Hub so the runtime picks up the new compiled artifact.
5. Run `scripts/policy-artifact-check.mjs` and targeted Hub routing verification.
6. Record review and verification evidence in Loom/PR.

## Source Anchors

- `docs/policies/README.md`
- `docs/policies/v1/policy.policy-lifecycle-governance.v1.md`
- `docs/policies/v1/policy.paper-experiment-release-gate.v1.md`
- `docs/policies/generated/mcp-authz-manifests.v1.json`
- `docs/policies/generated/tenant-tool-exposure-routing.v1.json`
- `packages/mcp-authz/src/policies.ts`
- `scripts/compile-authz-manifests.ts`
- `scripts/compile-tenant-routing-artifact.mjs`
- `scripts/publish-authz-policy.ts`
- `scripts/policy-artifact-check.mjs`
