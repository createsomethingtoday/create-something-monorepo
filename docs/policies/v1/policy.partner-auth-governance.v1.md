# policy.partner-auth-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING partner operations`
- Effective date: `TBD`

## Purpose

Define policy controls for partner-admin actions that mint MCP sessions, issue managed bearer credentials, and manage toolkit auth on behalf of client workspaces and named teammate lanes.

## Scope

- Partner-boundary admin minting (`/v1/mcp/sessions/admin-mint`)
- Lane-scoped partner issuance (`/api/partners/half-dozen/clients/:slug/lanes/:laneSlug/*`)
- Partner toolkit auth account management (`/api/partners/half-dozen/clients/:slug/notion/accounts/*`)
- Partner toolkit auth account management (`/api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/*`)
- Consent and actor trace requirements
- Hybrid rollout enforcement (`legacy_enforce -> shadow -> polar_enforce`)

## Policy Statements

1. Admin mint MUST be blocked when an active consent record is missing.
2. Admin mint MUST include actor trace metadata (`who minted`, `why`, `which client`).
3. Policy decisions for admin mint MUST be logged with:
   - `decision`
   - `evaluation_path`
   - `policy_hash`
   - `fallback_used`
   - `actor`
4. Rollout mode for partner governance MUST default to `legacy_enforce` until rollout gates pass.
5. Fallback policy path MAY be used only when primary policy evaluation fails, and fallback usage MUST be auditable.
6. Toolkit auth account viewing, upserts, and connect-link issuance MUST require an active consent record.
7. Toolkit account pinning and disabling MUST require a human review trace (for example `X-Partner-Review-Step`).
8. Unattended partner-managed automation MUST execute against operator-approved pinned toolkit accounts or equivalent governed runtime credentials. Personal end-user bearer tokens MUST NOT be repurposed as background job credentials.
9. Background job executions MUST record workflow or job identity in addition to actor trace metadata.
10. Partner-admin issuance flows MUST support explicit `allowed_tool_prefixes` for reviewer or custom hub lanes whose runtime surface cannot be expressed as a toolkit-only profile.
11. When partner-admin issuance uses explicit `allowed_tool_prefixes`, the delivery artifact and audit metadata MUST expose the effective prefix set so reviewers and operators can verify the lane transparently.
12. Named teammate lanes MUST be data-driven records, not hardcoded operator aliases. The canonical lane slug, public URL, and host key MUST remain aligned.
13. Lane initialization MAY occur before identity mapping is complete so infrastructure, URL, and routing can be provisioned ahead of customer onboarding.
14. Lane-scoped bearer and strict-session issuance MUST derive the effective `allowed_tool_prefixes` from the named lane record and MUST bind the credential to the lane host.
15. Lane-scoped bearer and strict-session issuance MUST deny when client identity mapping, active consent, or lane identity subject binding is missing, even if the named lane itself is already provisioned.
16. Vault-backed worker/runtime tokens used to bootstrap or verify named lanes are operator-only controls and MUST NOT be repurposed as customer-delivered bearer artifacts.
17. Telemetry and Langfuse tracing are mandatory baseline observability controls for partner-managed named lanes.
18. Those observability traces MUST include explicit account attribution, at minimum `account_id`, `tenant_id`, and the lane slug or bound host, for issuance, denial, and routed-call evidence.
19. Operator-assisted white-glove onboarding is an approved partner-governed pathway for initial customer access delivery when a named lane or client hub is being set up directly with the customer.
20. White-glove onboarding MAY deliver a managed bearer credential or an approved legacy credential before the customer has logged into `.agency`, but the governing partner route MUST still record actor trace, recipient, delivery channel, effective scope, and the follow-on self-service surface.
21. White-glove onboarding MUST NOT bypass the policy prerequisites for the selected credential type. If consent, exception approval, or subject binding is required for that credential, the handoff MUST remain blocked until those prerequisites are satisfied.
22. `.agency` remains the canonical self-service surface after white-glove delivery for revoke, regenerate, password rotation, connection management, and ongoing access visibility.
23. When a named lane promises a third-party search surface, the approved provider set is `composio-toolkit-exa`, `composio-toolkit-perplexityai`, and `composio-toolkit-composio_search`.
24. A named lane MUST NOT be treated as search-ready unless every promised search provider has its required runtime prerequisites satisfied.
25. For auth-bound search providers such as Exa or PerplexityAI, the required prerequisite is a live auth-config mapping in `COMPOSIO_AUTH_CONFIG_MAP` plus a successful `get_connect_link` or equivalent governed auth path.
26. For `NO_AUTH` providers such as `composio-toolkit-composio_search`, the required prerequisite is that the toolkit is enabled on the lane and at least one representative brokered tool call succeeds without customer auth.
27. Search-provider choice MAY be lane-specific. A lane MAY expose Exa, PerplexityAI, Composio Search, or any approved combination, but the public contract, runbook, and delivery metadata MUST name the actual enabled provider set.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/sessions/admin-mint`
  - `mcp_policy_rollout`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/access/mint`
  - `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/init`
  - `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/access/mint`
  - `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/bearer-token/issue`
  - `GET|POST /api/partners/half-dozen/clients/:slug/notion/accounts`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/connect-link`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/pin`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/disable`
  - `GET|POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/connect-link`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/pin`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/disable`

- Agency partner data:
  - `partner_auth_access_lanes`

## Evidence

- Decision events in `mcp_policy_events`
- Consent linkage in admin mint payloads and partner consent records
- Delivery audit records in `partner_access_deliveries`
- workflow or job traces showing pinned account and runtime identity selection
- lane audit records showing lane slug, host key, and effective prefix set
- observability traces showing `account_id`, `tenant_id`, and lane slug or bound host on issuance, deny, and routed-call records
- white-glove delivery records showing the onboarding handoff channel, recipient, and designated follow-on self-service surface
- deny records showing issuance blocked for missing identity mapping, missing active consent, or missing lane identity subject
- resolver and hub traces showing host-bound credential enforcement
- lane verification evidence showing the promised search provider set and successful auth-config/connect-link validation for each promised provider

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/init/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/notion/accounts/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/+server.ts`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/policy-os-engine/src/hybrid.ts`
