# policy.client-hub-user-experience.v1

- Status: `draft`
- Owner: `CREATE SOMETHING product + identity + hub operations`
- Effective date: `TBD`

## Purpose

Define the canonical user-experience contract for client-facing MCP access, transparent named-lane delivery, connection management, and governed in-conversation UI across `.agency`, dedicated client shells, and MCP App surfaces.

## Scope

- `.agency` customer-facing access surfaces
- hosted client chat products and concierge surfaces
- dedicated client shells under `packages/agency/clients/*`
- MCP App UI resources exposed by CREATE SOMETHING MCP servers
- auth-required and reconnect workflows for toolkit-backed integrations
- self-service versus operator-only action boundaries

## Policy Statements

1. `.agency` MUST remain the canonical self-service portal for managed MCP access unless a dedicated client shell is explicitly approved.
2. Dedicated client shells MAY change branding and information architecture, but MUST preserve the same underlying entitlement, audit, and credential-governance model used by `.agency`.
3. The default customer journey MUST present access in this order:
   - access eligibility
   - identity and account mapping
   - credential delivery
   - toolkit connection status
   - host setup
   - security and support context
4. Customer-facing UX MUST present CREATE SOMETHING as the house surface. Upstream connector vendors such as Composio MUST remain implementation plumbing rather than the primary product label.
5. External client-facing Hub lanes MUST use transparent person-plus-client naming (`<person-slug>-<client-slug>`) for the public lane slug, worker suffix, host key, and URL subdomain.
6. The named lane MUST appear consistently in the delivered URL, `.agency` access view, delivery metadata, audit rows, exception records, and runbooks. Opaque operator-only naming for client-facing lanes is prohibited.
7. Named-lane URLs MUST be enforceable. Managed bearer tokens and strict sessions issued for a named lane MUST be host-bound so a credential issued for one named lane is rejected on a different named-lane URL unless explicitly approved.
8. Customer-facing UX MUST support an explicit "infrastructure ready, credential pending" state for named lanes that have already been deployed but are still blocked on identity mapping, consent, or credential issuance.
9. In that pending state, the UI MUST show the transparent lane name and URL, explain why customer credentials are not yet available, and distinguish that blocked state from a denied or broken deployment.
10. Operator-assisted white-glove onboarding is an approved initial delivery path when CREATE SOMETHING or a partner is actively provisioning customer access. The experience MAY begin outside the `.agency` dashboard, but it MUST still resolve back to the same governed credential state.
11. Customer-facing UX MUST distinguish white-glove initial handoff from ongoing self-service. If a bearer token is delivered directly by an operator, the customer-facing follow-up path for revoke, regenerate, password rotation, and connection management MUST point back to `.agency` unless a dedicated client shell is explicitly approved.
12. Runtime worker bootstrap tokens, vault guardrail secrets, and other operator-only credentials MUST never appear in customer onboarding or customer-facing UI, even when white-glove onboarding is used.
13. Self-service customer actions MAY include:
   - policy acceptance
   - managed bearer token issue, revoke, and regenerate
   - MCP OAuth password set or rotate
   - viewing connection status
   - launching connect or reconnect links
   - copying approved host configuration snippets
14. Operator-only actions MUST include:
   - entitlement overrides
   - tenant routing mutation
   - toolkit account pinning or disabling
   - partner admin mint
   - legacy credential issuance
   - runtime bootstrap secret rotation or sync
   - direct control-plane mutation
15. Every blocked state shown to a customer MUST map to an explicit reason code and human-readable explanation. Generic "access denied" messaging without reason classification is prohibited.
16. Auth-required or reconnect-required toolkit flows MUST resolve through one standard recovery contract that identifies the toolkit, the required action, the reconnect path, and the retry expectation.
17. Customer-facing surfaces MUST clearly distinguish:
   - portal login
   - managed bearer token
   - MCP OAuth password
   - third-party toolkit connection state
