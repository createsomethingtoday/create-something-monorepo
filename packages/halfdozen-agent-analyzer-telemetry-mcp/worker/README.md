# Half Dozen Agent Analyzer Telemetry MCP

Hosted MCP for native Notion `AGENT ANALYZER` eval telemetry.

The server is intentionally append-only. Agents can record structured evidence about an evaluation run, but they cannot update or delete prior events. Notion remains the outcome record through `Test Reports [OS]` and `Tasks [HD]`; this MCP records the runtime trail that can be cross-checked later.

## Endpoints

- `GET /health`: public configuration and schema health.
- `POST /mcp`: streamable HTTP MCP endpoint, bearer protected.
- `/sse`: SSE fallback endpoint, bearer protected.

## Auth

Configure the Notion Custom Agent MCP connection with:

```text
Authorization: Bearer <MCP_API_KEY>
```

The Worker accepts `MCP_API_KEY`, with `OPERATOR_API_TOKEN` as an optional fallback for operator clients. The deployed bearer value is stored in Infisical as `HALFDOZEN_AGENT_ANALYZER_TELEMETRY_MCP_API_KEY` in `prod:/`.

## Tools

- `start_eval_run`
- `record_schema_check`
- `record_permission_check`
- `record_write_test`
- `record_cleanup_result`
- `record_langfuse_evidence`
- `record_score`
- `finish_eval_run`
- `get_eval_run`
- `list_recent_eval_runs`

## Deployment

```bash
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker db:migrations:apply
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker check
pnpm --dir packages/halfdozen-agent-analyzer-telemetry-mcp/worker deploy
```

Rollback: redeploy the previous Worker version from Cloudflare Workers deploy history. The D1 migration is additive and append-only.
