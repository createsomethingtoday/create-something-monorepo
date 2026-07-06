# Hydra DB Governed Recall

CRE-359 enables an internal operator recall lane for HydraDB while keeping upstream write tools operator-only.

## Tier Mapping

| Tier | Artifact | Rule |
|------|----------|------|
| Database | HydraDB tenant, sub-tenant, metadata filters, D1 telemetry | Use `tenant_id`, `sub_tenant_id`, and match-enabled `metadata_filters` as the recall boundary. |
| Automation | `hydra-db-recall-mcp` Worker | Expose only recall/list/fetch/policy tools through `/mcp` and `/sse`. |
| Judgment | Registry catalog metadata, Linear evidence, retention policy | Writes, ingestion, and deletes require operator evidence outside the recall wrapper. |

## Exposed Tools

- `hydra_db_recall_search` calls HydraDB recall endpoints only.
- `hydra_db_list_sources` calls HydraDB list only.
- `hydra_db_fetch_content` calls HydraDB fetch only.
- `hydra_db_recall_policy` returns the active policy and blocked upstream tool list.

The wrapper does not expose upstream store, ingest, memory delete, knowledge delete, or upload endpoints.

## Sync Rules

1. Perform source syncs through an operator-only HydraDB write path, not through `hydra-db-recall-mcp`.
2. Every sync records source, target `tenant_id`, target `sub_tenant_id`, item count, run ID, and validation evidence in Linear.
3. Use metadata for deterministic filtering inside a sub-tenant; do not use metadata as a tenant or customer boundary.
4. Run a recall smoke after sync with the same sub-tenant and metadata filters expected by the operator lane.

## Production Monitoring

- `/health` reports auth, provider, telemetry, policy, and exposed tool status without secrets.
- D1 telemetry records MCP invocations when `TELEMETRY_DB` is bound.
- Langfuse telemetry is enabled when `LANGFUSE_SECRET_KEY` is present.
- Treat upstream `401`, `403`, `429`, and `5xx` responses as production guardrail events before widening exposure.

## Retention And Delete

- Default retention window: 180 days, configurable with `HYDRA_DB_RETENTION_DAYS`.
- Deletes require operator review and Linear evidence.
- Delete requests use an operator-only upstream HydraDB path; this MCP wrapper never deletes.
- Linear evidence should include deleted source IDs, requester, approval, command or run ID, and verification that recall no longer returns deleted content.

## Deployment

```bash
pnpm deploy:hydra-db-recall-mcp
```

Secrets required in the target environment:

- `HYDRA_DB_RECALL_MCP_API_KEY`
- `HYDRA_DB_API_KEY`
- `HYDRA_DB_TENANT_ID`

Optional lane controls:

- `HYDRA_DB_SUB_TENANT_ID`
- `HYDRA_DB_RETENTION_DAYS`
- `HYDRA_DB_DEFAULT_RECALL_SCOPE`
