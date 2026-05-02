# Active Jobs MCP

Governed Active Jobs DB MCP wrapper over RapidAPI for Dify agents and other MCP clients.

## Runtime

- Worker name: `active-jobs-mcp`
- Public MCP URL: `https://active-jobs-mcp.createsomething.workers.dev/mcp`
- Public SSE URL: `https://active-jobs-mcp.createsomething.workers.dev/sse`
- Health URL: `https://active-jobs-mcp.createsomething.workers.dev/health`
- The MCP client authenticates with `ACTIVE_JOBS_MCP_API_KEY` or `MCP_API_KEY`.
- The MCP tool calls RapidAPI with `ACTIVE_JOBS_RAPIDAPI_KEY` or `RAPIDAPI_KEY`.
- Provider host defaults to `active-jobs-db.p.rapidapi.com`.
- Telemetry is written through `@create-something/mcp-core` into D1 and Braintrust when bindings are configured.

Worker package: `packages/active-jobs-mcp/worker`

## Infisical

Production secrets live at `prod:/active-jobs-mcp`:

- `ACTIVE_JOBS_MCP_API_KEY`
- `ACTIVE_JOBS_RAPIDAPI_KEY`
- `BRAINTRUST_API_KEY`
- `BRAINTRUST_PROJECT_ID`

Do not store secret values in repo files.

## Validation

```bash
pnpm --filter @create-something/active-jobs-mcp typecheck
pnpm --filter active-jobs-mcp-worker typecheck
pnpm --dir packages/active-jobs-mcp/worker exec wrangler deploy --dry-run
pnpm mcp:registry:check
```

## Tool Surface

The tool names intentionally match the imported RapidAPI-backed provider:

- `Get_Jobs_Backfill_-_6M`
- `Get_Jobs_24h_indexed`
- `Get_Jobs_Hourly`
- `Ultra_-_Get_Expired_Jobs`
- `Ultra_-_Get_Modified_Jobs_24h`
- `Get_Jobs_7_days_posted`

Each tool returns a JSON object with:

- `ok`
- `provider`
- `provider_host`
- `tool`
- `endpoint`
- `method`
- `status`
- `correlation_id`
- `response_truncated`
- `data`

## Dify Cutover

Once deployed, add a Dify MCP card pointing at `/mcp`, then republish the Active Jobs Dify agent with this server enabled instead of the Dify marketplace RapidAPI server.
