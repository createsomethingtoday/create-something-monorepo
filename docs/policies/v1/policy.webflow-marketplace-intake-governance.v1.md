# policy.webflow-marketplace-intake-governance.v1

- Status: `draft`
- Owner: `Webflow Marketplace systems`
- Effective date: `TBD`

## Purpose

Define the source-of-truth, escalation, retry, and hard-block governance for Webflow Marketplace intake surfaces in this monorepo.

## Scope

- Marketplace app submission intake
- Marketplace template intake
- creator eligibility checks that block submission
- retry and manual-review escalation for failed intake delivery
- MCP, automation, and Designer Extension consumers of Marketplace intake data

## Policy Statements

1. Hosted intake surfaces MUST be treated as distinct products when they serve different Marketplace workflows.
2. `apps/webflow-app-form-cloud` owns public app-submission collection behavior.
3. `apps/webflow-dashboard-cloud` owns creator dashboard and template-intake collection behavior.
4. Shared Marketplace status vocabulary, retry defaults, and cross-surface contract definitions SHOULD live in `packages/webflow-marketplace-core`.
5. Hard-block validation rules MUST have a named source-of-truth and MUST NOT be duplicated silently across apps, MCPs, or extensions.
6. Any change to submission statuses, retry limits, cooldowns, or manual-review thresholds MUST update both the shared Marketplace contracts and this policy artifact.
7. MCP and Designer Extension surfaces MAY consume Marketplace intake data and contracts, but MUST NOT redefine source-of-truth validation behavior locally without explicit rationale.
8. Deterministic retry and cleanup workflows SHOULD remain in automation or route-handler logic, not in policy prose alone.
9. Any intake workflow that reaches its retry ceiling MUST expose a manual-review or operator-intervention path.
10. Surface ownership changes MUST update the Marketplace surface registry in the same change.
11. New Marketplace intake surfaces MUST declare whether they are public submitter surfaces, internal operator surfaces, MCP surfaces, or automation surfaces.
12. Policy updates are required whenever a warning becomes a hard block, a hard block becomes advisory, or a source-of-truth system changes.

## Enforcement Surfaces

- `docs/WEBFLOW_MARKETPLACE_SURFACE_REGISTRY.md`
- `packages/webflow-marketplace-core/`
- hosted intake app READMEs and local `AGENTS.md`
- design and architecture review for Marketplace surfaces

## Evidence

- linked surface registry entry
- shared contract updates
- updated policy artifact when hard-block behavior changes
- implementation references in affected app, MCP, extension, or automation packages

## Source Anchors

- `docs/THREE_TIER_FRAMEWORK.md`
- `docs/policies/README.md`
- `docs/WEBFLOW_MARKETPLACE_SYSTEM_OVERVIEW.md`
- `docs/WEBFLOW_MARKETPLACE_SURFACE_REGISTRY.md`
- `packages/webflow-marketplace-core/`
