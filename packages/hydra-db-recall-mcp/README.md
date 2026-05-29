# Hydra DB Recall MCP

Governed read-only MCP wrapper for HydraDB recall. This package is for the internal operator lane in CRE-359.

It intentionally exposes only recall, list, fetch, and policy tools:

- `hydra_db_recall_search`
- `hydra_db_list_sources`
- `hydra_db_fetch_content`
- `hydra_db_recall_policy`

The upstream HydraDB write and delete tools are not registered here:

- `hydra_db_store`
- `hydra_db_ingest_conversation`
- `hydra_db_delete_memory`

Use an operator-only upstream path for writes, ingestion, retention actions, and deletes. Record every sync or delete operation in Linear with source, sub-tenant, item count, run ID, validation command, and rollback or delete note.

## Worker

The Worker exposes:

- `/mcp` for Streamable HTTP MCP
- `/sse` for legacy SSE MCP
- `/health` for non-secret configuration, telemetry, policy, and tool status

Required secrets:

- `HYDRA_DB_RECALL_MCP_API_KEY` or `MCP_API_KEY`
- `HYDRA_DB_API_KEY`
- `HYDRA_DB_TENANT_ID`

Optional configuration:

- `HYDRA_DB_BASE_URL`, default `https://api.hydradb.com`
- `HYDRA_DB_SUB_TENANT_ID`, default set in `wrangler.toml`
- `HYDRA_DB_TIMEOUT_MS`, default `30000`
- `HYDRA_DB_MAX_RESPONSE_BYTES`, default `524288`
- `HYDRA_DB_RETENTION_DAYS`, default `180`
- `HYDRA_DB_DEFAULT_RECALL_SCOPE`, one of `knowledge`, `memory`, or `boolean`
- `BRAINTRUST_API_KEY`
- `BRAINTRUST_PROJECT_NAME`
- `BRAINTRUST_PROJECT_ID`

## Validation

```bash
pnpm --filter @create-something/hydra-db-recall-mcp typecheck
pnpm --filter hydra-db-recall-mcp-worker typecheck
pnpm --filter @create-something/hydra-db-recall-mcp build
pnpm --dir packages/hydra-db-recall-mcp/worker exec wrangler deploy --dry-run
```
