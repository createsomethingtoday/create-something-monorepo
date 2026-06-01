# Bettermode Marketplace Creator MCP

Read-only MCP server exposing Bettermode + Airtable + community queue helpers to a Dify agent (or any MCP client) drafting admin replies for the Webflow Community **Marketplace Creators** space.

| | |
|---|---|
| Package | `@create-something/bettermode-creator-mcp` |
| Worker | `packages/bettermode-creator-mcp/worker` |
| URL | `https://bettermode-creator.mcp.createsomething.agency` |
| Account | CREATE SOMETHING (`9645bd52e640b8a4f40a3a55ff1dd75a`) |
| Auth | `Authorization: Bearer ${MCP_BEARER_TOKEN}` |

## Tools

| Tool | Returns | Used to |
|---|---|---|
| `fetch_post_thread(post_id)` | post + reply thread + author | Ground the draft in actual content |
| `list_recent_marketplace_posts(since, limit, include_staff)` | recent Marketplace Creator posts/replies + draft queue status | Audit missed draft coverage without returning post bodies |
| `get_creator_context(email)` | Airtable Creator + linked Assets | Reference templates the creator owns |
| `list_recent_approved_drafts(limit)` | Recent admin replies that were sent | Few-shot voice examples |
| `get_draft_status(post_id)` | Existing draft status if any | Avoid double-drafting on retries |

All tools return one `text` content block whose body is JSON.

## Architecture

```
Dify agent (MCP client)
   │  Authorization: Bearer ${MCP_BEARER_TOKEN}
   ▼
bettermode-creator-mcp.workers.dev (Streamable HTTP /mcp, SSE /sse)
   │
   ├─→ Bettermode GraphQL (NETWORK-context limitedToken from app creds)
   ├─→ Airtable REST (Creators table tbljt0plqxdMARZXb)
   └─→ D1 create-something-db (community_signals + community_queue, READ-ONLY)
```

The MCP **never writes**. The agent worker (`apps/bettermode-marketplace-creator-agent`) owns webhook ingestion, draft persistence, dynamic-block rendering, and posting as the admin.

## Deploy

```bash
cd packages/bettermode-creator-mcp/worker

# Push secrets (assumes Infisical login)
infisical run --env=dev -- bash -c '
  printf "%s" "$WEBFLOW_BETTERMODE_CLIENT_ID"           | npx wrangler secret put BETTERMODE_CLIENT_ID
  printf "%s" "$WEBFLOW_BETTERMODE_CLIENT_SECRET"       | npx wrangler secret put BETTERMODE_CLIENT_SECRET
  printf "%s" "$AIRTABLE_API_KEY"                        | npx wrangler secret put AIRTABLE_API_KEY
  printf "%s" "$WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER"   | npx wrangler secret put MCP_BEARER_TOKEN
'

# Deploy
npx wrangler deploy
```

The bearer token (`WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER`) is what Dify Studio uses to connect.

Generate a fresh one with:

```bash
TOKEN=$(openssl rand -hex 32)
infisical secrets set WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER="$TOKEN" --env=dev
```

## Smoke test

```bash
# Health (no auth)
curl https://bettermode-creator.mcp.createsomething.agency/health

# Tool listing (auth required)
TOKEN=$(infisical secrets --env=dev --output json --recursive | \
  node -e '<extract WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER>')

curl -X POST https://bettermode-creator.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Connecting from Dify Studio

1. Tools → MCP → Add HTTP MCP server
2. Server ID: `bettermode-creator`
3. URL: `https://bettermode-creator.mcp.createsomething.agency/mcp`
4. Auth: Bearer, value from Infisical `WEBFLOW_BETTERMODE_CREATOR_MCP_BEARER`
5. Refresh tools — all four should appear
6. Build an Agent app that uses these tools + the Marketplace policy knowledge base
