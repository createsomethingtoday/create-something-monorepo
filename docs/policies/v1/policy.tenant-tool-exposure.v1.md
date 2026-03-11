# policy.tenant-tool-exposure.v1

- Status: `draft`
- Owner: `CREATE SOMETHING MCP hub operations`
- Effective date: `TBD`

## Purpose

Define tenant-scoped tool exposure, transparent named-lane allowlists, and provider routing controls in the MCP hub.

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
7. Named lanes MUST be first-class policy subjects. For named-lane pilots, the allowed runtime surface MUST be explicitly limited to the client-specific custom Notion server plus the approved commodity toolkits.
8. BLOND:ISH and C3 Management named-lane pilots MUST default-deny all other servers and tool prefixes except:
   - `notion-halfdozen-blondish` or `notion-halfdozen-c3-management`
   - `composio-toolkit-gmail`
   - `composio-toolkit-exa`
9. Tenant exposure policy MUST block the other client’s Notion server, Composio Notion, Slack, Dropbox, and any other unapproved bundle or server for these named-lane pilots.
10. Telemetry and Braintrust tracing are mandatory baseline observability controls for named lanes, but they remain operator-facing controls and MUST NOT appear in the client-visible tenant allowlist.

## Enforcement Surfaces

- `config/mcp-hub/routing.json`
- `config/mcp-hub/registry.json`
- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- Runtime env:
  - `HUB_TENANT_ID`
  - `HUB_ALLOW_PENDING_OAUTH_APPROVALS`
  - `CS_MCP_HUB_ROUTING`

## Evidence

- Effective candidate set per tenant
- Rejected candidate reasons (blocked, pending, out-of-scope)
- visible workflow-control routes versus hidden raw provider routes for governed syncs
- named-lane allowlists showing only custom Notion + Gmail + Exa for BLOND:ISH and C3 Management
- trace evidence showing lane host key or bound host on routed calls

## Source Anchors

- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `config/mcp-hub/routing.json`
- `config/mcp-hub/registry.json`
