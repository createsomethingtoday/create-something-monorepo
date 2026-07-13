# Owned Agent Runtime

Provider-neutral Cloudflare Worker for CREATE SOMETHING agents. The first vertical slice migrates the public, read-only Guide Agent from Dify while keeping the Dify app as rollback.

## Contract

- `GET /health`
- `GET /v1/agents`
- `POST /v1/agents/:agentId/messages` with `{ "query": "...", "conversation_id": "optional" }`
- Message responses use server-sent events: `run.started`, `message.delta`, `message.completed`, or `run.failed`.

D1 owns conversation continuation and normalized run receipts. OpenAI Agents SDK owns the model/tool loop. Agent definitions own MCP allowlists and judgment policy.

Each conversation is protected by a D1 run lease. Concurrent continuation returns `409 conversation_busy` before model execution. Completion and failure write the terminal receipt and release the lease in one D1 batch transaction; an abandoned lease can be reclaimed after ten minutes.

Cloudflare admission bindings protect the paid message route before conversation state or model execution: ten accepted attempts per client per minute and a 120-attempt per-agent budget per minute, both local to the serving Cloudflare location. A denied request returns `429` with `Retry-After: 60`; an unavailable admission check fails closed with `503`. Cloudflare's network DDoS protection and optional zone-level WAF/rate-limiting rules remain the outer security layer.

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
