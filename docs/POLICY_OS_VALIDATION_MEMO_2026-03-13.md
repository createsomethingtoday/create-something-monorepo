# Policy OS Validation Memo

> Date: March 13, 2026
> Scope: repo-level validation for Policy OS graduation and production release

## Summary

This memo ties together the canonical package definition, contract bundle, active authz manifests, exemplar bundles, local verification results, and post-deploy verification evidence for the Policy OS release.

## Canonical package surfaces

The canonical package definition is now anchored in:

- [POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md)
- [MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)

Current public/service surfaces now reflect:

- `Policy OS` as the canonical paid package
- `MCP-only` as the discovery/compliance wedge
- `Workflow Infrastructure` and `Enterprise Extension` as delivery layers around the package

## Canonical contract bundle

Root canonical templates:

- `templates/mcp_contract.yaml`
- `templates/agent_contract.yaml`
- `templates/outcome_contract.md`
- `templates/golden_tasks.yaml`
- `packages/agency/content/templates/delivery/runbook.md`

Required Policy OS metadata now travels with the bundle:

- `package_name`
- `approved_workflows`
- `approval_mode`
- `escalation_policy`
- `review_cadence`
- `billing_and_entitlement_assumptions`

Mirrored `.agency` delivery templates explicitly mirror the canonical root bundle rather than defining a second schema.

## Active runtime-backed policy manifests

Compiled artifacts were generated on March 13, 2026 under `docs/policies/generated/`.

Active manifests in the compiled bundle:

1. `policy.hub-route-authorization.v1`
2. `policy.judgment-baseline.v1`
3. `policy.legacy-compat-sunset.v1`
4. `policy.mcp-credential-delivery.v1`
5. `policy.mcp-session-self-service.v1`
6. `policy.partner-auth-governance.v1`
7. `policy.service-tier-entitlement.v1`
8. `policy.user-bearer-token-governance.v1`

Publish path validation:

- `pnpm authz:publish` now publishes all active manifests by default.
- Dry-run verification succeeded against all eight active manifests using:
  - `OSO_URL=https://example.com OSO_API_KEY=dummy DRY_RUN=1 pnpm authz:publish`

## Standardized exemplar set

Repeatable package shape is demonstrated with the three Half Dozen exemplar bundles:

1. `hd-dedup-v1`
2. `hd-inbox-triage-v1`
3. `hd-fleet-watchdog-v1`

Each exemplar bundle now carries Policy OS package metadata across:

- `mcp_contract`
- `agent_contract`
- `outcome_contract`
- `golden_tasks`

This demonstrates repeatable artifact shape without overstating broader multi-client live delivery.

## Local verification evidence

The following local gates passed on March 13, 2026:

- `pnpm authz:compile`
- `pnpm policy:artifacts:check`
- `pnpm --filter @create-something/policy-os-engine test`
- `pnpm --filter @create-something/mcp-authz test`
- `pnpm --filter @create-something/cs-mcp-hub-remote test`
- `pnpm --filter @create-something/identity-worker test`
- `pnpm --filter @create-something/agency check`
- `pnpm --filter @create-something/agency build`

Key behavioral proof covered by tests:

- `mcp_only` cannot discover `policy_os_only` routes
- `mcp_only` cannot execute paid governed writes
- `policy_os_trial` and `policy_os_core` allow paid execution when entitlement checks pass
- paid access is denied when `policy_accepted`, `contract_active`, or `billing_active` is false
- destructive hub routes require human review

## Post-deploy verification

Deployment targets:

- `.agency`
- `identity-worker`
- `cs-mcp-hub-remote`

Post-deploy commands:

- `pnpm mcp:hub:fleet:verify`
- `pnpm policy:os:verify:live`

Result:

- `.agency` deployed successfully via Cloudflare Pages.
  - deployment URL: `https://f80d8e37.create-something-agency.pages.dev`
  - public manifest verification: `https://create-something-agency.pages.dev/api/manifest` returned `200`
  - verified manifest service slugs: `workflow-infrastructure`, `policy-os`, `reliability-and-control-layer`, `enterprise-extension`, `mcp-only-discovery`
  - manifest generated timestamp: `2026-03-13T14:57:48.961Z`
- `identity-worker` deployed successfully.
  - current version ID: `aa791c0e-3ebe-4b37-87f8-79026850a2f7`
  - root health response: `{"service":"identity-worker","version":"0.1.0","status":"healthy"}`
- `cs-mcp-hub-remote` deployed successfully.
  - current version ID: `c0c81494-d652-4c6f-8ae5-513f05413e32`
  - `/health` confirmed `auth_required=true`, `identity_mode=session_required`, `telemetryDbConfigured=true`, `built_at=2026-03-13T14:57:19.762Z`
- `pnpm mcp:hub:fleet:verify` did not pass cleanly.
  - existing fleet drift was reported for `cs-hub-danny` and `cs-hub-mj` because enabled-server policy on those hubs no longer matches the verifier's expected allowlist
  - the script also reported a `cs-mcp-hub-remote` health-check failure even though direct `/health` returned a valid payload after deploy
  - compat, protocol, ClickUp, and account-routing checks were blocked by missing per-hub API token env vars in the local shell
- `pnpm policy:os:verify:live` was blocked before execution because `AGENCY_INTERNAL_API_KEY` was not present in the local environment.
  - this prevented a full end-to-end live verification of entitlement resolution, session minting, discovery deny, and governed write deny/allow behavior from this machine

Trace evidence:

- No new routed trace IDs were captured in this run.
- The scripted live verifier could not reach routed-tool execution because required operator secrets were not present locally.
- Deployment evidence for this release is preserved through the runtime version IDs and the post-deploy HTTP checks above.

## Claim boundary

This release is sufficient to claim:

- canonical Policy OS packaging in-repo
- active runtime-backed policy lifecycle
- tested entitlement and governance enforcement paths
- standardized repeatable artifact shape

This release is not sufficient to claim:

- clean live fleet verification across every existing hub in the current production estate
- end-to-end live Policy OS verification from this shell without the operator secret set required by `scripts/policy-os-live-verify.sh`
- broad multi-client live repeatability beyond the evidence currently preserved in this repo