18. Conversational DUI or MCP App UIs that can mutate state MUST route mutations through server tools and MUST honor the same policy, authorization, and audit requirements as non-UI execution paths.
19. CREATE SOMETHING MCP App UI resources MUST use curated, code-reviewed `ui://` resources. Raw model-generated executable UI delivered directly to end users without code review is prohibited.
20. If schema-driven or generative UI is used, the generated artifact MUST be a bounded data or layout spec rendered by approved UI components, not arbitrary executable code.
21. Dedicated client UX MUST disclose when access is blocked by legal, billing, contract, consent, or policy state, even if the credential itself still exists.
22. Any client-facing DUI that supports write or destructive actions MUST include an explicit review or confirmation step when required by route classification or policy.
23. Telemetry and Langfuse tracing are mandatory baseline observability controls for dedicated named lanes. They are operator-facing controls and MUST NOT expand the client-visible tool surface.
24. When a hosted chat or concierge product is part of delivery, it MUST be implemented as a product surface separate from `.agency` control-plane routes and separate from MCP App DUI resources.
25. Hosted chat or concierge products MUST follow [`policy.progressive-profile-governance.v1`](./policy.progressive-profile-governance.v1.md) for inferred-versus-confirmed field handling and dynamic widget selection.
26. Client-facing Hub and MCP broker surfaces MUST use service-first discovery as the standard contract: list services first, then search tools within the chosen service, then describe and execute the selected proxy tool.
27. When the target service is already known, brokered tool search MUST be scoped to that service. Full-catalog proxy authorization before service selection is prohibited as the default path.
28. Shared hubs MUST use named discovery packs as the managed default discovery contract. `HUB_DISCOVERY_SHARED_PACK` or an equivalent applied pack selection is the standard baseline for shared lanes and hosted hubs.
29. Manual `activeServers`, `mode`, or `maxProxyTools` overrides MAY exist for diagnostics or reviewed exceptions, but they MUST be treated as temporary overlays on a named discovery pack rather than the primary managed configuration model.

## Required User Surfaces

### 1. Access overview

Must show:

- current allow or deny decision
- reason
- linked account and tenant context
- last update timestamp

### 2. MCP access

Must show:

- bearer-token status
- host configuration snippets
- MCP OAuth password status
- linked hub URL or assigned access lane
- transparent named-lane display name and URL when a named lane is assigned
- host-bound credential status for the active named lane
- infrastructure-ready but credential-pending state when lane deployment is complete before identity or consent onboarding

### 3. Connections

Must show:

- toolkit connection status
- connect or reconnect action
- pinned or active account selection when applicable
- what happens after auth completes

### 4. Security model

Must show:

- identity boundary
- authorization model
- credential separation
- revoke and regenerate behavior
- commercial and legal gating

### 5. Hosted concierge chat product

When the product includes a hosted chat experience, it must show:

- active thread or conversation context
- inferred versus confirmed profile state
- structured widgets for missing critical information
- clear handoff or escalation path

## Enforcement Surfaces

- `.agency`
  - `packages/agency/src/routes/dashboard/+page.svelte`
  - `packages/agency/src/routes/mcp-access/+page.svelte`
  - `packages/agency/src/routes/security/+page.svelte`
  - `packages/agency/src/routes/api/me/mcp-token/+server.ts`
  - `packages/agency/src/routes/api/me/mcp-oauth-password/+server.ts`
  - partner toolkit/account routes under `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/toolkits/*`
  - named-lane routes under `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/*`
- shared server composition
  - `packages/agency/src/lib/server/mcp-entitlements.ts`
  - `packages/agency/src/lib/server/access-state.ts`
  - `packages/agency/src/lib/server/mcp-access-assignments.ts`
- hub and MCP App surfaces
  - `packages/cs-mcp-hub-remote/index.ts`
  - `ui://hub/overview`
  - `ui://hub/auth-workflow`
  - `hub_list_services`
  - `hub_list_discovery_packs`
  - `hub_search_proxy_tools`
  - `hub_describe_proxy_tool`
  - `hub_execute_proxy_tool`
  - `hub_set_discovery`
- hosted product packages
  - `packages/concierge-chat/*`

## Evidence

- customer-visible deny reasons mapped from canonical reason codes
- audit events for token reveal, revoke, regenerate, password set, and password rotate
- connection-status and connect-link traces for auth-required flows
- UI metadata tests confirming tool-to-`ui://` resource mapping
- screenshots or previews of required user surfaces
- customer-visible named lane, URL, and host binding aligned across `.agency`, delivery records, and runbooks
- screenshots or logs showing the explicit pending state when lane infrastructure exists but customer credential delivery is not yet available
- host mismatch rejects the wrong named-lane credential with an explicit reason
- onboarding evidence showing operator-delivered initial bearer handoff resolves to `.agency` for ongoing management

## Source Anchors

- `packages/agency/src/routes/dashboard/+page.svelte`
- `packages/agency/src/routes/mcp-access/+page.svelte`
- `packages/agency/src/routes/security/+page.svelte`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/lib/server/access-state.ts`
- `packages/agency/src/lib/server/mcp-access-assignments.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/init/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/bearer-token/issue/+server.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
- `docs/policies/v1/policy.progressive-profile-governance.v1.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`
