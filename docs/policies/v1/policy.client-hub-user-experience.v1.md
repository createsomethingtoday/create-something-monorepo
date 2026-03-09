# policy.client-hub-user-experience.v1

- Status: `draft`
- Owner: `CREATE SOMETHING product + identity + hub operations`
- Effective date: `TBD`

## Purpose

Define the canonical user-experience contract for client-facing MCP access, connection management, and governed in-conversation UI across `.agency`, dedicated client shells, and MCP App surfaces.

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
5. Shared-hub customer-facing UX MUST be workspace- and tenant-centric; operator-lane or staff-specific routing labels MUST NOT be the long-term customer-facing abstraction.
6. Self-service customer actions MAY include:
   - policy acceptance
   - managed bearer token issue, revoke, and regenerate
   - MCP OAuth password set or rotate
   - viewing connection status
   - launching connect or reconnect links
   - copying approved host configuration snippets
7. Operator-only actions MUST include:
   - entitlement overrides
   - tenant routing mutation
   - toolkit account pinning or disabling
   - partner admin mint
   - legacy credential issuance
   - direct control-plane mutation
8. Every blocked state shown to a customer MUST map to an explicit reason code and human-readable explanation. Generic "access denied" messaging without reason classification is prohibited.
9. Auth-required or reconnect-required toolkit flows MUST resolve through one standard recovery contract that identifies the toolkit, the required action, the reconnect path, and the retry expectation.
10. Customer-facing surfaces MUST clearly distinguish:
    - portal login
    - managed bearer token
    - MCP OAuth password
    - third-party toolkit connection state
11. Conversational DUI or MCP App UIs that can mutate state MUST route mutations through server tools and MUST honor the same policy, authorization, and audit requirements as non-UI execution paths.
12. CREATE SOMETHING MCP App UI resources MUST use curated, code-reviewed `ui://` resources. Raw model-generated executable UI delivered directly to end users without code review is prohibited.
13. If schema-driven or generative UI is used, the generated artifact MUST be a bounded data or layout spec rendered by approved UI components, not arbitrary executable code.
14. Dedicated client UX MUST disclose when access is blocked by legal, billing, contract, consent, or policy state, even if the credential itself still exists.
15. Any client-facing DUI that supports write or destructive actions MUST include an explicit review or confirmation step when required by route classification or policy.
16. When a hosted chat or concierge product is part of delivery, it MUST be implemented as a product surface separate from `.agency` control-plane routes and separate from MCP App DUI resources.
17. Hosted chat or concierge products MUST follow [`policy.progressive-profile-governance.v1`](./policy.progressive-profile-governance.v1.md) for inferred-versus-confirmed field handling and dynamic widget selection.

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
- shared server composition
  - `packages/agency/src/lib/server/mcp-entitlements.ts`
  - `packages/agency/src/lib/server/access-state.ts`
  - `packages/agency/src/lib/server/mcp-access-assignments.ts`
- hub and MCP App surfaces
  - `packages/cs-mcp-hub-remote/index.ts`
  - `ui://hub/overview`
  - `ui://hub/auth-workflow`
- hosted product packages
  - `packages/concierge-chat/*`

## Evidence

- customer-visible deny reasons mapped from canonical reason codes
- audit events for token reveal, revoke, regenerate, password set, and password rotate
- connection-status and connect-link traces for auth-required flows
- UI metadata tests confirming tool-to-`ui://` resource mapping
- screenshots or previews of required user surfaces
- no customer-facing dependency on operator-lane naming once tenant-facing UX is productionized

## Source Anchors

- `packages/agency/src/routes/dashboard/+page.svelte`
- `packages/agency/src/routes/mcp-access/+page.svelte`
- `packages/agency/src/routes/security/+page.svelte`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/lib/server/access-state.ts`
- `packages/agency/src/lib/server/mcp-access-assignments.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
- `docs/policies/v1/policy.progressive-profile-governance.v1.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`
