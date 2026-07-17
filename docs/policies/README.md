# Policy Catalog

This directory contains CREATE SOMETHING policy artifacts as versioned, auditable documents.

## Scope

First-wave policies scaffolded here:

1. `policy.account-role-boundaries.v1`
2. `policy.judgment-baseline.v1`
3. `policy.hub-route-authorization.v1`
4. `policy.mcp-session-self-service.v1`
5. `policy.partner-auth-governance.v1`
6. `policy.mcp-credential-delivery.v1`
7. `policy.legacy-compat-sunset.v1`
8. `policy.engine-rollout-gates.v1`
9. `policy.global-access-kill-switch.v1`
10. `policy.tenant-tool-exposure.v1`
11. `policy.integration-selection.v1`
12. `policy.policy-lifecycle-governance.v1`
13. `policy.paper-experiment-release-gate.v1`
14. `policy.user-bearer-token-governance.v1`
15. `policy.identity-subject-rebind-governance.v1`
16. `policy.client-hub-user-experience.v1`
17. `policy.progressive-profile-governance.v1`
18. `policy.service-tier-entitlement.v1`
19. `policy.cross-workspace-sync-governance.v1`
20. `policy.prospect-hub-onboarding.v1`
21. `policy.git-light-agent-delivery.v1`
22. `policy.prose-quality.v1`

Each policy has:

- a human-readable specification (`.md`)
- a machine-readable starter artifact (`.json`)

## Layout

- `v1/policy.*.md`
- `v1/policy.*.json`

## Notes

- Runtime-backed authz manifests compiled from `packages/mcp-authz` may be `active` when they are enforced and publishable.
- Docs-only policy artifacts remain `draft` until promoted under lifecycle governance.
- Policy IDs are stable and intended for traceability in runbooks, control planes, and sales artifacts.
- Promotion flow is defined in `policy.policy-lifecycle-governance.v1`.
- Compiled runtime artifacts are generated under `docs/policies/generated/`.
