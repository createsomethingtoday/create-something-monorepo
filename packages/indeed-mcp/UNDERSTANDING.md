# Understanding: @create-something/indeed-mcp

> **Indeed Apply MCP for Abundance nurse staffing**

## Ontological Position

**Mode of Being**: Operational MCP package

This package makes the current Indeed access legible and governable inside the Abundance nurse staffing workflow. It does not claim more than the credential set supports. Right now that means Indeed Apply feed generation, screener hosting, webhook intake, and local disposition state.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/mcp-core` | Scoped server primitives, auth/provider surface, and shared MCP transport helpers |
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `.agency` D1 (`DB`) | Canonical Indeed jobs, applications, webhook events, and local disposition tracking |
| `.agency` R2 (`STORAGE`) | Raw resume artifact persistence when Indeed sends a file attachment |
| Infisical | Secret delivery for local dev and runtime secret source of truth |

## Internal Structure

```text
src/
├── index.ts             → stdio entry point
├── server.ts            → shared scoped MCP server
├── auth.ts              → runtime auth and env resolution
├── runtime.ts           → typed runtime metadata accessors
├── schemas/             → tool and webhook input contracts
├── feed.ts              → Indeed Apply metadata and XML feed rendering
├── signature.ts         → Indeed Apply signature verification
├── storage.ts           → D1/R2 persistence helpers
├── tools/               → automation tier handlers
├── resources/           → database tier handlers
├── prompts/             → judgment tier handlers
└── webhook.ts           → application delivery ingestion flow

worker/
├── index.ts             → Cloudflare Worker entry point
└── wrangler.toml        → shared DB/STORAGE bindings
```

## Read Order

1. `README.md`
2. `src/server.ts`
3. `src/feed.ts`
4. `src/tools/index.ts`
5. `src/webhook.ts`
6. `worker/index.ts`

## Validation Surfaces

- `/health` for runtime configuration sanity
- `/feeds/indeed-apply.xml` for current feed output
- `/questions/{local_job_id}.json` for hosted screener JSON
- `/webhooks/apply` for applicant delivery and signature enforcement
- `indeed://sync-status` and `indeed://webhook-events/recent`
- `.agency` migration `0022_abundance_indeed_apply.sql`
- `tests/signature.test.ts` and `tests/feed.test.ts`
