# Hydra DB Context MCP

Governed read-only wrapper around Hydra DB recall for CREATE SOMETHING context memory.

This package intentionally exposes one tool, `context_recall`. It does not expose Hydra DB store, delete, list, or fetch-content operations. Ingestion remains an explicit operator action through the pilot harness.

## Environment

Run through Infisical:

```bash
infisical run --env=prod --path=/mcp-hub/hydradb --include-imports=true -- pnpm --dir packages/hydradb-context-mcp start
```

Required:

- `HYDRA_DB_API_KEY`
- `HYDRA_DB_TENANT_ID`
- `HYDRA_DB_SUB_TENANT_ID`

Optional:

- `HYDRA_DB_ALLOWED_SUB_TENANT_IDS`, comma-separated allowlist; defaults to the default sub-tenant
- `HYDRA_DB_API_BASE`, defaults to `https://api.hydradb.com`

## Tool

`context_recall` is the only exposed tool.

Useful arguments:

- `query`: policy, architecture, or decision context query
- `output_format`: `json` for structured chunks, `compiled` for agent-ready markdown
- `sub_tenant_id`: optional, must be in `HYDRA_DB_ALLOWED_SUB_TENANT_IDS`
- `max_results`: capped at 20
- `min_score`: optional threshold for compiled output

The compiled output is designed for policy preflight use: it includes a concise advisory context block plus `[S#]` source IDs. Repo files, Linear, Infisical, and current policy artifacts remain the source of truth.

## Policy

- Read-only recall first.
- Explicit sub-tenant mapping before a query leaves the process.
- Output is redacted for common secret patterns.
- Compiled output is source-backed and advisory, not authoritative.
- Keep this package dormant until Hub telemetry/authz promotion gates are satisfied.
