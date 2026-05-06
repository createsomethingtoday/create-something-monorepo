# MCP Fleet Health Agent

`scripts/mcp-fleet-health-agent.mjs` reviews whether registered HTTP MCPs and deployed MCP fleet entries are reachable and whether their tool surfaces are still discoverable.

It performs read-only checks only:

1. `GET /health`
2. JSON-RPC `initialize`
3. JSON-RPC `tools/list`

It does not call arbitrary MCP tools.
By default, `/health` is advisory: an MCP is production-healthy when `initialize` and `tools/list` prove the tool surface is accessible. Use `--strict-health` when a deployment gate must also require `/health`.

## Quick Start

Dry-run target selection:

```bash
pnpm mcp:fleet:health --dry-run
```

Probe first-party MCPs:

```bash
pnpm mcp:fleet:health
```

Probe only customer/tenant fleet deployments:

```bash
pnpm mcp:fleet:health --source fleet
```

Probe with Infisical-backed credentials:

```bash
pnpm mcp:fleet:health --infisical --infisical-env prod --infisical-path /
```

Probe a single MCP:

```bash
pnpm mcp:fleet:health --server halfdozen-telemetry --infisical
```

Emit machine-readable output:

```bash
pnpm mcp:fleet:health --json
```

## Sources and Scopes

Sources decide which inventory files are read:

- `both` reads `config/mcp-hub/registry.json` and `config/mcp-hub/fleet.json`. This is the default.
- `registry` reads the MCP hub registry only.
- `fleet` reads the deployed customer/internal MCP fleet only.

Scopes filter the selected source set:

- `first-party` checks HTTP MCPs in `config/mcp-hub/registry.json`, excluding Composio toolkit entries. This is the default.
- `catalog` checks only registry entries included in the public catalog.
- `all` checks every HTTP MCP in the selected source set, including the large Composio toolkit gateway list when the registry source is enabled.

Dormant and local stdio servers are skipped by default. Use `--include-dormant` when a dormant/prototype endpoint should be checked explicitly.

## Credentials

The agent reads auth requirements from the registry:

- `bearer_token_env_var`
- `http_headers`
- `env_http_headers`
- legacy `headers`

When `--infisical` is present, it runs `infisical export --format=json` for the default path and any per-target `infisical_path` declared in `config/mcp-hub/fleet.json`. Secret values are held in memory, never printed, and existing process env vars win over Infisical values.

Useful Infisical flags:

```bash
pnpm mcp:fleet:health \
  --infisical \
  --infisical-env prod \
  --infisical-path / \
  --infisical-include-imports true
```

For fleet deployments, the agent automatically loads target-specific paths such as `/mcp-hub/hubs` or `/halfdozen-notion-mcp/blondish` when those paths are declared on the target.

If a registry entry names a token env var and the value is still missing, that MCP is reported as `unknown` with a `missing_auth_env:<NAME>` reason instead of being treated as a transport failure.

## Status Meaning

| Status | Meaning |
|---|---|
| `healthy` | MCP initialized successfully and `tools/list` returned one or more tools. `/health` may still be reported as unavailable unless `--strict-health` is used. |
| `degraded` | MCP was reachable but `tools/list` was empty, or `/health` was unavailable while `--strict-health` was enabled. |
| `unhealthy` | The endpoint failed initialize or `tools/list` for a non-auth reason. |
| `unknown` | The agent lacked credentials or received an auth gate, so tool accessibility could not be verified. |
| `skipped` | The target was intentionally not probed, usually during `--dry-run`. |

## Gate Usage

The command does not fail by default. Add `--fail-on` when using it as a gate:

```bash
pnpm mcp:fleet:health --infisical --fail-on unhealthy
```

Use a narrower gate when onboarding or rotating credentials:

```bash
pnpm mcp:fleet:health --server cs-telemetry --infisical --fail-on unhealthy,unknown
```

Require both MCP tool accessibility and `/health`:

```bash
pnpm mcp:fleet:health --infisical --strict-health --fail-on degraded,unhealthy,unknown
```
