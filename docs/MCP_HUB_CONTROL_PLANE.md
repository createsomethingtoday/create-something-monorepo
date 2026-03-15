# MCP Hub Control Plane

Thin control plane for managing many MCP servers behind one gateway in Codex.

## Why

Codex MCP settings are a flat list. This control plane keeps local/workspace MCP operations manageable by:

- Maintaining a small registry of known MCP servers
- Grouping servers into bundles
- Tracking enabled/disabled state in a separate state file
- Exposing one gateway MCP (`create-something-hub`) that proxies downstream tools

## Files

- Registry: `config/mcp-hub/registry.json`
- Registry schema: `config/mcp-hub/registry.schema.json`
- State: `config/mcp-hub/state.json`
- Routing: `config/mcp-hub/routing.json`
- Gateway package: `packages/cs-mcp-hub`
- Generated artifacts:
  - `packages/playbook-mcp/src/catalog.registry.generated.ts`
  - `docs/MCP_FLEET_REGISTRY.generated.md`

## Run

```bash
pnpm mcp:hub:build
pnpm mcp:hub:start
```

## Admin Commands

```bash
pnpm mcp:hub:status
node packages/cs-mcp-hub/dist/index.js --enable-bundle ops
node packages/cs-mcp-hub/dist/index.js --disable-server cs-telemetry
pnpm mcp:hub:write-config
pnpm mcp:registry:validate
pnpm mcp:registry:check
pnpm mcp:registry:generate
```

## Codex Configuration

Recommended: keep only the hub enabled in project config.

```toml
[mcp_servers."create-something-hub"]
command = "node"
args = ["./packages/cs-mcp-hub/dist/index.js"]
enabled = true
```

`hub_write_codex_config` (or `--write-codex`) updates `.codex/config.toml` in single-hub mode:

- `create-something-hub` stays enabled
- downstream registry servers are kept disabled (the hub connects to them directly)

## Proxy Tool Names

Downstream tools are namespaced as:

`<server>__<tool>`

Example:

- `create-something__search`
- `playbook__workflow_setup`

Routing aliases can also be defined in `routing.json` to map one logical tool
to multiple provider candidates (ordered failover).

## Tenant + Provider Routing

The hub currently supports tenant-scoped visible-route exposure without
splitting into separate MCP gateways:

- Tenant policy gates visible tools by server, tag, access type, and tool prefix from the
  generated artifact `docs/policies/generated/tenant-tool-exposure-routing.v1.json`,
  compiled from `config/mcp-hub/routing.json`.
- `HUB_TENANT_ID` can override the resolved tenant policy key at runtime.
- Routed alias plans are now exposed as recommender and inspection metadata in
  `cs-mcp-hub-remote`, including skipped candidate reasons such as pending or
  blocked OAuth approval.
- Alias failover execution is still not enforced in `cs-mcp-hub-remote`; the
  broker still executes the selected direct provider proxy tool underneath.

Runtime env:

- `HUB_TENANT_ID` (tenant policy key override for visible-route filtering)
- `HUB_ALLOW_PENDING_OAUTH_APPROVALS` (allow routed alias plans to surface
  pending OAuth candidates)
- `CS_MCP_HUB_ROUTING` remains reserved in docs and is not part of the active
  remote-worker routing implementation.

Operator inspection surface:

- `hub://tenant-routing` exposes the effective tenant key, visible alias plans,
  and skipped candidate reasons for the current account/session.

## Judgment Routing Utility

The hub also exposes `hub_route_problem` to classify a task by bottleneck axis
(reasoning, effort, coordination, ambiguity, etc.) and return a routing plan.

This operationalizes the "which AI for which problem" discipline directly in the MCP layer.

## Operational Note

State changes update files immediately, but proxied tool inventory is built at startup. Restart the hub after changing enabled bundles/servers.
