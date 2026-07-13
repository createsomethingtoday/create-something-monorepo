# Owned Agent Runtime

Provider-neutral Cloudflare Worker for CREATE SOMETHING agents. The first vertical slice migrates the public, read-only Guide Agent from Dify while keeping the Dify app as rollback.

## Contract

- `GET /health`
- `GET /v1/agents`
- `POST /v1/agents/:agentId/messages` with `{ "query": "...", "conversation_id": "optional" }`
- Message responses use server-sent events: `run.started`, `message.delta`, `message.completed`, or `run.failed`.

D1 owns conversation continuation and normalized run receipts. OpenAI Agents SDK owns the model/tool loop. Agent definitions own MCP allowlists and judgment policy.

Production uses Cloudflare service bindings for the three repo-owned MCP Workers. This avoids public custom-domain transport loops while preserving the same MCP protocol and URLs for local execution.

The deployed shadow Worker currently provisions `OPENAI_API_KEY` from the Infisical production root secret `WEBFLOW_OPENAI_API_KEY`. Infisical is a provisioning source, not a runtime dependency. Replace this shared funding source with a dedicated funded project key before broader agent migration.

Tool names must be unique across an agent's MCP servers. The owned Guide Agent keeps the Three-Tier Framework server's `classify_component`; the same-named content-server tool is omitted because the OpenAI Agents SDK rejects ambiguous duplicate tool names.

## Local validation

```bash
pnpm test
pnpm check
```

## Promotion and rollback

Create the D1 database, replace the placeholder database ID, apply migrations, and set `OPENAI_API_KEY` through Wrangler secret storage before deployment. Keep the Dify Guide Agent published until its three parity smokes pass against the deployed Worker. Rollback is a route switch to the still-published Dify app; no Dify credential or app deletion is part of this slice.
