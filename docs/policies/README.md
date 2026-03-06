# Policy Catalog

This directory contains CREATE SOMETHING policy artifacts as versioned, auditable documents.

## Scope

First-wave policies scaffolded here:

1. `policy.account-role-boundaries.v1`
2. `policy.judgment-baseline.v1`
3. `policy.engine-rollout-gates.v1`
4. `policy.global-access-kill-switch.v1`
5. `policy.tenant-tool-exposure.v1`
6. `policy.integration-selection.v1`
7. `policy.policy-lifecycle-governance.v1`
8. `policy.paper-experiment-release-gate.v1`

Each policy has:

- a human-readable specification (`.md`)
- a machine-readable starter artifact (`.json`)

## Layout

- `v1/policy.*.md`
- `v1/policy.*.json`

## Notes

- Status is initialized as `draft`.
- Policy IDs are stable and intended for traceability in runbooks, control planes, and sales artifacts.
- Promotion flow is defined in `policy.policy-lifecycle-governance.v1`.
