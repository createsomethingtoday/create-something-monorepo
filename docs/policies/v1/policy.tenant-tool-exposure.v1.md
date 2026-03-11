# policy.tenant-tool-exposure.v1

- Status: `draft`
- Owner: `CREATE SOMETHING MCP hub operations`
- Effective date: `TBD`

## Purpose

Define tenant-scoped tool exposure and provider routing controls in the MCP hub.

## Scope

- Tenant policy gates by server, tags, and tool prefix
- Alias routing with provider failover order
- OAuth approval state handling
- Dedicated workflow-route exposure for tenant-specific background syncs

## Policy Statements

1. Tenant exposure policy MUST default-deny any server/tool not explicitly allowed for tenant.
2. Provider aliases MUST define ordered candidates and deterministic fallback.
3. Pending OAuth candidates MUST remain disabled unless explicitly enabled by policy.
4. Tenant policy changes MUST trigger hub restart when inventory rebuild is required.
5. Tenant-specific background syncs SHOULD expose dedicated trigger, status, and replay surfaces instead of broad raw provider write catalogs.
6. If generic provider write tools remain exposed for a tenant-specific sync, the exposure policy MUST also constrain the approved workflow or target scope.

## Enforcement Surfaces

- `config/mcp-hub/routing.json`
- Runtime env:
  - `HUB_TENANT_ID`
  - `HUB_ALLOW_PENDING_OAUTH_APPROVALS`
  - `CS_MCP_HUB_ROUTING`

## Evidence

- Effective candidate set per tenant
- Rejected candidate reasons (blocked, pending, out-of-scope)
- visible workflow-control routes versus hidden raw provider routes for governed syncs

## Source Anchors

- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `config/mcp-hub/routing.json`
