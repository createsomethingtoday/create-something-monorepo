# Zendesk MCP

Separate MCP server for Webflow asset reviewers working in Webflow Zendesk (`webflow2579.zendesk.com`).

It exposes Zendesk tickets, comments, users, views, and guarded ticket write operations through MCP. Secrets stay in Infisical, Wrangler secrets, or local shell env; do not commit Zendesk tokens or MCP bearer tokens.

## Framework Tier

| Tier | MCP Primitive | Role |
|------|---------------|------|
| **Database** | Resources | Redacted Webflow Zendesk account boundary and reviewer workflow contract |
| **Automation** | Tools | Search/read tickets, inspect comments/users/views, add comments, update status/tags |
| **Judgment** | Prompts | Draft and triage reviewer-safe Zendesk comments |

## Tools

Read-only:

- `zendesk_health`
- `zendesk_search_tickets`
- `zendesk_find_asset_review_tickets`
- `zendesk_get_ticket`
- `zendesk_list_ticket_comments`
- `zendesk_list_active_views`
- `zendesk_list_view_tickets`
- `zendesk_get_user`

Writes:

- `zendesk_add_ticket_comment` writes a public reply or private internal note. Public replies require `confirm_public_reply=true`.
- `zendesk_update_ticket_status` updates status/tags and can add a private internal note.
- `zendesk_add_internal_note` is a private-note-only compatibility tool.

All write tools require explicit confirmation flags and are hidden when `ZENDESK_READ_ONLY=true` or `MCP_TOOL_ACCESS_MODE=read_only`.

## Required Config

Default non-secret:

```bash
WEBFLOW_ZENDESK_SUBDOMAIN=webflow2579
```

Zendesk API-token auth:

```bash
WEBFLOW_ZENDESK_EMAIL=reviewer@example.com
WEBFLOW_ZENDESK_API_TOKEN=...
```

Integration-user password fallback:

```bash
WEBFLOW_ZENDESK_EMAIL=support-admin@webflow.com
WEBFLOW_ZENDESK_PASSWORD=...
```

OAuth bearer-token auth alternative:

```bash
WEBFLOW_ZENDESK_OAUTH_TOKEN=...
```

Remote MCP transport auth:

```bash
ZENDESK_MCP_API_KEY=...
# or MCP_API_KEY=...
```

Recommended Infisical shape:

```bash
infisical run --env=prod --path=/webflow/zendesk --include-imports=true -- \
  pnpm --filter @create-something/zendesk-mcp start
```

Use the actual project path if Webflow Zendesk secrets already live elsewhere.

## Local Development

```bash
pnpm --filter @create-something/mcp-core build
pnpm --filter @create-something/zendesk-mcp typecheck
pnpm --filter @create-something/zendesk-mcp build
```

Run stdio locally:

```bash
infisical run --env=prod --path=/webflow/zendesk --include-imports=true -- \
  pnpm --filter @create-something/zendesk-mcp start
```

## Worker

```bash
pnpm exec wrangler secret put ZENDESK_MCP_API_KEY --cwd packages/zendesk-mcp/worker
pnpm exec wrangler secret put WEBFLOW_ZENDESK_EMAIL --cwd packages/zendesk-mcp/worker
pnpm exec wrangler secret put WEBFLOW_ZENDESK_API_TOKEN --cwd packages/zendesk-mcp/worker
# or, when using the integration-user login:
pnpm exec wrangler secret put WEBFLOW_ZENDESK_PASSWORD --cwd packages/zendesk-mcp/worker
pnpm exec wrangler deploy --cwd packages/zendesk-mcp/worker
```

`/health` reports only secret presence, never secret values.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/server.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter @create-something/zendesk-mcp build && pnpm --filter @create-something/zendesk-mcp start` |
| Smoke command | `pnpm --filter @create-something/mcp-core build && pnpm --filter @create-something/zendesk-mcp typecheck && pnpm --filter @create-something/zendesk-mcp build` |
| Validation surfaces | typecheck, build, stdio startup, Worker `/health`, representative read/write ticket tool calls |
| UI validation path | Webflow Zendesk ticket, for example `https://webflow2579.zendesk.com/agent/tickets/1147219` |
| Escalation rule | Stop if Zendesk auth, agent permissions, ticket visibility, or transport auth cannot be verified without exposing credentials. |
