# @create-something/cs-mcp-hub

Single MCP gateway and control plane for CREATE SOMETHING.

This package gives you:

- One MCP entry in Codex (`create-something-hub`)
- A thin local registry/state database for bundles and server toggles
- Proxied downstream tools from enabled MCP servers
- Commands/tools to write `.codex/config.toml` with enable/disable state

## Registry + State

- Registry: `config/mcp-hub/registry.json`
- State: `config/mcp-hub/state.json`
- Routing: `config/mcp-hub/routing.json`

Registry defines all known MCP servers + bundles.
State defines what is currently enabled.
Routing defines tenant-specific tool exposure and multi-provider alias failover.

## Build

```bash
pnpm --filter @create-something/cs-mcp-hub build
```

## Run As MCP Server

```bash
pnpm --filter @create-something/cs-mcp-hub start
```

or directly:

```bash
node packages/cs-mcp-hub/dist/index.js
```

## Add To Codex

Use one project-level server entry:

```toml
[mcp_servers."create-something-hub"]
command = "node"
args = ["./packages/cs-mcp-hub/dist/index.js"]
enabled = true
```

Then disable direct downstream entries in `.codex/config.toml` (or let the hub write this for you).

## Hub Tools

- `hub_status`
- `hub_list_registry`
- `hub_update_state`
- `hub_write_codex_config`
- `hub_list_proxy_tools`
- `hub_search_proxy_tools` (query/server filter + cursor pagination)
- `hub_list_routing` (tenant policy + alias failover plans)
- `hub_policy_status` (active policy/runtime limit settings)
- `hub_route_problem` (problem-axis classification + model/workflow routing recommendation)

Proxied tool names are namespaced:

`<server>__<tool>`

Example: `create-something__search`

Routed aliases are configured in `config/mcp-hub/routing.json` and can fail over
across multiple provider candidates (for example: Arcade -> Composio).

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `packages/cs-mcp-hub/src/index.ts`, `packages/cs-mcp-hub/src/config.ts`, `packages/cs-mcp-hub/src/routing.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm test` |
| Validation surfaces | TypeScript build output, node test output, hub status output, registry/state/routing file diffs |
| UI validation path | none |
| Escalation rule | stop if hub routing, Codex config output, or downstream tool exposure differs from registry/state/routing artifacts and the correct source of truth is unclear |

## Problem Routing Tool

`hub_route_problem` resolves the "which model for which problem" question by classifying a task across bottleneck axes:

- reasoning
- effort
- coordination
- domain expertise
- ambiguity
- judgment/willpower
- emotional intelligence

It returns:

- primary and secondary bottleneck axes with confidence
- recommended routing profile (`pure_reasoner`, `equipped_reasoner`, `specialist_coder`, etc.)
- staged execution plan
- guardrails for human checkpoints

Example tool call payload:

```json
{
  "task": "Coordinate 6 teams to migrate 3000 contracts with API tooling",
  "requiresToolOrchestration": true,
  "stakeholderCount": 8,
  "expectedDurationMinutes": 720,
  "riskLevel": "high",
  "domainCriticality": "medium",
  "isCodeTask": true
}
```

## Admin CLI

You can manage enable/disable state without launching the MCP loop:

```bash
node packages/cs-mcp-hub/dist/index.js --status
node packages/cs-mcp-hub/dist/index.js --enable-bundle core
node packages/cs-mcp-hub/dist/index.js --disable-server cs-telemetry
node packages/cs-mcp-hub/dist/index.js --write-codex
```

By default, state changes auto-write `.codex/config.toml`. Add `--no-write-codex` to skip.

## Notes

- `hub_write_codex_config` enforces a single-hub Codex setup:
  - `create-something-hub` is `enabled = true`
  - downstream registry servers are pruned from `.codex/config.toml`
  - non-registry custom servers in `.codex/config.toml` are preserved
- State/config updates apply immediately to file output.
- Proxy tool availability is computed at startup; restart the hub after state changes to refresh proxied tools.
