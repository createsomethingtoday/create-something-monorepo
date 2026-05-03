# LinkedIn MCP

Governed LinkedIn Data API MCP wrapper over RapidAPI for Dify agents and other MCP clients.

## Production

- Worker name: `linkedin-mcp`
- Public MCP URL: `https://linkedin-mcp.createsomething.workers.dev/mcp`
- Public SSE URL: `https://linkedin-mcp.createsomething.workers.dev/sse`
- Health URL: `https://linkedin-mcp.createsomething.workers.dev/health`
- Provider host defaults to `linkedin-data-api.p.rapidapi.com`.

Worker package: `packages/linkedin-mcp/worker`

## Secrets

Production secrets live at `prod:/linkedin-mcp`:

- `LINKEDIN_MCP_API_KEY`
- `LINKEDIN_RAPIDAPI_KEY`
- `BRAINTRUST_API_KEY`
- `BRAINTRUST_PROJECT_ID`

Keep values in Infisical and Cloudflare Worker secrets only.

## Validation

```bash
pnpm --filter @create-something/linkedin-mcp typecheck
pnpm --filter linkedin-mcp-worker typecheck
pnpm --dir packages/linkedin-mcp/worker exec wrangler deploy --dry-run
```

The 52 tool names intentionally match the imported RapidAPI-backed provider so Dify can migrate without renaming tools.
