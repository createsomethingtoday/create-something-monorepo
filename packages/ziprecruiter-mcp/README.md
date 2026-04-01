# ZipRecruiter MCP

ZipRecruiter MCP for Abundance nurse staffing.

This package exposes ZipRecruiter job ingestion, screening-question management, candidate delivery handling, and hiring-signal reporting through one operational MCP surface. It uses the shared `.agency` D1 database as the canonical staffing store and writes raw resume artifacts to the shared `STORAGE` R2 bucket.

## Framework Tier

| Tier | MCP Primitive | Role in This Server |
|------|---------------|---------------------|
| **Database** | Resources | Canonical staffing jobs, candidates, applications, webhook events, and sync status |
| **Automation** | Tools | Job CRUD, question management, and hiring-signal reporting |
| **Judgment** | Prompts | Preflight review and hiring-signal mapping guidance |

## Entry Points

- `src/index.ts` — stdio entry point
- `src/server.ts` — shared scoped MCP server wiring
- `worker/index.ts` — Cloudflare Worker entry point with `/health` and `/webhooks/apply`

## Local Development

Use Infisical to materialize secrets into the process environment:

```bash
infisical run --env=prod --path=/agency/abundance/ziprecruiter -- \
  pnpm --filter=@create-something/ziprecruiter-mcp build

infisical run --env=prod --path=/agency/abundance/ziprecruiter -- \
  pnpm --filter=@create-something/ziprecruiter-mcp start
```

## Worker Development

```bash
cd packages/ziprecruiter-mcp/worker
pnpm dev
```

## Required Secrets

- `ZIPRECRUITER_API_KEY`
- `ZIPRECRUITER_WEBHOOK_SECRET` (recommended for production)
- `ZIPRECRUITER_MCP_API_KEY` or `MCP_API_KEY` (recommended for remote MCP access)

Recommended Infisical path:

```bash
/agency/abundance/ziprecruiter
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/server.ts`, `worker/index.ts` |
| Boot command | `infisical run --env=prod --path=/agency/abundance/ziprecruiter -- pnpm --filter=@create-something/ziprecruiter-mcp build && infisical run --env=prod --path=/agency/abundance/ziprecruiter -- pnpm --filter=@create-something/ziprecruiter-mcp start` |
| Smoke command | `pnpm --filter=@create-something/ziprecruiter-mcp typecheck && pnpm --filter=@create-something/ziprecruiter-mcp test` |
| Validation surfaces | typecheck output, signature verification tests, ZipRecruiter client tests, Worker `/health`, Worker `/webhooks/apply`, D1 staffing tables, R2 resume artifacts |
| UI validation path | none |
| Escalation rule | Stop if shared D1 and Worker runtime disagree about canonical staffing records, or if Infisical/Worker secret material is not available for the current environment. |
