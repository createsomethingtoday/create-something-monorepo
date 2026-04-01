# Indeed MCP

Indeed MCP for Abundance nurse staffing.

This package covers the Indeed surfaces currently available for the Abundance staffing integration:

- XML feed generation for Indeed Apply jobs
- HTTPS-hosted screener question JSON
- application delivery intake via `postUrl`
- `X-Indeed-Signature` verification
- local disposition tracking so recruiter state is visible even before remote disposition sync is wired
- read-only listing of stored jobs and applications
- Sponsored Jobs OAuth account, campaign, budget, and reporting operations

This package now includes Sponsored Jobs support for the separate Indeed OAuth 2.0 app, in addition to the Indeed Apply credential set.

## Framework Tier

| Tier | MCP Primitive | Role in This Server |
|------|---------------|---------------------|
| **Database** | Resources | Canonical Indeed Apply jobs, applications, webhook events, and feed snapshots |
| **Automation** | Tools | Job/feed generation, screener hosting, and disposition recording |
| **Judgment** | Prompts | Preflight review for job metadata and disposition mapping guidance |

## Entry Points

- `src/index.ts` — stdio entry point
- `src/server.ts` — shared scoped MCP server wiring
- `worker/index.ts` — Cloudflare Worker entry point with `/health`, `/feeds/indeed-apply.xml`, `/questions/:id.json`, and `/webhooks/apply`

## Local Development

Use Infisical to materialize secrets into the process environment:

```bash
infisical run --env=prod --path=/agency/abundance/indeed -- \
  pnpm --filter=@create-something/indeed-mcp build

infisical run --env=prod --path=/agency/abundance/indeed -- \
  pnpm --filter=@create-something/indeed-mcp start
```

## Worker Development

```bash
cd packages/indeed-mcp/worker
pnpm dev
```

## Required Secrets

- `INDEED_APPLY_CLIENT_ID`
- `INDEED_APPLY_SECRET`
- `INDEED_MCP_API_KEY` or `MCP_API_KEY` (required for deployed `/mcp` access)

Optional:

- `INDEED_ACCOUNT_ID`
- `INDEED_APPLY_BASE_URL`
- `INDEED_SPONSORED_JOBS_CLIENT_ID`
- `INDEED_SPONSORED_JOBS_SECRET`
- `INDEED_SPONSORED_JOBS_EMPLOYER_ID`
- `INDEED_FEED_PUBLISHER`
- `INDEED_FEED_PUBLISHER_URL`

Recommended Infisical path:

```bash
/agency/abundance/indeed
```

## Current Scope

The current implementation now spans two separate Indeed credential sets already issued for Abundance:

- the package can generate feed metadata and host question JSON now
- the package can receive and store applications now
- the package can record recruiter dispositions locally now
- the package can use a separate Sponsored Jobs OAuth 2.0 app for employer account, campaign, budget, and reporting operations
- remote Indeed Apply disposition sync is still not wired
- Sponsored Jobs calls still depend on Indeed allowing outbound requests from the runtime and, for employer-scoped operations, an employer ID

## Production Behavior

- `/mcp` returns `503 MISCONFIGURED` until `INDEED_MCP_API_KEY` or `MCP_API_KEY` is set on the Worker.
- Remote clients can authenticate with either `Authorization: Bearer <INDEED_MCP_API_KEY>` or `X-API-Key`.
- `/feeds/indeed-apply.xml`, `/questions/:local_job_id.json`, and `/webhooks/apply` remain unauthenticated because Indeed must fetch or deliver against them directly.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/server.ts`, `worker/index.ts` |
| Boot command | `infisical run --env=prod --path=/agency/abundance/indeed -- pnpm --filter=@create-something/indeed-mcp build && infisical run --env=prod --path=/agency/abundance/indeed -- pnpm --filter=@create-something/indeed-mcp start` |
| Smoke command | `pnpm --filter=@create-something/indeed-mcp typecheck && pnpm --filter=@create-something/indeed-mcp test` |
| Validation surfaces | typecheck output, signature verification tests, XML feed rendering tests, Worker `/health`, Worker `/feeds/indeed-apply.xml`, Worker `/questions/:id.json`, Worker `/webhooks/apply`, D1 Indeed tables, R2 resume artifacts |
| UI validation path | none |
| Escalation rule | Stop if the deployed base URL is unknown, the Indeed Apply secret is missing, or the client later expands scope to Sponsored Jobs before a separate OAuth app exists. |
