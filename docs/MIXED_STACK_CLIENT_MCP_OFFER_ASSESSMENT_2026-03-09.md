# Mixed-Stack Client MCP Offer Assessment

> Prepared: March 9, 2026
> Context: internal assessment of the Gemini/Composio "client MCP hub" brief against current monorepo capabilities and CREATE SOMETHING packaging rules

## Executive Summary

- The external brief is directionally correct: Composio can support managed auth, toolkit-scoped MCP distribution, and partner-facing MCP delivery for client environments.
- The repo position is narrower and stronger: Composio is implementation plumbing for commodity SaaS connectivity, while the client-facing product surface stays CREATE SOMETHING-owned.
- For a mixed-stack client, the recommended offer is not "Composio hub for clients." It is a CREATE SOMETHING house stack:
  - one branded MCP hub endpoint
  - identity/session control
  - policy artifacts and exposure rules
  - observability and traceability
  - runbooks and contracts
- `MCP-only` remains the discovery/compliance wedge. The default paid delivery remains `Agent Outcome Stack`.
- Current repo evidence supports this direction, but not an overclaim. The shared-hub governance story still needs proof around tenant routing population and fleet-hardening of quota/retry/authz controls.

## Verdict

### Recommended client posture

Present the offer as **CREATE SOMETHING Skills + MCP**, with one house MCP hub as the public entrypoint.

1. Commodity SaaS connectivity goes through Composio-backed toolkit routes behind the hub.
2. Client-specific workflows remain custom MCP surfaces and should not be flattened into raw provider-branded catalogs.
3. Large or variable tool catalogs stay brokered through:
   - `hub_search_proxy_tools`
   - `hub_describe_proxy_tool`
   - `hub_execute_proxy_tool`
4. Partner delivery should use managed `.agency` bearer or OAuth-backed access, not direct Composio-hosted URLs as the default client surface.

### What not to sell

- Do not position Composio itself as the product.
- Do not promise a fully governed shared client hub without showing tenant scoping, route authorization, rate limits, quotas, and trace lookup working together in the deployed path.
- Do not expose broad direct tool catalogs when the repo policy already requires brokered discovery for large or provider-variable surfaces.

## Current State: Implemented vs. Target-Hardening

| Layer | Already implemented in repo | Documented target state still needing hardening |
|------|------------------------------|-------------------------------------------------|
| **Database** | `identity-worker` session and bearer surfaces, hub registry/state/routing files, policy artifacts, telemetry tables | richer tenant routing population, stronger evidence that runtime state and tenant policy are synchronized in real deployments |
| **Automation** | `cs-mcp-hub-remote` broker-first hub, `composio-toolkit-mcp`, `composio-bridge`, partner init/audit scripts, harness | fleet-scale proof for centralized quota/retry/rate-limit governance and fully hardened shared-hub operations |
| **Judgment** | policy catalog, `mcp-authz`, `policy-os-engine`, `judgment-layer`, packaging rule that Composio remains plumbing | production evidence that policy runtime gates every protected route in the shared remote-hub path |

## Evidence By Tier

### Database

The substrate for a house offer already exists:

- [packages/identity-worker/README.md](./../packages/identity-worker/README.md) documents MCP session minting, resolution, managed bearer issuance, legacy compat lanes, and `.agency` entitlement checks.
- `config/mcp-hub/registry.json`, `config/mcp-hub/state.json`, and `config/mcp-hub/routing.json` provide the registry/state/routing split expected of a controlled gateway.
- [docs/policies/README.md](./policies/README.md) and the `policy.*` artifacts establish policy as a tracked, auditable deliverable.
- `TELEMETRY_DB` is already part of the hub and MCP fleet story.

Assessment:

- The database/control substrate is strong enough to support a branded client offer.
- The routing substrate is not yet heavily populated. Current routing defaults are sparse, which is acceptable for foundation status but not for overclaiming mature multi-tenant governance.

### Automation

The automation layer already matches the intended delivery shape:

- [packages/cs-mcp-hub-remote/README.md](./../packages/cs-mcp-hub-remote/README.md) defines a single public MCP endpoint with broker-first execution, discovery controls, trace lookup, session-scoped identity, and downstream proxy execution.
- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md) defines the recommended production posture:
  - `HUB_IDENTITY_MODE=session_required`
  - `X-MCP-Session-Token`
  - managed `.agency` bearer for partner delivery
- [packages/composio-toolkit-mcp/README.md](./../packages/composio-toolkit-mcp/README.md) gives toolkit-scoped routes plus `connection_status` and `get_connect_link`, which is the right shape for managed auth UX behind a house hub.
- `scripts/partner-client-init.ts` and `scripts/partner-composio-audit.ts` show concrete partner onboarding and toolkit/audit automation.
- [packages/harness/README.md](./../packages/harness/README.md) supports the execution and review loop needed for delivery and hardening work.

Assessment:

- The house automation surface is real.
- The repo also explicitly documents that the fleet-scale gateway target is not yet fully closed out as production-ready.

### Judgment

The repo’s differentiation lives here:

