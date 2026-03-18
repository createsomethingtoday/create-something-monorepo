# MCP Catalog Exposure Policy

This policy defines how CREATE SOMETHING exposes MCP tool catalogs to clients and agents.

## Decision

CREATE SOMETHING does **not** treat all MCP tool catalogs as equally exposable.

Default rule:

- small bounded surfaces may be registered directly
- broad connector surfaces must use brokered discovery
- commodity integrations should remain behind house MCP surfaces

The goal is to reduce tool sprawl, improve routing quality, and keep governance centralized.

## Why

Large raw tool catalogs create predictable problems:

- worse tool selection by models
- weaker permission boundaries
- harder quota and rate-limit enforcement
- more brittle client compatibility
- loss of house ownership over the MCP surface

Current market direction also favors constrained exposure:

- GitHub uses configurable `toolsets`
- Docker positions the gateway as a central exposure and governance layer

## Exposure Modes

### 1. Direct registration

Expose tools directly as normal MCP tools on the server.

Use only when:

- the surface is narrow
- the toolset is stable
- the audience is clear
- direct invocation is operationally acceptable

### 2. Brokered discovery

Expose management and broker tools, then resolve downstream tools through:

1. `list_services`
2. `search`
3. `describe`
4. `execute`

This is the default for large or variable catalogs.

Shared hubs should also treat named discovery packs as the default managed baseline for brokered discovery. Ad hoc server lists are an exception path, not the primary packaging contract.

### 3. Exception direct exposure

Direct exposure of large or provider-branded surfaces requires explicit documented approval.

Use only when:

- a partner or host requires it
- GTM speed matters more than surface control
- the exception is documented with owner and sunset criteria

## Required Threshold Rule

Use the following default thresholds:

| Tool Count | Policy |
|-----------|--------|
| `0-25` | Direct registration acceptable |
| `26-75` | Direct registration allowed only with documented justification |
| `75+` | Brokered discovery required |

If a surface is highly destructive, tenant-sensitive, or provider-variable, require brokered discovery even below the threshold.

## Packaging Rule

Use this decision rule for new MCP surfaces:

| Surface type | Default packaging |
|-------------|-------------------|
| Narrow domain MCP with bounded capabilities | Direct MCP acceptable |
| Commodity SaaS connectivity | Wrap behind house MCP |
| Broad multi-provider or large catalog surface | Hub broker required |
| Client-specific workflow or domain model | Custom MCP |

## House MCP Rule

For commodity app connectivity:

- prefer Composio as internal plumbing when appropriate
- do not expose Composio as the product surface
- preserve CREATE SOMETHING ownership of naming, policy, and routing

Direct provider-branded commodity MCP exposure is an exception path, not a default.

## Required Controls For Direct Registration

If a package uses direct registration, it must document:

1. tool count
2. why brokered discovery is not needed
3. expected audience
4. write/destructive tools present
5. auth and tenant-scoping model
6. owner for future broker migration if the surface grows

## Required Controls For Brokered Surfaces

Brokered surfaces must provide:

1. searchable registry metadata
2. service-summary discovery before proxy-tool search
3. named discovery packs or equivalent managed discovery presets for shared hubs
4. schema inspection before execution
5. centralized authz before invocation
6. quota and rate-limit enforcement at the gateway
7. tracing and correlation on downstream execution

## Enforcement Guidance

### Required for:

- large Composio-backed surfaces
- multi-provider catalogs
- shared remote hub deployments
- tenant-variable capability exposure

### Usually acceptable direct:

- focused client MCPs
- narrow internal operator MCPs
- product-specific surfaces with stable bounded tools

## What Not To Do

- Do not eagerly expose broad connector catalogs to public clients by default.
- Do not expose provider-branded commodity MCPs directly just because the upstream provider offers a ready-made distribution path.
- Do not let tool count grow indefinitely on a direct surface without reclassification.
- Do not treat gateway governance as optional for shared connector surfaces.

## Implementation Targets

This policy should be enforced primarily in:

- [packages/cs-mcp-hub/README.md](../packages/cs-mcp-hub/README.md)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [config/mcp-hub/discovery-packs.json](../config/mcp-hub/discovery-packs.json)
- [packages/composio-bridge/src/tool-factory.ts](../packages/composio-bridge/src/tool-factory.ts)

## Recommended Next Work

1. Add a broker-required flag or equivalent registry metadata for large surfaces.
2. Add a discovery-pack validation check in CI or fleet verification for shared hubs.
3. Add a tool-count check in CI or registry validation for packages above threshold.
4. Mark existing direct large-catalog packages for broker migration.
