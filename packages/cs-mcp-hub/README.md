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

Registry defines all known MCP servers + bundles.
State defines what is currently enabled.

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

Proxied tool names are namespaced:

`<server>__<tool>`

Example: `create-something__search`

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
  - downstream registry servers are written as `enabled = false`
- State/config updates apply immediately to file output.
- Proxy tool availability is computed at startup; restart the hub after state changes to refresh proxied tools.
