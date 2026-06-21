# Understanding: @create-something/zendesk-mcp

> Separate Zendesk MCP for Webflow asset reviewer support workflows.

## Ontological Position

**Mode of Being**: Operational MCP package

This package makes Webflow Zendesk (`webflow2579.zendesk.com`) legible and operable to reviewer agents. It is intentionally separate from, but not a replacement for, `packages/webflow-app-review-mcp`. Both are first-class reviewer surfaces: agents choose Zendesk for ticket conversation/status state and choose the app-review MCP for Airtable review/governance state.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/mcp-core` | Account-scoped MCP server, auth boundary, policy constraints |
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `zod` | Tool and prompt input validation |
| Webflow Zendesk API | Live ticket, comment, user, and view data |
| Infisical or Worker secrets | Zendesk credentials and MCP transport bearer tokens |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Webflow asset reviewers | Which Zendesk tickets need review follow-up and what can be written safely |
| Reviewer hubs | Read/search/comment/status tools for Zendesk alongside Airtable app-review tools |
| Operators | Whether live Zendesk credentials and transport auth are configured |

## Internal Structure

```text
src/
├── index.ts                 -> stdio entry point
├── server.ts                -> scoped MCP server wiring
├── auth.ts                  -> env/Infisical-backed account and token resolution
├── services/api.ts          -> direct Zendesk REST client
├── tools/index.ts           -> ticket/search/comment/status tools
├── resources/index.ts       -> redacted account and workflow resources
├── prompts/index.ts         -> reviewer-safe triage/drafting prompts
└── schemas/index.ts         -> validation helpers

worker/
├── index.ts                 -> Cloudflare Worker endpoint and /health
└── wrangler.toml            -> Worker config and secret names
```

## To Understand This Package, Read

1. **`README.md`** — tool contract, configuration, local development, and Worker deployment path
2. **`src/server.ts`** — MCP server wiring, tool registration, and policy boundary
3. **`src/auth.ts`** — Zendesk account and credential resolution from environment
4. **`worker/index.ts`** — remote MCP transport, bearer-token auth, and `/health`
5. **`packages/webflow-app-review-mcp/UNDERSTANDING.md`** — adjacent reviewer surface for Airtable review/governance state

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/server.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter @create-something/zendesk-mcp build && pnpm --filter @create-something/zendesk-mcp start` |
| Smoke command | `pnpm --filter @create-something/mcp-core build && pnpm --filter @create-something/zendesk-mcp typecheck && pnpm --filter @create-something/zendesk-mcp build` |
| Validation surfaces | typecheck, build, stdio startup, Worker `/health`, representative Zendesk ticket read/write calls |
| UI validation path | `https://webflow2579.zendesk.com/agent/tickets/1147219` |
| Escalation rule | Stop if live Zendesk state, auth scope, or ticket write permissions cannot be verified from non-secret evidence. |

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a Zendesk endpoint | `src/services/api.ts` and `src/tools/index.ts` |
| Change reviewer guardrails | `src/tools/index.ts` and `src/prompts/index.ts` |
| Debug credentials | `src/auth.ts` and Worker `/health` |
| Deploy remote MCP | `worker/wrangler.toml` and `README.md` |

*Last validated: 2026-06-21*
