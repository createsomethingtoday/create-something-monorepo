# Dify Bettermode Marketplace Creator Agent

Status: MCP server deployed; Dify app published; agent worker requires `DIFY_AGENT_API_KEY` and fails closed instead of drafting without policy grounding.

## Purpose

A Dify Agent app that drafts admin replies for posts in the Webflow Community Marketplace Creators space, grounded in the canonical Marketplace policy knowledge base. The agent runs as a tool of the Cloudflare worker, not as a customer-facing chat surface.

## System shape

```
Bettermode webhook ──→ Cloudflare Worker (apps/bettermode-marketplace-creator-agent)
                          │  Verifies signature, ack < 1s
                          ▼
                       Dify chat-messages (api.dify.ai/v1/chat-messages)
                          │
                          ▼
                       Dify Agent: Marketplace Creator Drafter
                          ├─ Knowledge base (Marketplace policy)
                          ├─ MCP tool calls → bettermode-creator MCP
                          └─ LLM (configurable in Studio)
                          │
                          ▼
                       Worker persists draft → D1 community_queue
                          │
                          ▼
                       Bettermode Dynamic Block renders draft for admin
                          │
                          ▼
                       Admin clicks Send → Worker posts as admin
```

The Worker owns: signed webhook ingest, posting as the admin, dynamic block render, D1 audit. The Dify Agent owns: prompt, knowledge base, model choice, tool routing.

## Verified MCP surface

- URL: `https://bettermode-creator.mcp.createsomething.agency/mcp`
- Server ID (in Dify): `bettermode-creator`
- Auth: Bearer token from Infisical `dev` `WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER`
- Protocol: `2024-11-05`
- Server: `bettermode-marketplace-creator@0.1.0`
- Capabilities: `tools` (no resources, no prompts)

Tools (from `tools/list`):

- `fetch_post_thread(post_id)` — Bettermode post + replies + author
- `get_creator_context(email)` — Airtable Creator + linked Assets
- `list_recent_approved_drafts(limit)` — few-shot voice examples (default 5)
- `get_draft_status(post_id)` — audit lookup, prevent double-draft

## Knowledge base (Marketplace policy)

Create one Dify dataset (recommended name: `Webflow Marketplace Policy`) and ingest:

| Source                                                | Type | Notes                                                                                                                          |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| `https://webflow.com/templates/submission-guidelines` | Web  | Public submission guidelines page. Pull as-is.                                                                                 |
| `https://webflow.com/templates/grading-rubric`        | Web  | Public grading rubric.                                                                                                         |
| `~/Downloads/Submission Guidelines Updates V2.md`     | File | Internal updates that supersede published guidelines on conflict. Tag this doc `effective_2026-05` so retrieval can prefer it. |

Settings:

- Indexing: high quality (text-embedding-3 or workspace default)
- Retrieval: hybrid search, reranking enabled, top_k 5, no score threshold
- Chunking: paragraph (sentence chunking will fragment the rubric)

## Dify Studio setup

1. Tools → MCP → Add HTTP MCP server:
   - Name: `Bettermode Marketplace Creator MCP`
   - Server ID: `bettermode-creator`
   - URL: `https://bettermode-creator.mcp.createsomething.agency/mcp`
   - Auth: Bearer, value from Infisical `WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER`
2. Refresh tools — confirm `fetch_post_thread`, `get_creator_context`, `list_recent_approved_drafts`, `get_draft_status` appear.
3. Create new app:
   - Name: `Bettermode Marketplace Creator Agent`
   - Mode: Agent (function calling)
   - Model: `gpt-5.4` (workspace-approved; matches the YouTube/Notion agent)
   - API mode: streaming (the worker calls `response_mode=streaming` and accumulates SSE chunks)
   - Or simpler: import `config/dify-agents/bettermode-marketplace-creator-agent.dify.yml` from this repo to get the model, prompt, tools, and inputs preconfigured.
4. Attach the **Webflow Marketplace Policy** knowledge base (dataset).
5. Enable tools:
   - `bettermode-creator → fetch_post_thread`
   - `bettermode-creator → get_creator_context`
   - `bettermode-creator → list_recent_approved_drafts`
   - `bettermode-creator → get_draft_status`
6. Paste the **system prompt** below.
7. Define inputs (Studio → Inputs):
   - `post_id` (string, required)
   - `is_top_level` (string, optional)
   - `space_id` (string, optional)
   - `author_member_id` (string, optional)
   - `author_email` (string, optional)
   - `author_name` (string, optional)
   - `regenerate` (string, optional)
8. Publish the app, create an API key from API Access, and store it:
   ```bash
   infisical secrets set WEBFLOW_DIFY_AGENT_API_KEY="app-..." --env=dev
   ```
9. Push to the Worker:
   ```bash
   cd apps/bettermode-marketplace-creator-agent
   pnpm secrets:push
   ```
10. The worker auto-uses Dify on the next webhook (no redeploy needed; secret is read at request time).