- [docs/policies/v1/policy.integration-selection.v1.md](./policies/v1/policy.integration-selection.v1.md) states that commodity connectivity should default to Composio plumbing, while deep or client-specific integrations must stay custom.
- [docs/MCP_CATALOG_EXPOSURE_POLICY.md](./MCP_CATALOG_EXPOSURE_POLICY.md) requires brokered discovery for broad or provider-variable surfaces.
- [docs/policies/v1/policy.tenant-tool-exposure.v1.md](./policies/v1/policy.tenant-tool-exposure.v1.md) defines tenant-scoped tool exposure and provider routing controls.
- [packages/judgment-layer/README.md](./../packages/judgment-layer/README.md), `mcp-authz`, and `policy-os-engine` provide the policy runtime and operational framing for gated execution.

Assessment:

- This is the moat. The repo is not merely offering tool connectivity; it is packaging policy, routing, approvals, and evidence as the durable value layer.

## Commercial Packaging Recommendation

### Default package

Sell the mixed-stack offer as **Agent Outcome Stack**.

Client-facing language:

- `Skills + MCP`
- one CREATE SOMETHING hub endpoint
- house contracts, approval policy, escalation policy, and runbooks

Technical proof language:

- `MCP + Skills`
- Composio behind the scenes for commodity OAuth and CRUD
- custom MCP surfaces for deep workflow logic

### Entry wedge

Use `MCP-only` only when the client is in one of these lanes:

1. discovery or architecture validation
2. compliance-constrained read-only or approval-heavy deployments
3. internal team-operated agent setups where autonomy is intentionally limited

### Delivery surface

Keep the public surface CREATE SOMETHING-branded:

1. one hub URL
2. broker-first tool discovery and execution
3. session/account-scoped tool-prefix enforcement
4. managed `.agency` bearer or OAuth-backed delivery for partner users

Direct Composio-hosted MCP URLs should remain an approved exception path, not the default product surface.

## Key Gaps Before Overclaiming Shared-Hub Maturity

### 1. Fleet-scale readiness is still documented as incomplete

[docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md](./HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md) explicitly says:

- the hub is a usable foundation
- Composio is conditionally adopted
- fleet-scale gateway hardening is not fully closed

### 2. Routing policy exists faster than routing population

`config/mcp-hub/routing.json` contains the scaffolding for tenant policy and provider aliases, but the live file is still mostly default-state. This is a maturity gap, not a strategy gap.

### 3. Governance claims need runtime proof, not only docs

[docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md) correctly defines the desired pipeline:

1. actor context
2. route classification
3. authorization
4. quotas and rate limits
5. retry/backoff
6. downstream execution
7. telemetry and traces

That sequence should be treated as required proof before promising a fully governed shared client hub.

## Validation Scenarios For Client Readiness

The following checks should be used before converting this assessment into external sales certainty:

### Commodity connectivity

- Connect one SaaS toolkit through the house hub.
- Verify account isolation, `connection_status`, auth-required flow, and brokered execution.

### Mixed workflow

- Execute one custom client tool and one Composio-backed tool within the same governed hub session.
- Confirm the client experience still looks like one CREATE SOMETHING system.

### Tenant control

- Use a second account or tenant and confirm out-of-scope tools are denied by policy.

### Governance

- Verify authz, rate limits, quotas, retry behavior, and trace lookup across read, write, and destructive paths.

### Delivery

- Confirm the handoff bundle is sufficient for Codex-first usage while preserving MCP portability.

## Recommended Handoff Bundle

If this assessment graduates into delivery standardization, the client handoff bundle should include:

1. `mcp_contract.yaml`
2. `agent_contract.yaml`
3. `outcome_contract.md`
4. operations runbook covering:
   - auth and session delivery
   - approvals and escalation
   - telemetry and trace inspection
   - rollback and incident response

## Final Recommendation

For a mixed-stack client, the monorepo supports a strong internal recommendation:

- **Use Composio where the work is commodity connectivity.**
- **Keep CREATE SOMETHING in front as the MCP hub, policy, and operating layer.**
- **Keep deep workflow value custom.**
- **Sell the governed house stack, not the upstream connector vendor.**

That position is fully aligned with current repo strategy and packaging. The remaining work is not to invent the model; it is to finish proving the shared-hub governance path at runtime and to populate tenant routing/policy evidence deeply enough to support stronger external claims.

## Source Anchors

### Official Composio documentation

- [Single Toolkit MCP](https://docs.composio.dev/docs/single-toolkit-mcp)
- [Partner Program API](https://v3.docs.composio.dev/docs/mcp-partner-api)
- [MCP URL security changes (November 5, 2025)](https://docs.composio.dev/docs/changelog/2025/11/05)

### Repo canon

- [docs/COMPOSIO_PATTERNS.md](./COMPOSIO_PATTERNS.md)
- [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md)
- [docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md](./HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md)
- [docs/COMPOSIO_MULTI_TENANT_HUB_MIGRATION_PLAN_2026-02-26.md](./COMPOSIO_MULTI_TENANT_HUB_MIGRATION_PLAN_2026-02-26.md)
- [docs/policies/v1/policy.integration-selection.v1.md](./policies/v1/policy.integration-selection.v1.md)
- [docs/policies/v1/policy.tenant-tool-exposure.v1.md](./policies/v1/policy.tenant-tool-exposure.v1.md)
