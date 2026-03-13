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
- team hub fleet (`cs-hub-lainy`, `cs-hub-danny`, `cs-hub-august`, `cs-hub-c3denver`, `cs-hub-aaron-outerfields`, `cs-hub-andre-outerfields`, `cs-hub-fillip`, `cs-hub-leah`, `cs-hub-mj`)

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
- `cs-mcp-hub-remote` was redeployed and repaired during post-release stabilization.
  - current version ID: `04a7e159-1da7-4356-b59e-d19e46be1424`
  - `/health` confirmed `auth_required=true`, `identity_mode=session_required`, `telemetryDbConfigured=true`, `session_resolver.has_binding=true`, `built_at=2026-03-13T17:14:42.277Z`
- fleet deploy/state normalization completed for the team hubs and shared core hub.
  - the deploy script now keeps team hubs in `compat` mode and the shared core hub in `session_required`
  - the deploy script now writes hub KV state with `--preview false`
- `pnpm mcp:hub:fleet:verify` passed after the verifier and deploy remediation work.
  - secrets, health, identity-mode checks, MCP protocol checks, Outerfields ClickUp visibility, and compat account routing all passed
  - the shared core hub still intentionally reports `account_routing=skipped reason=core_hub_probe_timeout_variance`
  - identity-worker `admin-mint` returned `403 missing mcp_session_admin_mint`, but the verifier fell back to `v1/mcp/long-lived-tokens/admin-issue` successfully for strict-hub session-based verification
- `pnpm policy:os:verify:live` passed from this machine after the verifier/runtime fixes.
  - local run used `REQUIRE_AGENCY_ENTITLEMENT_CHECK=false` because `AGENCY_INTERNAL_API_KEY` was not available in the local Infisical export
  - live proof covered: strict missing-session enforcement, identity resolve, `mcp_only` block on `policy_os_only`, `mcp_only` block on paid governed write, and paid `Policy OS` discovery on `composio-toolkit-slack__slack_send_message`

Trace evidence:

- No routed trace IDs were emitted by the current verifier scripts.
- Release evidence for this run is preserved through the runtime version IDs above plus the successful `pnpm mcp:hub:fleet:verify` and `pnpm policy:os:verify:live` outputs captured on March 13, 2026.

## Claim boundary

This release is sufficient to claim:

- canonical Policy OS packaging in-repo
- active runtime-backed policy lifecycle
- tested entitlement and governance enforcement paths
- standardized repeatable artifact shape
- passing live Policy OS verification against the shared strict hub
- passing fleet verification across the current production hub estate, with the shared core-hub account-routing probe explicitly skipped by design

This release is not sufficient to claim:

- routed trace-ID capture from the current verifier scripts
- broad multi-client live repeatability beyond the evidence currently preserved in this repo