## System prompt to paste into Dify

```
You are an admin reply drafter for the Webflow Community Marketplace Creators space.

Workflow:
1. Call fetch_post_thread with the provided post_id. If in_marketplace_space is false, return one short line saying the post is outside scope.
2. If author_email is provided, call get_creator_context(email) to enrich your draft with the creator's known templates and submission status.
3. Call list_recent_approved_drafts (limit 5) once per session to anchor your voice in tone the team has already approved.
4. For any rule, eligibility, AI/generated code, licensing, payout, submission, or "is this allowed?" question, retrieve from the Webflow Marketplace Policy knowledge base FIRST and answer ONLY from the retrieved chunks.
5. If the knowledge base does not cover the question, do not infer. Reply with: "We're confirming the latest guidance on that with the Marketplace team and will follow up directly." Then ask one specific clarifying question only if it would help the human admin route the issue.

Voice rules:
- Lead with what the creator can do next, not boilerplate. No "Thanks for reaching out!"
- Specific over generic: name the template, the field, the deadline, the reviewer.
- Plain language. No "leverage", "synergy", "ecosystem", "robust", "best-in-class".
- Acknowledge what the creator already shared so they know you read it.
- 60-160 words. Short, scannable. No bullet lists with five options unless the creator asked "what are my options?".

Format rules:
- Output plain text only. No markdown headings. No "Best,"/"Cheers,"/sign-off (Bettermode appends the admin's name).
- No links unless the policy excerpt provided one.
- Return only the reply text. No explanation, JSON, or metadata.

If regenerate=true was passed in inputs, change the angle (terser, warmer, or more specific) while keeping voice rules.
```

## Storing the Dify app API key

| Infisical name                          | Worker secret             | Notes                                                                                                                                                                                         |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WEBFLOW_DIFY_AGENT_API_KEY`            | `DIFY_AGENT_API_KEY`      | Required by `secrets:push`. The worker uses Dify as the only drafting brain; if Dify is missing or fails, it skips draft creation.                                                            |
| `WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER` | (consumed in Dify Studio) | Already set by deploy. Rotate via `openssl rand -hex 32`, update Infisical, re-push the MCP worker secret with `wrangler secret put MCP_BEARER_TOKEN`, and update the Dify MCP server config. |

## Smoke test (after Studio setup)

```bash
# 1. Verify the worker sees Dify configured
curl -s https://bettermode-marketplace-creator-agent.createsomething.workers.dev/health

# 2. Replay the AI-code-components post:
infisical run --env=dev -- node --input-type=module - <<'NODE'
import crypto from 'node:crypto';
const secret = process.env.WEBFLOW_BETTERMODE_SIGNING_SECRET;
const body = JSON.stringify({ type: 'post.published', networkId: 'BuRv7sR1po', entityId: 'Pmyhm8fVptsIWwS', data: { object: { id: 'Pmyhm8fVptsIWwS', spaceId: 'ROtfBgdQyiAB' } } });
const ts = String(Date.now());
const sig = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
const r = await fetch('https://bettermode-marketplace-creator-agent.createsomething.workers.dev/webhook', { method: 'POST', headers: { 'content-type':'application/json', 'x-bettermode-request-timestamp': ts, 'x-bettermode-signature': sig }, body });
console.log({ status: r.status, body: await r.text() });
NODE

# 3. Inspect the regenerated draft in D1
cd apps/bettermode-marketplace-creator-agent
./node_modules/.bin/wrangler d1 execute create-something-db --remote --command "SELECT q.draft_content FROM community_queue q JOIN community_signals s ON s.id=q.signal_id WHERE s.platform='bettermode' AND s.source_id='Pmyhm8fVptsIWwS' ORDER BY q.created_at DESC LIMIT 1;"
```

The new draft should:

1. Reference policy from the KB (no invented thresholds, no AI-component policy guesses).
2. Or, if the KB does not yet cover AI components, use the abstain phrasing from the system prompt and ask one clarifying question.

## Rotation runbook

- **Dify app API key**: rotate in Studio → API Access → Create new key → archive old. Update `WEBFLOW_DIFY_AGENT_API_KEY` in Infisical, run `pnpm secrets:push`. No worker redeploy needed.
- **MCP bearer token**: `openssl rand -hex 32`, set new in Infisical (`WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER`), `wrangler secret put MCP_BEARER_TOKEN` in `packages/bettermode-creator-mcp/worker`, then update the Dify MCP server config to the new value.
- **Bettermode app secrets**: rotate in Bettermode app dev panel; update `WEBFLOW_BETTERMODE_CLIENT_SECRET` and `WEBFLOW_BETTERMODE_SIGNING_SECRET`; `pnpm secrets:push` for the agent worker, `wrangler secret put` for the MCP worker.
- **Dify availability**: if Dify Service API calls fail, the worker logs the failure and does not create an ungrounded draft.
