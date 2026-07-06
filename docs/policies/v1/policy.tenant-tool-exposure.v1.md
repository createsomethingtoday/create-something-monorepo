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
   - approved search providers:
     - `composio-toolkit-exa`
     - `composio-toolkit-perplexityai`
     - `composio-toolkit-composio_search`
9. `composio-toolkit-composio_search` is a governed `NO_AUTH` search surface and MAY be exposed without a per-user auth-config prerequisite, but it must still remain explicitly allowlisted per tenant.
10. Tenant exposure policy MUST block the other client’s Notion server, Composio Notion, Slack, Dropbox, and any other unapproved bundle or server for these named-lane pilots.
11. Telemetry and Langfuse tracing are mandatory baseline observability controls for named lanes, but they remain operator-facing controls and MUST NOT appear in the client-visible tenant allowlist.
12. Named-lane routed-call traces MUST include explicit account attribution, at minimum `account_id`, `tenant_id`, and lane slug or bound host, so operator observability can attribute downstream access to the correct client lane.
13. Langfuse auto-instrumentation MAY amplify operator visibility for LLM or tool spans, but it MUST NOT be treated as sufficient policy evidence unless the trace also includes house governance metadata for the routed call.
14. For named-lane governed execution, the required governance trace fields SHOULD include `correlation_id`, route classification, and policy or review outcome in addition to `account_id`, `tenant_id`, and lane slug or bound host.
15. Trace tags and summary fields SHOULD remain DRY and business-legible. Low-signal transport details SHOULD remain in metadata or raw logs instead of high-cardinality tags.
16. Shared hubs and named lanes SHOULD express the default visible service set as a named discovery pack in addition to registry/routing policy. Ad hoc `activeServers` lists are an exception or debugging overlay, not the primary tenant-governance artifact.
17. Discovery reset for a tenant or named lane SHOULD return to its assigned managed discovery pack unless an explicitly reviewed operator override is active.
18. Skills, runbooks, and verification scripts that manipulate tenant discovery SHOULD prefer `hub_list_discovery_packs`, `hub_set_discovery(pack=...)`, and service-scoped search over raw full-catalog proxy search.

## Enforcement Surfaces

- `config/mcp-hub/routing.json`
- `config/mcp-hub/registry.json`
- `config/mcp-hub/discovery-packs.json`
- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/cs-mcp-hub-remote/index.ts`
- Runtime env:
  - `HUB_TENANT_ID`
  - `HUB_ALLOW_PENDING_OAUTH_APPROVALS`
  - `CS_MCP_HUB_ROUTING`
  - `HUB_DISCOVERY_SHARED_PACK`

## Evidence

- Effective candidate set per tenant
- Rejected candidate reasons (blocked, pending, out-of-scope)
- visible workflow-control routes versus hidden raw provider routes for governed syncs
- named-lane allowlists showing only custom Notion + Gmail + the approved search-provider set for BLOND:ISH and C3 Management
- trace evidence showing lane host key or bound host on routed calls
- trace evidence showing `account_id` and `tenant_id` aligned with the lane host key or bound host on routed calls

## Source Anchors

- `docs/MCP_HUB_CONTROL_PLANE.md`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `config/mcp-hub/routing.json`
- `config/mcp-hub/registry.json`
- `config/mcp-hub/discovery-packs.json`
